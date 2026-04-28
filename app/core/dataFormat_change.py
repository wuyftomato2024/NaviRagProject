from langchain_core.messages import HumanMessage ,AIMessage
from app.repositories.chat_repository import chatHistoryGet
from app.schemas.model import HistoryItem

# *****
# 前端输出转换
# *****    
def sql_message_process(sql_db ,session_id):
    sql_messages = chatHistoryGet(sql_db = sql_db,session_id = session_id)

    message_list = []

    for sql_message in sql_messages:
        if isinstance(sql_message ,HumanMessage):
            message_list.append(HistoryItem(role = "human",content = sql_message.content))
        if isinstance(sql_message ,AIMessage):
            message_list.append(HistoryItem(role = "ai",content = sql_message.content))

    return message_list