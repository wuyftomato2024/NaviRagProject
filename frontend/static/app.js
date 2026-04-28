const chatForm = document.getElementById("chat-form");
const modelFlagSelect = document.getElementById("model-flag");
const apiKeyField = document.getElementById("api-key-field");
const apiKeyInput = document.getElementById("api-key");
const sessionIdInput = document.getElementById("session-id");
const topKSelect = document.getElementById("top-k");
const questionInput = document.getElementById("question");
const uploadInput = document.getElementById("upload-file");
const sendButton = document.getElementById("send-button");
const clearButton = document.getElementById("clear-button");
const statusText = document.getElementById("status-text");
const statusSession = document.getElementById("status-session");
const statusMode = document.getElementById("status-mode");
const chatList = document.getElementById("chat-list");
const referenceBox = document.getElementById("reference-box");
const noticeBox = document.getElementById("notice-box");
const errorBox = document.getElementById("error-box");

const API_BASE_URL = "http://127.0.0.1:8000";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setLoading(isLoading) {
  sendButton.disabled = isLoading;
  clearButton.disabled = isLoading;
  statusText.textContent = isLoading ? "Loading" : "Idle";
  noticeBox.textContent = isLoading ? "thinking..." : "页面已就绪，可以直接发送请求。";
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

function toggleApiKeyField() {
  const isOpenAI = modelFlagSelect.value === "openai";

  apiKeyField.classList.toggle("hidden", !isOpenAI);
  apiKeyInput.required = isOpenAI;

  if (!isOpenAI) {
    apiKeyInput.value = "";
  }

  updateStatus();
}

function renderChatHistory(chatHistory) {
  if (!Array.isArray(chatHistory) || chatHistory.length === 0) {
    chatList.innerHTML = '<div class="empty-box">还没有聊天记录，输入问题后即可开始。</div>';
    return;
  }

  const html = chatHistory
    .map((item) => {
      const role = item.role === "human" ? "User" : "AI";
      const bubbleClass = item.role === "human" ? "bubble-user" : "bubble-ai";

      return `
        <article class="bubble ${bubbleClass}">
          <span class="bubble-role">${role}</span>
          ${escapeHtml(item.content)}
        </article>
      `;
    })
    .join("");

  chatList.innerHTML = html;
}

function renderReferences(tagList) {
  if (!Array.isArray(tagList) || tagList.length === 0) {
    referenceBox.innerHTML = '<div class="empty-box">本次回答未返回文档命中信息。</div>';
    return;
  }

  const html = tagList
    .map((tag) => `<li>${escapeHtml(tag)}</li>`)
    .join("");

  referenceBox.innerHTML = `<ol class="reference-list">${html}</ol>`;
}

function validateForm() {
  const sessionId = sessionIdInput.value.trim();
  const question = questionInput.value.trim();
  const modelFlag = modelFlagSelect.value;
  const files = Array.from(uploadInput.files || []);
  const allowedExtensions = [".txt", ".pdf"];

  if (!sessionId) {
    return "请先填写 Session ID。";
  }

  if (!question) {
    return "请输入问题内容。";
  }

  if (modelFlag === "openai" && !apiKeyInput.value.trim()) {
    return "当前使用 OpenAI 模式，请先填写 API Key。";
  }

  for (const file of files) {
    const lowerName = file.name.toLowerCase();
    const isValid = allowedExtensions.some((ext) => lowerName.endsWith(ext));
    if (!isValid) {
      return "仅支持上传 txt 或 pdf 文件。";
    }
  }

  return null;
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

  if (modelFlagSelect.value === "openai") {
    formData.append("openai_api_key", apiKeyInput.value.trim());
  }

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
      throw new Error(result.detail || "请求失败，请稍后重试。");
    }

    renderChatHistory(result.data.chatHistory);
    renderReferences(result.data.tag);
    statusText.textContent = "Success";
    noticeBox.textContent = "请求成功，聊天记录已更新。";
    questionInput.value = "";
  } catch (error) {
    statusText.textContent = "Error";
    noticeBox.textContent = "请求未成功，请检查参数、后端状态或浏览器控制台。";
    showError(error.message || "发生未知错误。");
  } finally {
    sendButton.disabled = false;
    clearButton.disabled = false;
  }
}

async function handleClearSession() {
  clearError();
  updateStatus();

  const sessionId = sessionIdInput.value.trim();
  if (!sessionId) {
    showError("请先填写 Session ID。");
    return;
  }

  const confirmed = window.confirm(`确认删除 session_id = ${sessionId} 的聊天记录和向量库吗？`);
  if (!confirmed) {
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(`${API_BASE_URL}/chat/db?session_id=${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (!response.ok || result.deleted !== true) {
      throw new Error(result.detail || "删除失败，请稍后重试。");
    }

    renderChatHistory([]);
    renderReferences([]);
    questionInput.value = "";
    uploadInput.value = "";
    statusText.textContent = "Success";
    noticeBox.textContent = "当前会话已删除。";
  } catch (error) {
    statusText.textContent = "Error";
    noticeBox.textContent = "删除未成功，请检查当前会话是否存在或浏览器控制台。";
    showError(error.message || "删除时发生未知错误。");
  } finally {
    sendButton.disabled = false;
    clearButton.disabled = false;
  }
}

chatForm.addEventListener("submit", handleSubmit);
clearButton.addEventListener("click", handleClearSession);
modelFlagSelect.addEventListener("change", toggleApiKeyField);
sessionIdInput.addEventListener("input", updateStatus);
topKSelect.addEventListener("change", updateStatus);

toggleApiKeyField();
renderReferences([]);
