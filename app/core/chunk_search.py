# *****
# 功能 向量库检索 ，提取检索文本块结果
# 说明 
# *****
def chunk_context(vector_db ,top_k ,question):
    # 把数据库变成一个“检索器”。后面的search_kwargs是固定写法，是搜索参数的意思，必须是要写成字典的形式
    db_retriever = vector_db.as_retriever(search_kwargs= {"k": top_k}) 

    # 搜索出来的文本块内容
    chunk_texts = db_retriever.invoke(question)
    chunk_map = [chunk_text.page_content for chunk_text in chunk_texts ]
    chunk_content_text =  "\n".join(chunk_map)

    return chunk_content_text ,chunk_texts