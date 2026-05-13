from langchain_core.messages import HumanMessage ,SystemMessage
from app.core.ai_model_select import ai_model_select
from app.core.ai_request_format_select import answer_model
from app.core.dataFormat_change import sql_message_process
from app.repositories.chat_repository import chatHistoryGet ,chatCreate ,refreshSessionTime
from app.schemas.model import ApiResponse ,ChatResponse
from app.schemas.chat_context import normalChatContext

# *****
# 功能 普通Chat逻辑
# 说明 
# *****
def normalChat(normalContext):
    

    ai_model ,_ =ai_model_select(normalContext.model_flag ,normalContext.openai_api_key)
    model = ai_model

    qa_prompt = answer_model(normalContext.question)

    sql_messages = chatHistoryGet(normalContext.sql_db ,normalContext.session_id ,normalContext.user_id)
    messages = [SystemMessage(content = qa_prompt)] + sql_messages + [HumanMessage(content = normalContext.question)]
   
    response = model.invoke(messages)

    chatCreate(normalContext.sql_db,normalContext.session_id,"HumanMessage",normalContext.question ,normalContext.user_id)
    chatCreate(normalContext.sql_db,normalContext.session_id,"AIMessage",response.content ,normalContext.user_id)
    refreshSessionTime(normalContext.sql_db, normalContext.session_id ,normalContext.user_id)

    message_list = sql_message_process(normalContext.sql_db, normalContext.session_id ,normalContext.user_id)

    return ApiResponse(
        status = "ok",
        data = ChatResponse(
            answer = response.content ,
            chatHistory = message_list ,
            tag = [])
    )