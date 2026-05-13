from dataclasses import dataclass
from typing import Optional, List
from fastapi import UploadFile

@dataclass
class ChatContext:
    question: str
    openai_api_key: str | None
    sql_db: object
    session_id: str
    model_flag: str
    user_id: int
    top_k: int
    upload_file: Optional[List[UploadFile]] = None

@dataclass
class normalChatContext:
    question: str
    openai_api_key: str | None
    sql_db: object
    session_id: str
    model_flag: str
    user_id: int
    