import os
from app.repositories.chat_repository import chatDelete ,sessionDelete
from app.core.vector_store import delete_vector_db

def sessionDeleteLogic(session_id ,sql_db):
    vector_db_path = f"faiss_db/{session_id}/"
        
    if os.path.exists(vector_db_path):
        delete_vector_db(session_id = session_id)

    chatDelete(sql_db = sql_db ,session_id = session_id)
    sessionDelete(sql_db = sql_db ,session_id = session_id)

    return {"deleted":True}