from langchain_openai import ChatOpenAI
from langchain_openai import OpenAIEmbeddings
from langchain_community.chat_models import ChatOllama
from langchain_community.embeddings import OllamaEmbeddings
from fastapi import HTTPException

# *****
# ai模型选择
# *****  
def ai_model_select(model_flag ,openai_api_key):
    if model_flag == "openai" :
        ai_model = ChatOpenAI(model="gpt-3.5-turbo",openai_api_key =openai_api_key)
        embedding_model = OpenAIEmbeddings(openai_api_key = openai_api_key)
    elif model_flag == "ollama" :
        ai_model = ChatOllama(model="deepseek-r1:14b")
        embedding_model = OllamaEmbeddings(model="bge-large")
    else :
        raise HTTPException(status_code=500 ,detail="modle is miss")
    
    return ai_model ,embedding_model