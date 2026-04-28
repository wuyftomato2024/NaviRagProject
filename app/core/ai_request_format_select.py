from app.prompts.prompt_builder import simple_normalChat ,defult_normalChat

# *****
# 回复模式判断
# *****  
def answer_model(question):
    simple_words = ["简单","简洁","简短","少废话","易懂","少例子"]
    is_simple_mode = False
    for kw in simple_words:
        if kw in question :
            is_simple_mode = True
            break
    if is_simple_mode is True :
        qa_prompt = simple_normalChat()

    else:
        qa_prompt = defult_normalChat()

    return qa_prompt 