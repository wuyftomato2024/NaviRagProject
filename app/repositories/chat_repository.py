from app.schemas.db_schema import DBResponse
from app.core.db_tables import ChatMessages ,ChatSession ,User
from fastapi import HTTPException
from langchain_core.messages import AIMessage ,HumanMessage
from datetime import datetime ,timezone

# *****
# 登记聊天记录
# *****
def chatCreate(sql_db , session_id ,role , content ,user_id):

    newChat = ChatMessages(
        session_id = session_id ,
        user_id = user_id ,
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
def chatHistoryGet(sql_db ,session_id ,user_id):
    chatHistory_map = []

    chatHistorys = sql_db.query(ChatMessages).filter(ChatMessages.session_id == session_id ,ChatMessages.user_id == user_id).all()

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
def chatDelete(sql_db ,session_id ,user_id):
    chatHistorys = sql_db.query(ChatMessages).filter(ChatMessages.session_id == session_id ,ChatMessages.user_id == user_id).all()

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
# 登录历史会话标题
# *****
def sessionCreate(sql_db ,session_id ,title ,user_id):
    new_session =ChatSession(
        session_id = session_id ,
        title = title ,
        user_id = user_id
    )

    sql_db.add(new_session)
    sql_db.commit()

    return {"status" : "ok"}

# *****
# 获取历史会话标题
# *****
def sessionGet(sql_db ,user_id):
    chatsessions = sql_db.query(ChatSession).filter(ChatSession.user_id == user_id).order_by(ChatSession.updated_at.desc()).all()

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
# 删除历史会话标题
# *****
def sessionDelete(sql_db ,session_id ,user_id):
    old_session = sql_db.query(ChatSession).filter(ChatSession.session_id == session_id ,ChatSession.user_id == user_id).first()

    if old_session :
        sql_db.delete(old_session)
        sql_db.commit()

# *****
# 更新历史会话标题时间
# *****
def refreshSessionTime(sql_db ,session_id ,user_id) :
    old_session = sql_db.query(ChatSession).filter(ChatSession.session_id == session_id ,ChatSession.user_id == user_id).first()

    if old_session :
        old_session.updated_at = datetime.now(timezone.utc)

    sql_db.commit()

# *****
# 用户注册，写入user表
# *****
def userCreate(sql_db , user_name ,hashed_password):
    print ("A")
    new_user = User(
        user_name = user_name ,
        hashed_password = hashed_password
    )
    
    sql_db.add(new_user)
    sql_db.commit()

# *****
# 检查user名是否重名
# *****
def userCheck(sql_db , user_name):
    old_user = sql_db.query(User).filter(User.user_name ==user_name).first()

    return old_user



def chatMessages(user):
    return {
        "id": user.id,
        "session_id": user.session_id,
        "role": user.role,
        "content":user.content,
        "created_at":user.created_at  
    }