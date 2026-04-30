# NaviRagProject README Draft

## 1. Project Overview

NaviRagProject is a FastAPI-based AI Chat / RAG application that supports switching between cloud-based and local language models.

The project supports normal chat, file-based question answering, RAG-based retrieval-augmented responses, SQL-based chat history persistence, local FAISS vector store save/load, and session deletion.

The current goal of this project is to build a prototype AI Chat / RAG application that can run locally, be deployed to AWS EC2, and be tested through a simple frontend page.

---

## 2. Tech Stack

### Frontend
- HTML
- CSS
- JavaScript

### Backend
- Python
- FastAPI
- Uvicorn

### Database
- MySQL
- SQLAlchemy
- PyMySQL

### AI / RAG
- LangChain
- FAISS
- OpenAI API
- Ollama local models
- DeepSeek 14B local chat model
- Local embedding model

### Authentication
- User authentication has not been implemented yet
- JWT authentication is planned as a future improvement

---

## 3. Main Features

### Normal Chat

When no file is uploaded, the application works as a normal AI chat system.

### RAG File Question Answering

When a txt or pdf file is uploaded, the system splits the file content into chunks, converts them into embeddings, and stores them in a local FAISS vector store.

After that, users can ask questions based on the uploaded file content.

### Automatic Mode Selection

The system can judge whether a user question should be handled by normal chat or RAG mode.

### Local Vector Store Save / Load

The FAISS vector store is saved locally based on `session_id`.

If a vector store already exists for a session, the user can continue asking questions without uploading the file again.

### SQL Chat History Persistence

Both normal chat and RAG chat save user questions and AI responses into MySQL.

### Session Deletion

The application supports deleting chat history by `session_id`.

If a local vector store exists for that `session_id`, it will also be deleted.

If no local vector store exists, the SQL chat history can still be deleted normally.

### Frontend Test Page

A simple frontend page built with HTML, CSS, and JavaScript is included.

It can send requests to the FastAPI backend and display the returned results.

---

## 4. Project Structure

```text
NaviRagProject/
├── app/
│   ├── main.py                         # FastAPI entry point
│   ├── api/                            # API route layer
│   │   └── chat.py                     # Chat / delete related APIs
│   ├── services/                       # Business logic layer
│   │   ├── chunk_hit_service.py        # Source file detection
│   │   ├── judge_service.py            # Judge RAG / normal chat mode
│   │   ├── normal_chat_service.py      # Normal chat logic
│   │   ├── rag_service.py              # RAG chat logic
│   │   ├── summary_service.py          # File summary related logic
│   │   └── uploadfile_service.py       # File upload processing
│   ├── repositories/                   # Data access layer
│   │   └── chat_repository.py          # SQL operations for chat history
│   ├── core/                           # Configuration / database / common utilities
│   │   ├── ai_model_select.py          # OpenAI / Ollama model selection
│   │   ├── ai_request_format_select.py # Response prompt style selection
│   │   ├── chunk_search.py             # Vector search and chunk context building
│   │   ├── database.py                 # Database connection settings
│   │   ├── dataFormat_change.py        # Data format conversion for frontend response
│   │   ├── db_format.py                # SQLAlchemy table definitions
│   │   └── vector_store.py             # Vector store save / load / delete
│   ├── schemas/                        # Pydantic models
│   │   ├── models.py                   # API response models
│   │   └── db_model.py                 # DB request models
│   └── prompts/                        # Prompt templates
│       └── prompt_builder.py
├── frontend/                           # Frontend page
│   └── static/
│       ├── app.js
│       ├── index.html
│       └── style.css
├── faiss_db/                           # Local vector store directory (not recommended for Git)
├── requirements.txt
└── README.md
```

---

## 5. How to Run

### 5.1 Start the Backend

Run the following command from the project root directory:

```bash
uvicorn app.main:app --reload
```

For EC2 deployment, allow external access:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

After the backend starts, access:

```text
http://localhost:8000/docs
```

On EC2:

```text
http://<EC2_PUBLIC_IP>:8000/docs
```

---

### 5.2 Start the Frontend

Go to the frontend static directory.

Windows:

```bash
cd frontend\static
python -m http.server 3000
```

Linux / EC2:

```bash
cd frontend/static
python3.11 -m http.server 3000
```

Open in browser:

```text
http://localhost:3000
```

On EC2:

```text
http://<EC2_PUBLIC_IP>:3000
```

---

## 6. API Overview

### Chat API

```text
POST /chat
```

Main parameters:

- `question`: user question
- `upload_file`: optional uploaded file
- `top_k`: number of retrieved chunks
- `session_id`: session ID
- `model_flag`: model provider, supports `openai` / `ollama`
- `openai_api_key`: OpenAI API key, required when using OpenAI

Behavior:

- If no file is uploaded, the system runs normal chat
- If a file is uploaded, the system runs RAG mode
- If a local vector store already exists, the user can continue asking questions without uploading the file again

---

### Delete Session API

```text
DELETE /chat/db
```

Main parameter:

- `session_id`: target session ID to delete

Behavior:

- Deletes SQL chat history for the given `session_id`
- Deletes the corresponding local vector store if it exists

---

## 7. Current Progress

The current version has completed:

- Basic FastAPI backend structure
- Normal chat feature
- RAG file question answering
- Manual RAG flow
- MySQL chat history persistence
- Local FAISS vector store save/load
- OpenAI / Ollama model switching
- Local embedding model integration
- Session deletion
- Simple frontend page
- AWS EC2 deployment verification
- External mobile access verification

---

## 8. Future Plans

- Add session history list view
- Add JWT user authentication
- Improve frontend UI
- Organize OpenAI API key / Database URL into configuration files
- Improve AWS deployment workflow
- Consider using Nginx or systemd for service management
- Add more complete README and deployment documentation

---

## 9. Notes

This project originally started as a learning project for RAG, FastAPI, and SQLAlchemy.

It has gradually evolved into a deployable AI Chat application that supports normal chat, file-based question answering, SQL history persistence, local vector store management, and model switching.

The current version is still a semi-finished project, but it already has the basic structure and functionality of a complete portfolio project.
