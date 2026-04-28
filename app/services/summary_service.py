from app.core.ai_model_select import ai_model_select
from app.core.chunk_search import chunk_context
from app.prompts.prompt_builder import summary_prompt ,summary_answer_prompt

# *****
# 判断此次问题是否需要summary
# *****
def summary(question ,openai_api_key ,model_flag):
    ai_model ,_ =ai_model_select(model_flag ,openai_api_key)
    model = ai_model

    prompt = summary_prompt()

    message = prompt.format_messages(question = question)

    summary_response = model.invoke(message)

    return summary_response.content

# *****
# 通过搜索到的chunk生成回答问题
# *****
def summary_answer(openai_api_key ,vector_db ,top_k ,question ,model_flag):
    text ,_ = chunk_context(vector_db ,top_k ,question)

    ai_model ,_ =ai_model_select(model_flag ,openai_api_key)
    model = ai_model

    prompt = summary_answer_prompt()

    message = prompt.format_messages(result = text)

    summary_answer_response = model.invoke(message)

    return summary_answer_response.content