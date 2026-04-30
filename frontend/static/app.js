const chatForm = document.getElementById("chat-form");
const modelFlagSelect = document.getElementById("model-flag");
const sessionIdInput = document.getElementById("session-id");
const topKSelect = document.getElementById("top-k");
const questionInput = document.getElementById("question");
const uploadInput = document.getElementById("upload-file");
const sendButton = document.getElementById("send-button");
const clearButton = document.getElementById("clear-button");
const loadHistoryButton = document.getElementById("load-history-button");
const statusText = document.getElementById("status-text");
const statusSession = document.getElementById("status-session");
const statusMode = document.getElementById("status-mode");
const chatList = document.getElementById("chat-list");
const referenceBox = document.getElementById("reference-box");
const noticeBox = document.getElementById("notice-box");
const errorBox = document.getElementById("error-box");

const API_BASE_URL = "http://127.0.0.1:8000";
const DEFAULT_NOTICE = "Ready. You can send a request or load history.";

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
  const sessionId = sessionIdInput.value.trim() || "-";
  const modelFlag = modelFlagSelect.value;
  const topK = topKSelect.value;

  statusSession.textContent = `session_id = ${sessionId}`;
  statusMode.textContent = `${modelFlag} / top_k = ${topK}`;
}

function normalizeHistoryItem(item) {
  const role = String(item?.role || "").toLowerCase();
  const content = String(item?.content ?? "").trim();

  return {
    role: role === "human" || role === "user" ? "human" : "ai",
    content,
  };
}

function renderChatHistory(chatHistory) {
  if (!Array.isArray(chatHistory) || chatHistory.length === 0) {
    chatList.innerHTML = '<div class="empty-box">No chat history for this session.</div>';
    chatList.classList.add("empty-state");
    return;
  }

  chatList.classList.remove("empty-state");

  const html = chatHistory
    .map(normalizeHistoryItem)
    .map((item) => {
      const bubbleClass = item.role === "human" ? "bubble-user" : "bubble-ai";

      return `<article class="bubble ${bubbleClass}">${escapeHtml(item.content)}</article>`;
    })
    .join("");

  chatList.innerHTML = html;
  chatList.lastElementChild?.scrollIntoView({ block: "nearest" });
}

function renderReferences(tagList) {
  if (!Array.isArray(tagList) || tagList.length === 0) {
    referenceBox.innerHTML = '<div class="empty-box">No reference chunks returned for this response.</div>';
    return;
  }

  const html = tagList
    .map((tag) => `<li>${escapeHtml(tag)}</li>`)
    .join("");

  referenceBox.innerHTML = `<ol class="reference-list">${html}</ol>`;
}

function validateSessionId() {
  const sessionId = sessionIdInput.value.trim();

  if (!sessionId) {
    return "Please enter a Session ID first.";
  }

  return null;
}

function validateForm() {
  const sessionError = validateSessionId();
  const question = questionInput.value.trim();
  const files = Array.from(uploadInput.files || []);
  const allowedExtensions = [".txt", ".pdf"];

  if (sessionError) {
    return sessionError;
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

async function loadChatHistory() {
  clearError();
  updateStatus();

  const validationError = validateSessionId();
  if (validationError) {
    showError(validationError);
    return;
  }

  const sessionId = sessionIdInput.value.trim();
  setLoading(true, "Loading chat history...");

  try {
    const response = await fetch(`${API_BASE_URL}/chat?session_id=${encodeURIComponent(sessionId)}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || "Failed to load chat history.");
    }

    renderChatHistory(result);
    renderReferences([]);
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
  formData.append("session_id", sessionIdInput.value.trim());
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

  const validationError = validateSessionId();
  if (validationError) {
    showError(validationError);
    return;
  }

  const sessionId = sessionIdInput.value.trim();
  const confirmed = window.confirm(`Delete chat history and vector store for session_id = ${sessionId}?`);
  if (!confirmed) {
    return;
  }

  setLoading(true, "Clearing current session...");

  try {
    const response = await fetch(`${API_BASE_URL}/chat/db?session_id=${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (!response.ok || result.deleted !== true) {
      throw new Error(result.detail || "Delete failed.");
    }

    renderChatHistory([]);
    renderReferences([]);
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

chatForm.addEventListener("submit", handleSubmit);
clearButton.addEventListener("click", handleClearSession);
loadHistoryButton.addEventListener("click", loadChatHistory);
modelFlagSelect.addEventListener("change", updateStatus);
sessionIdInput.addEventListener("input", updateStatus);
topKSelect.addEventListener("change", updateStatus);

updateStatus();
renderReferences([]);
