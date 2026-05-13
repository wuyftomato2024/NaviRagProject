from langchain_core.messages import HumanMessage ,AIMessage
from app.repositories.chat_repository import chatHistoryGet
from app.schemas.model import HistoryItem

# *****
# 功能 前端输出转换
# 说明 把sql抽出的每一条消息，拼装成pydantic设定好的模型形式返回
# *****    
def sql_message_process(sql_db ,session_id ,user_id):
    sql_messages = chatHistoryGet(sql_db = sql_db,session_id = session_id ,user_id =user_id)

    message_list = []

    for sql_message in sql_messages:
        if isinstance(sql_message ,HumanMessage):
            message_list.append(HistoryItem(role = "human",content = sql_message.content))
        if isinstance(sql_message ,AIMessage):
            message_list.append(HistoryItem(role = "ai",content = sql_message.content))

    return message_list