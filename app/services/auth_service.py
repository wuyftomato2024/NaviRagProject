from fastapi import HTTPException
from app.repositories.chat_repository import userCreate ,userCheck
from app.core.security import hash_password ,verify_password ,access_token_create

# *****
# 用户注册
# *****
def register(sql_db ,user_name ,password):

    result = userCheck(sql_db ,user_name)

    if result :
        raise HTTPException(status_code=400 ,detail="username already exists")
    
    print(password)
    print(len(password.encode("utf-8")))

    hashed_password = hash_password(password)

    userCreate(sql_db ,user_name ,hashed_password)

    return {"status": "ok"}

# *****
# 用户登录
# *****
def login(sql_db ,user_name ,password):
    user = userCheck(sql_db ,user_name)

    if not user :
        raise HTTPException(status_code=404 ,detail="user is not existence")
    
    # 先检测密码的哈希是否匹配
    if verify_password(password, user.hashed_password):
        # 匹配成功发行jwt token
        token = access_token_create({"user_name" : user.user_name})
    else :
        raise HTTPException(status_code=400 , detail="password is worng")
    
    return {"access_token": token ,"token_type": "bearer"}