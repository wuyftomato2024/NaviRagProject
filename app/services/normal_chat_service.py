from langchain_core.messages import HumanMessage ,SystemMessage
from app.core.ai_model_select import ai_model_select
from app.core.ai_request_format_select import answer_model
from app.core.dataFormat_change import sql_message_process
from app.repositories.chat_repository import chatHistoryGet ,chatCreate ,refreshSessionTime
from app.schemas.model import ApiResponse ,ChatResponse

def normalChat(question ,openai_api_key ,sql_db ,session_id ,model_flag):
    ai_model ,_ =ai_model_select(model_flag ,openai_api_key)
    model = ai_model

    qa_prompt = answer_model(question)

    sql_messages = chatHistoryGet(sql_db = sql_db ,session_id = session_id)
    messages = [SystemMessage(content = qa_prompt)] + sql_messages + [HumanMessage(content = question)]
   
    response = model.invoke(messages)

    chatCreate(sql_db = sql_db,session_id =session_id,role = "HumanMessage",content = question)
    chatCreate(sql_db = sql_db,session_id =session_id,role = "AIMessage",content = response.content)
    refreshSessionTime(sql_db = sql_db,session_id =session_id)

    message_list = sql_message_process(sql_db =sql_db, session_id =session_id)

    return ApiResponse(
        status = "ok",
        data = ChatResponse(
            answer = response.content ,
            chatHistory = message_list ,
            tag = [])
    )