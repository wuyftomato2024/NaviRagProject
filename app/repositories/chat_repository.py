from app.schemas.db_schema import DBResponse
from app.core.db_tables import ChatMessages ,ChatSession
from fastapi import HTTPException
from langchain_core.messages import AIMessage ,HumanMessage
from datetime import datetime ,timezone

# *****
# 登记聊天记录
# *****
def chatCreate(sql_db , session_id ,role , content):

    newChat = ChatMessages(
        session_id = session_id ,
        role =  role ,
        content = content
    )

    sql_db.add(newChat)
    sql_db.commit()

    return DBResponse(
        status = "ok",
        data={
            "created":True ,
            "data":{
                newChat.session_id ,
                newChat.role ,
                newChat.content
            }
        }

    )

# *****
# 获取聊天记录
# *****
def chatHistoryGet(sql_db ,session_id):
    chatHistory_map = []

    chatHistorys = sql_db.query(ChatMessages).filter(ChatMessages.session_id == session_id).all()

    if chatHistorys is None:
        raise HTTPException(status_code= 400 ,detail="chatHistory is None")
    
    for chatHistory in chatHistorys :
        if chatHistory.role == "HumanMessage" :
            chatHistory_map.append(HumanMessage(content = chatHistory.content))
        if chatHistory.role == "AIMessage" : 
            chatHistory_map.append(AIMessage(content = chatHistory.content))

    return chatHistory_map

# *****
# 删除聊天记录
# *****
def chatDelete(sql_db ,session_id):
    chatHistorys = sql_db.query(ChatMessages).filter(ChatMessages.session_id == session_id).all()

    if not chatHistorys :
        raise HTTPException(status_code=404 ,detail="chatMessage in None")

    for chatHistory in chatHistorys :
        sql_db.delete(chatHistory)
    sql_db.commit()

    return DBResponse(
        status = "ok",
        data={
            "Deleted":True ,
            "data":{
                None
            }
        }
    )
  
# *****
# 登录历史会话
# *****
def sessionCreate(sql_db ,session_id ,title):
    new_session =ChatSession(
        session_id = session_id ,
        title = title
    )

    sql_db.add(new_session)
    sql_db.commit()

    return {"status" : "ok"}

# *****
# 获取历史会话
# *****
def sessionGet(sql_db):
    chatsessions = sql_db.query(ChatSession).order_by(ChatSession.updated_at.desc()).all()

    if not chatsessions :
        chatsessions_map = []

    chatsessions_map = [{"title":doc.title ,"session_id":doc.session_id} for doc in chatsessions]

    return chatsessions_map

# *****
# 按照session id来判断 是否第一次记录此会话
# *****
def sessionIdGet(sql_db ,session_id):
    chatsessions = sql_db.query(ChatSession).filter(ChatSession.session_id == session_id).first()

    return chatsessions

# *****
# 删除历史会话
# *****
def sessionDelete(sql_db ,session_id):
    old_session = sql_db.query(ChatSession).filter(ChatSession.session_id == session_id).first()

    if old_session :
        sql_db.delete(old_session)
        sql_db.commit()

# *****
# 更新历史会话时间
# *****
def refreshSessionTime(sql_db ,session_id) :
    old_session = sql_db.query(ChatSession).filter(ChatSession.session_id == session_id).first()

    if old_session :
        old_session.updated_at = datetime.now(timezone.utc)

    sql_db.commit()




def chatMessages(user):
    return {
        "id": user.id,
        "session_id": user.session_id,
        "role": user.role,
        "content":user.content,
        "created_at":user.created_at  
    }