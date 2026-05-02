# NaviRagProject

NaviRagProject is a FastAPI-based RAG chat application that supports normal chat, file-based RAG chat, SQL-based chat history, session history query, session deletion, local FAISS vector storage, and OpenAI / Ollama model switching.

This project started as a learning RAG demo and has gradually been refactored into a small AI application that can run locally and be deployed to AWS EC2.

## Overview

The project currently supports:

- Normal chat
- RAG chat with uploaded files
- Automatic routing between normal chat and RAG chat
- SQL-based chat history persistence
- Session history query by session_id
- Session deletion by session_id
- Local FAISS vector store save/load
- OpenAI / Ollama model switching
- Local embedding model support
- HTML / CSS / JavaScript test frontend
- AWS EC2 deployment verification

## Tech Stack

### Backend

- Python
- FastAPI
- SQLAlchemy
- MySQL / MariaDB
- FAISS
- LangChain
- OpenAI API
- Ollama

### Frontend

- HTML
- CSS
- JavaScript

### Deployment

- AWS EC2
- Uvicorn
- Python http.server

## Main Features

### 1. Normal Chat

When no file is uploaded, the system works as a normal AI chat application.

Chat history is saved into SQL and separated by session_id.

### 2. RAG Chat with Files

When a txt or pdf file is uploaded, the backend loads the file, splits it into chunks, creates embeddings, stores them in a local FAISS vector store, retrieves relevant chunks, and sends the retrieved context to the model to generate an answer.

### 3. Local FAISS Vector Store

Vector stores are saved locally by session_id:

```text
faiss_db/{session_id}/
```

If the user does not upload a new file but the vector store exists for the session_id, the backend can load the local FAISS store and continue RAG chat.

### 4. SQL Chat History

Chat messages are stored in MySQL.

The project supports querying chat history by session_id and displaying it on the frontend.

### 5. Session Deletion

The project supports deleting a session by session_id.

It deletes:

- SQL chat history
- Local FAISS vector store directory

If the local vector store does not exist, SQL chat history can still be deleted normally.

### 6. Model Switching

The project supports model switching through model_flag:

- openai
- ollama

OpenAI mode requires an OpenAI API key.  
Ollama mode uses local chat and embedding models.

### 7. Test Frontend

The frontend supports:

- Asking questions
- Uploading files
- Setting session_id
- Selecting model mode
- Displaying answers
- Displaying source files
- Querying session history
- Deleting sessions

## Project Structure

```text
NaviRagProject/
├── app/
│   ├── main.py
│   ├── api/
│   │   └── chat.py
│   ├── services/
│   │   ├── chunk_hit_service.py
│   │   ├── judge_service.py
│   │   ├── normal_chat_service.py
│   │   ├── rag_service.py
│   │   ├── summary_service.py
│   │   └── uploadfile_service.py
│   ├── repositories/
│   │   └── chat_repository.py
│   ├── core/
│   │   ├── ai_model_select.py
│   │   ├── ai_request_format_select.py
│   │   ├── chunk_search.py
│   │   ├── database.py
│   │   ├── dataFormat_change.py
│   │   ├── db_format.py
│   │   └── vector_store.py
│   ├── schemas/
│   │   ├── models.py
│   │   └── db_model.py
│   └── prompts/
│       └── prompt_builder.py
├── frontend/
│   └── static/
│       ├── index.html
│       ├── app.js
│       └── style.css
├── docs/
├── requirements.txt
├── configuration.example.env
└── README.md
```

## Configuration

The project can load environment values from a configuration file.

Create the following file in the project root:

```text
configuration.env
```

Example:

```env
OPENAI_API_KEY=your_openai_api_key
MODEL_FLAG=openai
DATABASE_URL=mysql+pymysql://root:password@localhost/test_db
```

Important:

```text
configuration.env
```

should not be committed to GitHub.

A sample file such as:

```text
configuration.example.env
```

can be committed as a reference.

## Backend Startup

From the project root:

```bash
python -m venv myenv
source myenv/bin/activate
```

On Windows:

```bash
myenv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the backend:

```bash
uvicorn app.main:app --reload
```

Open:

```text
http://localhost:8000/docs
```

## Frontend Startup

Go to the frontend directory:

```bash
cd frontend/static
python -m http.server 3000
```

Open:

```text
http://localhost:3000
```

When deploying to EC2, update API_BASE_URL in the frontend JavaScript file:

```js
const API_BASE_URL = "http://your-ec2-public-ip:8000";
```

## API Overview

### Chat / RAG API

```text
POST /chat
```

Main parameters:

- question
- session_id
- upload_file
- top_k
- model_flag
- openai_api_key

Notes:

- Without file upload, the system runs normal chat or loads an existing vector store
- With file upload, the system creates or overwrites the local vector store for the session_id
- model_flag supports openai / ollama

### Query Session History

```text
GET /chat/history
```

Returns chat history by session_id.

### Delete Session

```text
DELETE /chat/db
```

Deletes:

- SQL chat history
- Local vector store directory

by session_id.

## AWS Deployment Notes

This project has been deployed and verified on AWS EC2.

Verified items:

- Python 3.11 installation on EC2
- requirements.txt installation
- MySQL / MariaDB installation on EC2
- Backend startup
- Frontend startup with Python http.server
- Mobile browser access to EC2 frontend
- Frontend request to backend
- CORS configuration
- MySQL Chinese character encoding issue fix

Common notes:

- MySQL / MariaDB should use utf8mb4 to support Chinese text
- EC2 security group should open ports 8000 and 3000 for testing
- FastAPI CORS middleware is required when frontend and backend use different ports
- faiss_db uses relative paths, so the backend should be started from the project root

## Future Plans

- Improve README and deployment documents
- Add JWT authentication
- Add more formal user/session management
- Improve frontend UI
- Improve configuration management
- Consider Nginx / systemd for production-like deployment
- Improve RAG retrieval quality and source display

## Project Status

This is a working prototype / semi-finished project.  
Core features are implemented and verified locally and on AWS EC2.
