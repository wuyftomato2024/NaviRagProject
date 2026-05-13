from fastapi import HTTPException
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import TextLoader , PyPDFLoader
import os

# *****
# 功能 文件上传逻辑
# 说明 
# *****
async def handle_upload_files(upload_file):
    docs_list = []
    # index是自动从0开始赋值，有点类似于i等于0，i++那种感觉，而enumerate()是一个特殊用法，用来给东西增加编号
    # enumerate()和index是绑定用法，其实index本身是没有值的，这个值反而是enumerate给赋予的
    for index , file in enumerate(upload_file):
        file_name = file.filename
        file_content = await file.read()
        
        if not file_content :
            raise HTTPException(status_code=400 ,detail=f"{file_name} is empty")
        
        if file_name.endswith(".txt"):
            temp_file_path = f"temp{index}.txt"
            with open (temp_file_path,"wb") as temp_file :
                temp_file.write(file_content)
            loader = TextLoader(temp_file_path ,encoding="utf-8")
            docs = loader.load()
            
        elif file_name.endswith(".pdf"):
            temp_file_path = f"temp{index}.pdf"
            with open (temp_file_path,"wb") as temp_file :
                temp_file.write(file_content)
            loader = PyPDFLoader(temp_file_path)
            docs = loader.load()

        else :
            raise HTTPException(status_code=400 ,detail=f"{file_name} is not a supported file type. Only txt and pdf are supported. ")

        # 删除生成的本地文件
        os.remove(temp_file_path)

        text_splitters = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=50,
                separators=["\n", "。", "!", "？", ",", "、", ""]
                )
        texts = text_splitters.split_documents(docs)

        # 循环 给text里面新增一个metadata的dict，key叫做file_name，而key是上面的file_name
        for text in texts:
            text.metadata["file_name"] = file_name

        # 用extend的原因是，用append的话会整一个list塞进去docs_list里面去，而extend是把docs里面的内容全部拆开，再放到extend里面去
        docs_list.extend(texts)
    
    return docs_list