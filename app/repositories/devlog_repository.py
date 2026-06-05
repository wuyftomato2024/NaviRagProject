from app.core.db_tables import User ,DevLogMessages
from sqlalchemy import or_

# *****
# 功能 log登记
# 说明
# *****
def contextCreate(sql_db ,session_id ,user_id , title ,content):
    new_context = DevLogMessages(
        session_id = session_id ,
        user_id = user_id ,
        title = title ,
        content = content
    )

    sql_db.add(new_context)
    sql_db.commit()

    return ("ok")

# *****
# 功能 读取所有log
# 说明
# *****
def contextListGet(sql_db ,user_id ,keyword):

    contextList = sql_db.query(DevLogMessages).filter(DevLogMessages.user_id == user_id)

    if keyword :
        contextList = contextList.filter( or_(DevLogMessages.title.like(f"%{keyword}%") ,DevLogMessages.content.like(f"%{keyword}%")))

    return contextList.order_by(DevLogMessages.created_at.desc()).all()

# *****
# 功能 删除单条log
# 说明
# *****
def contextDelete(sql_db ,id ,user_id):
    contexts = sql_db.query(DevLogMessages).filter(DevLogMessages.id == id , DevLogMessages.user_id == user_id).first()

    sql_db.delete(contexts)
    sql_db.commit()

    return ("ok")

