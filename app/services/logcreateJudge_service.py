from langchain_core.messages import HumanMessage ,SystemMessage
from app.core.ai_model_select import ai_model_select
from app.prompts.prompt_builder import devlogJudge_prompt ,devLog_create_prompt
from app.repositories.chat_repository import chatHistoryGet
from app.repositories.devlog_repository import contextCreate

# *****
# 功能 判断此次问题是否需要summary
# 说明 把问题传给ai来判断这次的问题是否需要summary ，结果返回一个布尔值
# *****
def devLog_judge(question ,openai_api_key ,model_flag):
    ai_model ,_ =ai_model_select(model_flag ,openai_api_key)
    model = ai_model

    prompt = devlogJudge_prompt()

    message = prompt.format_messages(question = question)

    response = model.invoke(message)

    return response.content

# *****
# 功能 通过搜索到的文件块，生成回答
# 说明 通过搜索到的文件块，生成summary模式的回答
# *****
def devLog_content_create(sql_db ,session_id ,user_id ,question ,model_flag ,openai_api_key):
    ai_model ,_ =ai_model_select(model_flag ,openai_api_key)
    model = ai_model

    qa_prompt = devLog_create_prompt()
    sql_messages = chatHistoryGet(sql_db = sql_db ,session_id = session_id ,user_id = user_id)
    message = [SystemMessage(content = qa_prompt)] + sql_messages + [HumanMessage(content =question)]

    response = model.invoke(message)

    contextCreate(sql_db = sql_db ,session_id = session_id ,user_id = user_id ,content = response.content)

    return response.content