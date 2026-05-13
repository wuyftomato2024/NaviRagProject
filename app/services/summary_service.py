from app.core.ai_model_select import ai_model_select
from app.core.chunk_search import chunk_context
from app.prompts.prompt_builder import summary_prompt ,summary_answer_prompt

# *****
# 功能 判断此次问题是否需要summary
# 说明 把问题传给ai来判断这次的问题是否需要summary ，结果返回一个布尔值
# *****
def summary(question ,openai_api_key ,model_flag):
    ai_model ,_ =ai_model_select(model_flag ,openai_api_key)
    model = ai_model

    prompt = summary_prompt()

    message = prompt.format_messages(question = question)

    summary_response = model.invoke(message)

    return summary_response.content

# *****
# 功能 通过搜索到的文件块，生成回答
# 说明 通过搜索到的文件块，生成summary模式的回答
# *****
def summary_answer(openai_api_key ,vector_db ,top_k ,question ,model_flag):
    text ,_ = chunk_context(vector_db ,top_k ,question)

    ai_model ,_ =ai_model_select(model_flag ,openai_api_key)
    model = ai_model

    prompt = summary_answer_prompt()

    message = prompt.format_messages(result = text)

    summary_answer_response = model.invoke(message)

    return summary_answer_response.content