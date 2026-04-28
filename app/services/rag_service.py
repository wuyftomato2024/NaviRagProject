from langchain_community.vectorstores import FAISS
from langchain_core.messages import HumanMessage ,SystemMessage
from fastapi import HTTPException
from app.core.ai_model_select import ai_model_select
from app.core.vector_store import save_local_vector_db ,load_local_vector_db
from app.core.chunk_search import chunk_context
from app.core.ai_request_format_select import answer_model
from app.core.dataFormat_change import sql_message_process
from app.services.uploadfile_service import handle_upload_files
from app.services.summary_service import summary ,summary_answer
from app.services.chunk_hit_service import chunk_hit_llm
from app.repositories.chat_repository import chatHistoryGet ,chatCreate
from app.schemas.model import ApiResponse ,ChatResponse

async def ragChat(question , upload_file ,openai_api_key ,top_k ,sql_db ,session_id ,model_flag):
    ai_model ,ai_embedding =ai_model_select(model_flag ,openai_api_key)

    # 嵌入模型  把每个文本块转成向量（变成数字）
    embedding_model = ai_embedding
    # embedding_model = OllamaEmbeddings(model="bge-large")

    # 定义模型
    model = ai_model
    # model = ChatOllama(model="deepseek-r1:14b")

    # 判断top_k的值，如果非法就报错
    if top_k < 1 or top_k > 3 :
        raise HTTPException(status_code=400 , detail="top_k must be between 1 and 3")
    
    if upload_file :
        docs_list = await handle_upload_files(upload_file)
        # 文档向量化 ，存入数据库 放入(分割好的文件块和嵌入模型，把texts给变成数字)
        vector_db = FAISS.from_documents(docs_list,embedding_model)
        save_local_vector_db(session_id = session_id,vector_db =vector_db)       
            
    else :
        local_vector_db = load_local_vector_db(session_id = session_id ,embedding_model = embedding_model)
        if not local_vector_db:
            raise HTTPException(status_code=400 , detail="please upload a txt or pdf file first")
        vector_db = local_vector_db

    # 向量库检索
    chunk_content_text ,chunk_texts= chunk_context(vector_db ,top_k ,question)
    
    qa_prompt = answer_model(question)

    sql_messages = chatHistoryGet(sql_db = sql_db ,session_id = session_id)

    human_text = f"Context:\n{chunk_content_text}\n\nQuestion:\n{question}"

    message = [SystemMessage(content = qa_prompt)] + sql_messages + [HumanMessage(content =human_text)]

    response = model.invoke(message)

    result = response.content

    # rag内容分支判断（判断这个问题，是否归为总结类）
    summary_kws = ["总结","概括","主要内容","大意","讲了什么"]
    for summary_kw in summary_kws:
        if summary_kw in question :
            summary_response = summary(question ,openai_api_key ,model_flag)
            if summary_response == "True" :
                print("summary success")
                summary_answer_response = summary_answer(openai_api_key ,vector_db ,top_k ,question ,model_flag)
                result = summary_answer_response

    chatCreate(sql_db =sql_db, session_id =session_id,role = "HumanMessage" , content = question)
    chatCreate(sql_db =sql_db, session_id =session_id,role = "AIMessage" , content = result)

    chunk_hit = chunk_hit_llm(question ,chunk_texts ,sql_db ,session_id ,openai_api_key ,model_flag)

    message_list = sql_message_process(sql_db =sql_db, session_id =session_id)
    
    source_files = [chunk_hit]
    
    return ApiResponse(
        status = "ok",
        data = ChatResponse(
            answer = result ,
            chatHistory = message_list ,
            tag = source_files)
    )