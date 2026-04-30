from langchain_community.vectorstores import FAISS
from fastapi import HTTPException
import os
import shutil

# *****
# 向量库保存到本地函数
# *****
def save_local_vector_db(session_id ,vector_db):
    vector_db_path = f"faiss_db/{session_id}/"
    vector_db.save_local(vector_db_path)

# *****
# 向量库读取本地函数
# *****
def load_local_vector_db(session_id ,embedding_model):
    vector_db_path = f"faiss_db/{session_id}/"
    # 因为保存到本地的向量库，不会把嵌入模型也保存到本地，所以读取的时候必须先把向量库给重新附加一次
    vector_db = FAISS.load_local(vector_db_path ,embedding_model ,allow_dangerous_deserialization=True)
    if vector_db is None :
        raise HTTPException(status_code=400 ,detail="Not local db")

    return vector_db

# *****
# 按照session删除内容
# *****
def delete_vector_db(session_id) :
    vector_db_path = f"faiss_db/{session_id}/"
    shutil.rmtree(vector_db_path)