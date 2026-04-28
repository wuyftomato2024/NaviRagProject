from fastapi import HTTPException
from app.services.normal_chat_service import normalChat
from app.services.rag_service import ragChat
from app.services.judge_service import judge
import os

async def Chat(model_flag ,openai_api_key ,upload_file ,question ,top_k ,sql_db ,session_id):

    vector_db_path = f"faiss_db/{session_id}/"
    vector_db_flag = os.path.exists(vector_db_path)

    if model_flag == "openai" and not openai_api_key :
            raise HTTPException(status_code=400 ,detail="you must input the apikey")

    if upload_file :
        # 调用你已经写好的 utils 里面的函数
        response = await ragChat(
            question = question,
            upload_file = upload_file,
            openai_api_key = openai_api_key,
            top_k = top_k ,
            sql_db = sql_db ,
            session_id = session_id ,
            model_flag = model_flag
            )
    
    elif not upload_file and vector_db_flag :

        judge_flag = True

        rag_kws = ["文件","文档","pdf","上传","总结","概括"]
        for rag_kw in rag_kws :
            if rag_kw in question :
                response = await ragChat(
                question = question,
                upload_file = upload_file,
                openai_api_key = openai_api_key,
                top_k = top_k ,
                sql_db = sql_db ,
                session_id = session_id ,
                model_flag = model_flag
                )
                print("not in judge and rag")
                judge_flag = False
                break
            
        history_kws = ["上一个问题" ,"刚刚说的" ,"继续刚才" ,"刚才那个" ,"上一条"]
        for history_kw in history_kws :
            if history_kw in question :
                response = normalChat(
                question = question ,
                openai_api_key = openai_api_key ,
                sql_db = sql_db ,
                session_id = session_id ,
                model_flag = model_flag
                )
                print("not in judge and normal")
                judge_flag = False
                break

        if judge_flag:

            judge_response = judge(
                question = question,
                openai_api_key = openai_api_key ,
                sql_db = sql_db ,
                session_id = session_id ,
                model_flag = model_flag
            ).strip().lower()

            if judge_response == "rag" :
                response = await ragChat(
                question = question,
                upload_file = upload_file,
                openai_api_key = openai_api_key,
                top_k = top_k ,
                sql_db = sql_db ,
                session_id = session_id ,
                model_flag = model_flag
                )

                print("judge rag success")

            elif judge_response == "history":
                response = normalChat(
                question = question ,
                openai_api_key = openai_api_key ,
                sql_db = sql_db ,
                session_id = session_id,
                model_flag = model_flag
                )
                print("judge history success")

            elif judge_response == "normal":
                response = normalChat(
                question = question ,
                openai_api_key = openai_api_key ,
                sql_db = sql_db ,
                session_id = session_id,
                model_flag = model_flag
                )
                print("judge normal success")

            else :
                response = normalChat(
                question = question ,
                openai_api_key = openai_api_key ,
                sql_db = sql_db ,
                session_id = session_id ,
                model_flag = model_flag
                )
                print("judge normal success")

    else :
        response = normalChat(
        question = question ,
        openai_api_key = openai_api_key ,
        sql_db = sql_db ,
        session_id = session_id ,
        model_flag = model_flag
        )
    
    return response