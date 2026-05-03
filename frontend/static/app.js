const chatForm = document.getElementById("chat-form");
const modelFlagSelect = document.getElementById("model-flag");
const topKSelect = document.getElementById("top-k");
const questionInput = document.getElementById("question");
const uploadInput = document.getElementById("upload-file");
const sendButton = document.getElementById("send-button");
const clearButton = document.getElementById("clear-button");
const loadHistoryButton = document.getElementById("load-history-button");
const newSessionButton = document.getElementById("new-session-button");
const refreshSessionButton = document.getElementById("refresh-session-button");
const sessionIdDisplay = document.getElementById("session-id-display");
const sessionList = document.getElementById("session-list");
const statusText = document.getElementById("status-text");
const statusSession = document.getElementById("status-session");
const statusMode = document.getElementById("status-mode");
const chatList = document.getElementById("chat-list");
const referenceBox = document.getElementById("reference-box");
const noticeBox = document.getElementById("notice-box");
const errorBox = document.getElementById("error-box");

const API_BASE_URL = "http://127.0.0.1:8000";
const SESSION_STORAGE_KEY = "navi_rag_session_id";
const DEFAULT_NOTICE = "Ready. You can send a request or load history.";

let sessionId = getOrCreateSessionId();
let sessionListItems = [];

function generateSessionId() {
  return crypto.randomUUID();
}

function getOrCreateSessionId() {
  const savedSessionId = localStorage.getItem(SESSION_STORAGE_KEY);
  if (savedSessionId) {
    return savedSessionId;
  }

  const newSessionId = generateSessionId();
  localStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
  return newSessionId;
}

