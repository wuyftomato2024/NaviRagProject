from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from jose import jwt
from fastapi import HTTPException ,Depends
from fastapi.security import OAuth2PasswordBearer
import os
from pathlib import Path
from dotenv import load_dotenv

# ①__file__：当前这个 .py 文件的位置 ②Path(__file__)：把它变成路径对象 ③.resolve()：转成完整绝对路径 ④.parents[1]：往上退两层目录
BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / "configuration.env")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES" , "30"))
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# *****
# 密码哈希化
# *****
def hash_password(password):
    return pwd_context.hash(password)

# *****
# 用输入密码和哈希化的密码去比较
# *****
def verify_password(password, hashed_password):
    return pwd_context.verify(password,hashed_password)

# *****
# 生成jwt token
# *****
def access_token_create(data :dict):
    token_data = data.copy()

    expire_time = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token_data.update({"exp": expire_time})

    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)

    return token

# *****
# 验证jwt token
# *****
def check_accsess_token(token):
    try :
        token_restore = jwt.decode(token ,SECRET_KEY ,algorithms=[ALGORITHM])
    except Exception as e:
        print(e)
        raise HTTPException(status_code=401, detail="Invalid token")
    user_name = token_restore.get("user_name")
    user_id = token_restore.get("user_id")

    print(user_name)
    print(user_id)

    if user_name is None :
        raise HTTPException(status_code=401 ,detail="Invalid token")
    
    return {
        "user_name" : user_name ,
        "user_id" : user_id
        }

# *****
# 从header获取token，并且验证jwt token 返回user_name
# *****
def get_current_user(token = Depends(oauth2_scheme)):
    return check_accsess_token(token)