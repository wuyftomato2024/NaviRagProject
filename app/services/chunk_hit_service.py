from app.core.ai_model_select import ai_model_select
from app.prompts.prompt_builder import chunk_hit_prompt
from app.repositories.chat_repository import chatHistoryGet

# *****
# 功能 确定文件来源
# 说明 整理回答的问题，整理成一个大文件块
# *****
def chunk_hit(chunk_texts):
    ai_text_map = [f"filename : {doc.metadata['file_name']} \n file_content :{doc.page_content}" for doc in chunk_texts]

    ai_text_all = "\n".join(ai_text_map)

    return ai_text_all

# *****
# 功能 确定文件来源
# 说明 让模型确认回答来自哪个文件
# *****
def chunk_hit_llm(question ,chunk_texts ,sql_db ,session_id ,openai_api_key ,model_flag ,user_id):
    ai_text_all = chunk_hit(chunk_texts)

    ai_model ,_ =ai_model_select(model_flag ,openai_api_key)
    model = ai_model

    prompt = chunk_hit_prompt()
    
    history_list = chatHistoryGet(sql_db = sql_db,session_id = session_id ,user_id = user_id)

    result_history = history_list[-4:]

    # format_messages（）是一个对模板专用的添加方法
    message = prompt.format_messages(
        question= question ,
        history = result_history ,
        ai_text = ai_text_all
        )

    chunk_response = model.invoke(message)
    return chunk_response.content