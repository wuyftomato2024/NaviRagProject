from app.core.database import Base
from sqlalchemy import Column ,Integer ,String ,DateTime ,Boolean ,Text
from datetime import datetime ,timezone 

# 定义表的格式
class ChatMessages(Base):
    __tablename__ = "chatmessages"

    # 数字类型(int)配合主key，会自动分配数字
    id = Column(Integer ,primary_key=True ,index=True)
    session_id = Column(String(50) ,nullable=False)
    role = Column(String(100) ,nullable=False)
    content = Column(Text ,nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # __tablename__ = 这张表叫什么
    # unique=True = 不能重复
    # index=True = 更方便查找

class ChatSession(Base):
    __tablename__ = "chatsessions"

    # 数字类型(int)配合主key，会自动分配数字
    id = Column(Integer ,primary_key=True ,index=True)
    session_id = Column(String(50) ,nullable=False)
    title = Column(String(100) ,nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc),nullable=False)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer ,primary_key=True ,index=True)
    user_name = Column(String(50) ,unique=True ,nullable=False ,index=True)
    hashed_password = Column(String(255) ,nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    