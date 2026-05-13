import os
from app.repositories.chat_repository import chatDelete ,sessionDelete
from app.core.vector_store import delete_vector_db

# *****
# 功能 删除会话
# 说明 删除会话的所有内容（包括题目，聊天内容，及向量库）
# *****
def sessionDeleteLogic(session_id ,sql_db ,user_id):
    vector_db_path = f"faiss_db/{session_id}/"
        
    if os.path.exists(vector_db_path):
        delete_vector_db(session_id = session_id)

    chatDelete(sql_db = sql_db ,session_id = session_id ,user_id = user_id)
    sessionDelete(sql_db = sql_db ,session_id = session_id ,user_id = user_id)

    return {"deleted":True}