function saveSessionId(nextSessionId) {
  sessionId = nextSessionId;
  localStorage.setItem(SESSION_STORAGE_KEY, nextSessionId);
  updateStatus();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setControlsDisabled(isDisabled) {
  sendButton.disabled = isDisabled;
  clearButton.disabled = isDisabled;
  loadHistoryButton.disabled = isDisabled;
  newSessionButton.disabled = isDisabled;
  refreshSessionButton.disabled = isDisabled;
}

function setLoading(isLoading, message = "Thinking...") {
  setControlsDisabled(isLoading);
  statusText.textContent = isLoading ? "Loading" : "Idle";
  noticeBox.textContent = isLoading ? message : DEFAULT_NOTICE;
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

function clearError() {
  errorBox.textContent = "";
  errorBox.classList.add("hidden");
}

function updateStatus() {
  sessionIdDisplay.textContent = sessionId;
  statusSession.textContent = `session_id = ${sessionId}`;
  statusMode.textContent = `${modelFlagSelect.value} / top_k = ${topKSelect.value}`;
}

function normalizeHistoryItem(item) {
  const role = String(item?.role || "").toLowerCase();
  const content = String(item?.content ?? "").trim();

  return {
    role: role === "human" || role === "user" ? "human" : "ai",
    content,
  };
}

function normalizeSessionItem(item) {
  return {
    title: String(item?.title ?? "").trim() || "Untitled session",
    sessionId: String(item?.session_id ?? item?.sessionid ?? item?.sessionId ?? "").trim(),
  };
}

function renderSessionList(items) {
  sessionListItems = Array.isArray(items)
    ? items.map(normalizeSessionItem).filter((item) => item.sessionId)
    : [];

  if (sessionListItems.length === 0) {
    sessionList.innerHTML = '<div class="empty-box">No historical sessions.</div>';
    return;
  }

  sessionList.innerHTML = sessionListItems
    .map((item) => {
      const isActive = item.sessionId === sessionId ? " is-active" : "";
      return `
        <div class="session-row${isActive}" data-session-id="${escapeHtml(item.sessionId)}">
          <button class="session-item" type="button">${escapeHtml(item.title)}</button>
          <button class="session-delete" type="button" aria-label="Delete session">x</button>
        </div>
      `;
    })
    .join("");
}

function renderChatHistory(chatHistory) {
  if (!Array.isArray(chatHistory) || chatHistory.length === 0) {
    chatList.innerHTML = '<div class="empty-box">No chat history for this session.</div>';
    chatList.classList.add("empty-state");
    return;
  }

  chatList.classList.remove("empty-state");

  chatList.innerHTML = chatHistory
    .map(normalizeHistoryItem)
    .map((item) => {
      const bubbleClass = item.role === "human" ? "bubble-user" : "bubble-ai";
      return `<article class="bubble ${bubbleClass}">${escapeHtml(item.content)}</article>`;
    })
    .join("");

  chatList.lastElementChild?.scrollIntoView({ block: "nearest" });
}

function renderReferences(tagList) {
  if (!Array.isArray(tagList) || tagList.length === 0) {
    referenceBox.innerHTML = '<div class="empty-box">No reference chunks returned for this response.</div>';
    return;
  }

  const html = tagList.map((tag) => `<li>${escapeHtml(tag)}</li>`).join("");
  referenceBox.innerHTML = `<ol class="reference-list">${html}</ol>`;
}

function validateForm() {
  const question = questionInput.value.trim();
  const files = Array.from(uploadInput.files || []);
  const allowedExtensions = [".txt", ".pdf"];

  if (!sessionId) {
    return "Session ID was not initialized.";
  }

  if (!question) {
    return "Please enter a question.";
  }

  for (const file of files) {
    const lowerName = file.name.toLowerCase();
    const isValid = allowedExtensions.some((ext) => lowerName.endsWith(ext));
    if (!isValid) {
      return "Only txt and pdf files are supported.";
    }
  }

  return null;
}

async function loadSessionList() {
  clearError();
  setLoading(true, "Loading session list...");

  try {
    const response = await fetch(`${API_BASE_URL}/chat/session`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || "Failed to load session list.");
    }

    renderSessionList(result || []);
    statusText.textContent = "Success";
    noticeBox.textContent = "Session list was updated.";
  } catch (error) {
    statusText.textContent = "Error";
    noticeBox.textContent = "Failed to load session list.";
    showError(error.message || "Unknown error while loading session list.");
  } finally {
    setControlsDisabled(false);
  }
}

async function selectSession(nextSessionId) {
  if (!nextSessionId) {
    return;
  }

  saveSessionId(nextSessionId);
  renderSessionList(sessionListItems);
  await loadChatHistory();
}

async function loadChatHistory() {
  clearError();
  updateStatus();
  setLoading(true, "Loading chat history...");

  try {
    const response = await fetch(`${API_BASE_URL}/chat/history/${encodeURIComponent(sessionId)}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || "Failed to load chat history.");
    }

    renderChatHistory(result);
    renderReferences([]);
    renderSessionList(sessionListItems);
    statusText.textContent = "Success";
    noticeBox.textContent = `Loaded history for session_id = ${sessionId}.`;
  } catch (error) {
    statusText.textContent = "Error";
    noticeBox.textContent = "Failed to load history. Check the backend service and session_id.";
    showError(error.message || "Unknown error while loading history.");
  } finally {
    setControlsDisabled(false);
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  clearError();
  updateStatus();

  const validationError = validateForm();
  if (validationError) {
    showError(validationError);
    return;
  }

  const formData = new FormData();
  formData.append("question", questionInput.value.trim());
  formData.append("session_id", sessionId);
  formData.append("model_flag", modelFlagSelect.value);
  formData.append("top_k", topKSelect.value);

  for (const file of uploadInput.files) {
    formData.append("upload_file", file);
  }

  setLoading(true);

  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok || result.status !== "ok") {
      throw new Error(result.detail || "Request failed.");
    }

    renderChatHistory(result.data.chatHistory);
    renderReferences(result.data.tag);
    await loadSessionList();
    statusText.textContent = "Success";
    noticeBox.textContent = "Request succeeded. Chat history was updated.";
    questionInput.value = "";
  } catch (error) {
    statusText.textContent = "Error";
    noticeBox.textContent = "Request failed. Check parameters, backend status, or the browser console.";
    showError(error.message || "Unknown error.");
  } finally {
    setControlsDisabled(false);
  }
}

async function handleClearSession() {
  clearError();
  updateStatus();

  const confirmed = window.confirm(`Delete chat history and vector store for session_id = ${sessionId}?`);
  if (!confirmed) {
    return;
  }

  setLoading(true, "Clearing current session...");

  try {
    const response = await fetch(`${API_BASE_URL}/chat/history/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (!response.ok || result.deleted !== true) {
      throw new Error(result.detail || "Delete failed.");
    }

    renderChatHistory([]);
    renderReferences([]);
    await loadSessionList();
    questionInput.value = "";
    uploadInput.value = "";
    statusText.textContent = "Success";
    noticeBox.textContent = "Current session was cleared.";
  } catch (error) {
    statusText.textContent = "Error";
    noticeBox.textContent = "Delete failed. Confirm the current session exists.";
    showError(error.message || "Unknown error while deleting.");
  } finally {
    setControlsDisabled(false);
  }
}

async function handleDeleteSession(targetSessionId) {
  if (!targetSessionId) {
    return;
  }

  const confirmed = window.confirm(`Delete chat history for session_id = ${targetSessionId}?`);
  if (!confirmed) {
    return;
  }

  clearError();
  setLoading(true, "Deleting session...");

  try {
    const response = await fetch(`${API_BASE_URL}/chat/history/${encodeURIComponent(targetSessionId)}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (!response.ok || result.deleted !== true) {
      throw new Error(result.detail || "Delete failed.");
    }

    if (targetSessionId === sessionId) {
      renderChatHistory([]);
      renderReferences([]);
      questionInput.value = "";
      uploadInput.value = "";
    }

    await loadSessionList();
    statusText.textContent = "Success";
    noticeBox.textContent = "Session was deleted.";
  } catch (error) {
    statusText.textContent = "Error";
    noticeBox.textContent = "Delete failed.";
    showError(error.message || "Unknown error while deleting.");
  } finally {
    setControlsDisabled(false);
  }
}

function handleNewSession() {
  clearError();
  saveSessionId(generateSessionId());
  renderChatHistory([]);
  renderReferences([]);
  renderSessionList(sessionListItems);
  questionInput.value = "";
  uploadInput.value = "";
  statusText.textContent = "Idle";
  noticeBox.textContent = "New session was created.";
}

chatForm.addEventListener("submit", handleSubmit);
clearButton.addEventListener("click", handleClearSession);
loadHistoryButton.addEventListener("click", loadChatHistory);
newSessionButton.addEventListener("click", handleNewSession);
refreshSessionButton.addEventListener("click", loadSessionList);
sessionList.addEventListener("click", (event) => {
  const deleteButton = event.target.closest(".session-delete");
  if (deleteButton) {
    const row = deleteButton.closest(".session-row");
    handleDeleteSession(row?.dataset.sessionId);
    return;
  }

  const itemButton = event.target.closest(".session-item");
  if (!itemButton) {
    return;
  }

  const row = itemButton.closest(".session-row");
  selectSession(row?.dataset.sessionId);
});
modelFlagSelect.addEventListener("change", updateStatus);
topKSelect.addEventListener("change", updateStatus);

updateStatus();
renderReferences([]);
loadSessionList();
