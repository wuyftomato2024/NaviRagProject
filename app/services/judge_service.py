from app.core.ai_model_select import ai_model_select
from app.prompts.prompt_builder import judge_prompt
from app.repositories.chat_repository import chatHistoryGet

# *****
# 功能 回答模式判断逻辑
# 说明 通过问题去对ai进行提问，判断此次回答需要走哪个回答模式
# *****
def judge(question ,openai_api_key ,sql_db ,session_id ,model_flag ,user_id):
    ai_model ,_ =ai_model_select(model_flag ,openai_api_key)
    model = ai_model
    prompt = judge_prompt()
    
    history_list = chatHistoryGet(sql_db = sql_db,session_id = session_id ,user_id = user_id )
    # -4：的意思是，从最后四行开始，到最后 ：的意思是，冒号的左边是从哪里开始，右边是从哪里结束
    result_history = history_list[-4:]

    # format_messages（）是一个对模板专用的添加方法
    message = prompt.format_messages(question=question,history =result_history)

    response = model.invoke(message)
    return response.content