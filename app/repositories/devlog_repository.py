from app.core.db_tables import User ,DevLogMessages

# *****
# 功能 log登记
# 说明
# *****
def contextCreate(sql_db ,session_id ,user_id ,content):
    new_context = DevLogMessages(
        session_id = session_id ,
        user_id = user_id ,
        content = content
    )

    sql_db.add(new_context)
    sql_db.commit()

    return ("ok")

# *****
# 功能 读取所有log
# 说明
# *****
def contextListGet(sql_db ,user_id):

    contextList = sql_db.query(DevLogMessages).filter(DevLogMessages.user_id == user_id).order_by(DevLogMessages.created_at.desc()).all()

    if not contextList :
        contextList = []

    return contextList

# *****
# 功能 删除单条log
# 说明
# *****
def contextDelete(sql_db ,id ,user_id):
    contexts = sql_db.query(DevLogMessages).filter(DevLogMessages.id == id , DevLogMessages.user_id == user_id).first()

    sql_db.delete(contexts)
    sql_db.commit()

    return ("ok")

