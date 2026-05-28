from langchain_core.messages import HumanMessage ,SystemMessage
from app.core.ai_model_select import ai_model_select
from app.core.ai_request_format_select import answer_model
from app.core.dataFormat_change import sql_message_process
from app.repositories.chat_repository import chatHistoryGet ,chatCreate ,refreshSessionTime
from app.schemas.model import ApiResponse ,ChatResponse
from app.services.logcreateJudge_service import devLog_judge ,devLog_content_create

# *****
# 功能 普通Chat逻辑
# 说明 
# *****
def normalChat(normalContext):
    

    ai_model ,_ =ai_model_select(normalContext.model_flag ,normalContext.openai_api_key)
    model = ai_model

    logCreate_kws =["写入日志" ,"记录日志" ,"保存为日志" ,"生成日志" ,"日志" ,"生成" ,"一份"]

    is_logCreate =any(logCreate_kw in normalContext.question for logCreate_kw in logCreate_kws)

    logCreate_flag = False

    if is_logCreate :
        devLog_judge_result = devLog_judge(normalContext.question ,normalContext.openai_api_key ,normalContext.model_flag)
        if  devLog_judge_result == "True" :
            logCreate_flag = True
    if logCreate_flag : 
        print("logCreate success")
        
        response =devLog_content_create(sql_db = normalContext.sql_db ,session_id= normalContext.session_id ,user_id =normalContext.user_id ,question= normalContext.question ,model_flag = normalContext.model_flag , openai_api_key = normalContext.openai_api_key)

        result = response
    else :
        qa_prompt = answer_model(normalContext.question)

        sql_messages = chatHistoryGet(normalContext.sql_db ,normalContext.session_id ,normalContext.user_id)
        messages = [SystemMessage(content = qa_prompt)] + sql_messages + [HumanMessage(content = normalContext.question)]

        response = model.invoke(messages)
        result = response.content

    chatCreate(normalContext.sql_db,normalContext.session_id,"HumanMessage",normalContext.question ,normalContext.user_id)
    chatCreate(normalContext.sql_db,normalContext.session_id,"AIMessage",result ,normalContext.user_id)
    refreshSessionTime(normalContext.sql_db, normalContext.session_id ,normalContext.user_id)

    message_list = sql_message_process(normalContext.sql_db, normalContext.session_id ,normalContext.user_id)

    return ApiResponse(
        status = "ok",
        data = ChatResponse(
            answer = result ,
            chatHistory = message_list ,
            tag = [])
    )