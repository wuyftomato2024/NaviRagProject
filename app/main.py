from fastapi import FastAPI, UploadFile, File, Form ,HTTPException ,Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from app.api.chat import Chat
from app.api.vector_store_delete import sessionDeleteLogic 
from app.core.database import engine ,Base ,SessionLocal
from app.core.dataFormat_change import sql_message_process
from app.schemas.model import ApiResponse
from app.repositories.chat_repository import sessionCreate ,sessionGet ,sessionIdGet
import os
from pathlib import Path
from dotenv import load_dotenv
import uuid

# 创建 FastAPI 应用
app = FastAPI()

# ===== Codex added: frontend CORS support =====
# This block was added by Codex for the static frontend.
# Purpose:
# - allow the frontend served from http://127.0.0.1:5500
# - and http://localhost:5500
#   to call this FastAPI backend during local development.
# If you later host frontend and backend under the same origin,
# this block can be removed or narrowed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ===== End Codex added block =====

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try :
        yield db
    finally :
        db.close()

# 测试接口
@app.get("/")
def root():
    return {"message":"Fastapi was running"}

# HTTPException之所以好像没有调用，是因为后端触发了raise的话，fastapi其实就已经知道有这个东西的存在了，只不过没写出来的话，就是以别的格式返回现在做的是让他以一个固定格式返回 。exc :HTTPException 这种写法是给他加一个类型说明，让人一眼能看出来这个是哪种异常
@app.exception_handler(HTTPException)
async def setError(request,exc :HTTPException):
    return JSONResponse(
        status_code = exc.status_code,
        content = {
            "status":"fail",
            "data" : None,
            "detail":exc.detail
        }
    )

# Exception是意料外的错误
@app.exception_handler(Exception)
async def error(request,exc :Exception):
    return JSONResponse(
        status_code= 500,
        content={
            "status":"fail",
            "data" : None,
            "detail":str(exc)
        }
    )

# *****
# Chat接口
# *****
@app.post("/sessionID")
def sessionIdCreated():
    session_id = str(uuid.uuid4())

    return session_id

# *****
# Chat接口
# *****
@app.post("/chat" ,response_model=ApiResponse)
async def chat(
    # Form为表单里接收普通数据，File为表单里接收普通数据
    question : str = Form(...),
    # openai_api_key: str | None  = Form(None),
    # 把上传文件变成一个List，以上传复数文件
    upload_file : List [UploadFile] | None = File(None),
    top_k :int = Form(3,ge=1,le=3),
    session_id :str = Form(...) ,
    sql_db = Depends(get_db) ,
    model_flag: str = Form("openai")
):
    # ①__file__：当前这个 .py 文件的位置 ②Path(__file__)：把它变成路径对象 ③.resolve()：转成完整绝对路径 ④.parents[1]：往上退两层目录
    BASE_DIR = Path(__file__).resolve().parents[1]
    load_dotenv(BASE_DIR / "configuration.env")
    openai_api_key = os.getenv("OPENAI_API_KEY")
    
    # 按照session id来判断 是否第一次记录此会话
    session_result = sessionIdGet(sql_db = sql_db ,session_id = session_id )
    if session_result is None or not session_result:
        title = question[:20]
        sessionCreate(sql_db = sql_db ,session_id = session_id , title = title)

    response = await Chat(
        question = question ,
        openai_api_key = openai_api_key ,
        upload_file = upload_file ,
        top_k = top_k ,
        session_id = session_id ,
        sql_db = sql_db ,
        model_flag = model_flag
        )
    return response

# *****
# 聊天历史删除
# *****
@app.delete("/chat/history/{session_id}")
def sessionDelete(session_id :str ,sql_db = Depends(get_db)):

    response = sessionDeleteLogic(
        session_id = session_id ,
        sql_db = sql_db
        )

    return response

# *****
# 根据id获取聊天历史
# *****
@app.get("/chat/history/{session_id}")
def getChat(session_id :str , sql_db = Depends(get_db)):
    message_list = sql_message_process(sql_db =sql_db, session_id =session_id)

    return message_list


# *****
# 左侧side bar消息列表获取
# *****
@app.get("/chat/session")
def getSession(sql_db = Depends(get_db)):
    response = sessionGet(sql_db)

    return response