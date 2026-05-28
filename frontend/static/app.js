const chatForm = document.getElementById("chat-form");
const logoutButton = document.getElementById("logout-button");
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
const openDevlogButton = document.getElementById("open-devlog-button");
const devlogContentInput = document.getElementById("devlog-content");
const saveDevlogButton = document.getElementById("save-devlog-button");
const refreshDevlogButton = document.getElementById("refresh-devlog-button");
const devlogCalendar = document.getElementById("devlog-calendar");
const devlogDetail = document.getElementById("devlog-detail");
const devlogCalendarTitle = document.getElementById("devlog-calendar-title");
const devlogPrevMonthButton = document.getElementById("devlog-prev-month");
const devlogNextMonthButton = document.getElementById("devlog-next-month");
const closeDevlogButton = document.getElementById("close-devlog-button");
const devlogDrawer = document.getElementById("devlog-drawer");
const devlogDrawerBackdrop = document.getElementById("devlog-drawer-backdrop");
const toastContainer = document.getElementById("toast-container");

const API_BASE_URL = "http://127.0.0.1:8000";
const WS_BASE_URL = "ws://127.0.0.1:8000/ws";
const DEFAULT_NOTICE = "Ready. You can send a request or load history.";
const EMPTY_SESSION_TEXT = "(none)";
const ACCESS_TOKEN_KEY = "navichat_access_token";
const LOGIN_PAGE_URL = "./index.html";
const LOGGED_OUT_NOTICE = "You are logged out. Please sign in again.";
const DEVLOG_EMPTY_TEXT = "No devlog yet. Save the first entry to build your timeline.";

let currentSessionId = null;
let sessionListItems = [];
let devlogItems = [];
let accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY) || "";
let websocket = null;
let websocketPingTimer = null;
let websocketReconnectTimer = null;
let currentDevlogMonthKey = null;
let selectedDevlogDateKey = null;
let lastToastFingerprint = "";
let lastToastAt = 0;

function setCurrentSessionId(nextSessionId) {
  currentSessionId = nextSessionId || null;
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

function hasAccessToken() {
  return Boolean(accessToken);
}

function clearStoredAccessToken() {
  accessToken = "";
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

function buildAuthHeaders() {
  if (!hasAccessToken()) {
    return {};
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

function setControlsDisabled(isDisabled) {
  sendButton.disabled = isDisabled;
  clearButton.disabled = isDisabled;
  loadHistoryButton.disabled = isDisabled;
  newSessionButton.disabled = isDisabled;
  refreshSessionButton.disabled = isDisabled;
  logoutButton.disabled = isDisabled;
  openDevlogButton.disabled = isDisabled;
  saveDevlogButton.disabled = isDisabled;
  refreshDevlogButton.disabled = isDisabled;
}

function openDevlogDrawer() {
  devlogDrawer.classList.add("is-open");
  devlogDrawerBackdrop.classList.remove("hidden");
  devlogDrawerBackdrop.classList.add("is-visible");
  devlogDrawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("drawer-open");
}

function closeDevlogDrawer() {
  devlogDrawer.classList.remove("is-open");
  devlogDrawer.setAttribute("aria-hidden", "true");
  devlogDrawerBackdrop.classList.remove("is-visible");
  devlogDrawerBackdrop.classList.add("hidden");
  document.body.classList.remove("drawer-open");
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

function showToast(message, variant = "info") {
  if (!toastContainer || !message) {
    return;
  }

  const fingerprint = `${variant}:${message}`;
  const now = Date.now();
  if (fingerprint === lastToastFingerprint && now - lastToastAt < 1800) {
    return;
  }

  lastToastFingerprint = fingerprint;
  lastToastAt = now;

  const toast = document.createElement("div");
  toast.className = `toast toast-${variant}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add("toast-exit");
    window.setTimeout(() => toast.remove(), 220);
  }, 2600);
}

function updateStatus() {
  const displaySessionId = currentSessionId || EMPTY_SESSION_TEXT;
  sessionIdDisplay.textContent = displaySessionId;
  statusSession.textContent = `session_id = ${displaySessionId}`;
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

function normalizeDevlogItem(item) {
  return {
    id: Number(item?.id),
    sessionId: String(item?.session_id ?? item?.sessionId ?? "").trim(),
    content: String(item?.content ?? "").trim(),
    createdAt: String(item?.created_at ?? item?.createdAt ?? "").trim(),
  };
}

function formatDevlogDateParts(createdAt) {
  const date = createdAt ? new Date(createdAt) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return {
      key: "Unknown date",
      label: "Unknown date",
      dayNumber: "--",
      weekday: "",
    };
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return {
    key: `${year}-${month}-${day}`,
    label: `${year}-${month}-${day}`,
    dayNumber: String(date.getDate()),
    weekday: new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(date),
  };
}

function buildMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonthKey(monthKey) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(monthKey || ""));
  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    monthIndex: Number(match[2]) - 1,
  };
}

function shiftMonthKey(monthKey, offset) {
  const parsed = parseMonthKey(monthKey);
  const baseDate = parsed ? new Date(parsed.year, parsed.monthIndex, 1) : new Date();
  baseDate.setMonth(baseDate.getMonth() + offset);
  return buildMonthKey(baseDate);
}

function formatCalendarTitle(monthKey) {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) {
    return "Devlog Calendar";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
  }).format(new Date(parsed.year, parsed.monthIndex, 1));
}

function formatDevlogTime(createdAt) {
  const date = createdAt ? new Date(createdAt) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDevlogDetailTitle(dateKey) {
  const parts = String(dateKey || "").split("-");
  if (parts.length !== 3) {
    return "Devlog Detail";
  }

  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(date.getTime())) {
    return "Devlog Detail";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

function renderSessionList(items) {
  sessionListItems = Array.isArray(items)
    ? items.map(normalizeSessionItem).filter((item) => item.sessionId)
    : [];

  if (sessionListItems.length === 0) {
    sessionList.innerHTML = '<div class="empty-box">No sessions yet.</div>';
    return;
  }

  sessionList.innerHTML = sessionListItems
    .map((item) => {
      const isActive = item.sessionId === currentSessionId ? " is-active" : "";
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
    chatList.innerHTML = '<div class="empty-box">No chat history for this session yet.</div>';
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
    referenceBox.innerHTML = '<div class="empty-box">No references for the latest response.</div>';
    return;
  }

  const html = tagList.map((tag) => `<li>${escapeHtml(tag)}</li>`).join("");
  referenceBox.innerHTML = `<ol class="reference-list">${html}</ol>`;
}

function renderDevlogCalendar(items) {
  devlogItems = Array.isArray(items)
    ? items
        .map(normalizeDevlogItem)
        .filter((item) => Number.isFinite(item.id) && item.content)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  if (devlogItems.length === 0) {
    currentDevlogMonthKey = null;
    selectedDevlogDateKey = null;
    devlogCalendarTitle.textContent = "Devlog Calendar";
    devlogCalendar.innerHTML = `<div class="empty-box">${escapeHtml(DEVLOG_EMPTY_TEXT)}</div>`;
    devlogDetail.innerHTML = '<div class="empty-box">点击日历中的日期后，这里会显示当天的详细日志。</div>';
    return;
  }

  const groupMap = new Map();

  for (const item of devlogItems) {
    const dateParts = formatDevlogDateParts(item.createdAt);
    if (!groupMap.has(dateParts.key)) {
      groupMap.set(dateParts.key, []);
    }

    groupMap.get(dateParts.key).push(item);
  }

  const orderedDateKeys = [...groupMap.keys()].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  const latestDateKey = orderedDateKeys[0];
  const latestDate = new Date(latestDateKey);

  if (!currentDevlogMonthKey) {
    currentDevlogMonthKey = buildMonthKey(latestDate);
  }

  if (!selectedDevlogDateKey || !groupMap.has(selectedDevlogDateKey)) {
    selectedDevlogDateKey = latestDateKey;
  }

  renderDevlogMonth(groupMap);
  renderDevlogDetail(groupMap);
}

function renderDevlogMonth(groupMap) {
  const fallbackDate = new Date();
  const parsed = parseMonthKey(currentDevlogMonthKey) || {
    year: fallbackDate.getFullYear(),
    monthIndex: fallbackDate.getMonth(),
  };
  const firstDay = new Date(parsed.year, parsed.monthIndex, 1);
  const lastDay = new Date(parsed.year, parsed.monthIndex + 1, 0);
  const totalDays = lastDay.getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;
  const monthKey = buildMonthKey(firstDay);

  currentDevlogMonthKey = monthKey;
  devlogCalendarTitle.textContent = formatCalendarTitle(monthKey);

  const cells = [];

  for (let index = 0; index < startOffset; index += 1) {
    cells.push('<div class="devlog-date-cell is-empty" aria-hidden="true"></div>');
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const dateKey = `${monthKey}-${String(day).padStart(2, "0")}`;
    const items = groupMap.get(dateKey) || [];
    const isSelected = dateKey === selectedDevlogDateKey;
    const hasEntries = items.length > 0;
    const cellClassNames = [
      "devlog-date-cell",
      hasEntries ? "has-entry" : "",
      isSelected ? "is-selected" : "",
    ]
      .filter(Boolean)
      .join(" ");

    cells.push(`
      <button
        class="${cellClassNames}"
        type="button"
        data-devlog-date="${dateKey}"
        aria-pressed="${isSelected ? "true" : "false"}"
      >
        <span class="devlog-date-number">${day}</span>
        <span class="devlog-date-count">${hasEntries ? `${items.length}条` : ""}</span>
      </button>
    `);
  }

  devlogCalendar.innerHTML = cells.join("");
}

function renderDevlogDetail(groupMap) {
  const selectedItems = selectedDevlogDateKey ? groupMap.get(selectedDevlogDateKey) || [] : [];

  if (!selectedDevlogDateKey) {
    devlogDetail.innerHTML = '<div class="empty-box">点击日历中的日期后，这里会显示当天的详细日志。</div>';
    return;
  }

  if (selectedItems.length === 0) {
    devlogDetail.innerHTML = `
      <section class="devlog-detail-card">
        <div class="devlog-detail-header">
          <div>
            <div class="devlog-detail-title">${escapeHtml(formatDevlogDetailTitle(selectedDevlogDateKey))}</div>
            <div class="devlog-detail-subtitle">这一天还没有日志。</div>
          </div>
        </div>
        <div class="empty-box">选中的日期暂无记录。</div>
      </section>
    `;
    return;
  }

  const itemsHtml = selectedItems
    .map(
      (item) => `
        <article class="devlog-entry" data-devlog-id="${item.id}">
          <div class="devlog-entry-meta">
            <span class="devlog-entry-time">${escapeHtml(formatDevlogTime(item.createdAt))}</span>
            <button class="devlog-delete" type="button" data-devlog-id="${item.id}" aria-label="Delete devlog">Delete</button>
          </div>
          <div class="devlog-entry-content">${escapeHtml(item.content)}</div>
        </article>
      `,
    )
    .join("");

  devlogDetail.innerHTML = `
    <section class="devlog-detail-card">
      <div class="devlog-detail-header">
        <div>
          <div class="devlog-detail-title">${escapeHtml(formatDevlogDetailTitle(selectedDevlogDateKey))}</div>
          <div class="devlog-detail-subtitle">共 ${selectedItems.length} 条记录</div>
        </div>
      </div>
      <div class="devlog-entry-list">
        ${itemsHtml}
      </div>
    </section>
  `;
}

function resetChatView() {
  renderChatHistory([]);
  renderReferences([]);
  questionInput.value = "";
  uploadInput.value = "";
}

function renderLoggedOutState() {
  renderSessionList([]);
  renderDevlogCalendar([]);
  resetChatView();
  clearError();
  statusText.textContent = "Idle";
  noticeBox.textContent = LOGGED_OUT_NOTICE;
}

function ensureAuthenticated() {
  if (hasAccessToken()) {
    return true;
  }

  clearError();
  showError("Please login before using chat or devlog.");
  noticeBox.textContent = LOGGED_OUT_NOTICE;
  return false;
}

function validateForm() {
  const question = questionInput.value.trim();
  const files = Array.from(uploadInput.files || []);
  const allowedExtensions = [".txt", ".pdf"];

  if (!ensureAuthenticated()) {
    return "Please login before sending a chat request.";
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

function validateDevlogContent() {
  if (!ensureAuthenticated()) {
    return "Please login before saving a devlog.";
  }

  if (!devlogContentInput.value.trim()) {
    return "Please enter devlog content.";
  }

  return null;
}

async function requestSessionId() {
  const response = await fetch(`${API_BASE_URL}/sessionID`, {
    method: "POST",
    headers: buildAuthHeaders(),
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.detail || "Failed to create session ID.");
  }

  const nextSessionId = String(result ?? "").trim();
  if (!nextSessionId) {
    throw new Error("Backend returned an empty session ID.");
  }

  return nextSessionId;
}

async function ensureCurrentSessionId() {
  if (currentSessionId) {
    return currentSessionId;
  }

  const nextSessionId = await requestSessionId();
  setCurrentSessionId(nextSessionId);
  return nextSessionId;
}

async function loadSessionList() {
  if (!ensureAuthenticated()) {
    renderLoggedOutState();
    return;
  }

  clearError();
  setLoading(true, "Loading session list...");

  try {
    const response = await fetch(`${API_BASE_URL}/chat/session`, {
      headers: buildAuthHeaders(),
    });
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

async function loadDevlogs(options = {}) {
  const { silent = false } = options;

  if (!ensureAuthenticated()) {
    renderLoggedOutState();
    return;
  }

  if (!silent) {
    clearError();
    setLoading(true, "Loading devlog...");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/getDevlog`, {
      headers: buildAuthHeaders(),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.detail || "Failed to load devlog.");
    }

    renderDevlogCalendar(result || []);
    statusText.textContent = "Success";
    if (!silent) {
      noticeBox.textContent = "Devlog refreshed.";
    }
  } catch (error) {
    statusText.textContent = "Error";
    if (!silent) {
      noticeBox.textContent = "Failed to load devlog.";
    }
    showError(error.message || "Unknown error while loading devlog.");
  } finally {
    if (!silent) {
      setControlsDisabled(false);
    }
  }
}

async function selectSession(nextSessionId) {
  if (!nextSessionId || !ensureAuthenticated()) {
    return;
  }

  setCurrentSessionId(nextSessionId);
  renderSessionList(sessionListItems);
  await loadChatHistory();
}

async function loadChatHistory() {
  if (!ensureAuthenticated()) {
    renderLoggedOutState();
    return;
  }

  if (!currentSessionId) {
    clearError();
    renderSessionList(sessionListItems);
    showError("No active session selected.");
    return;
  }

  clearError();
  updateStatus();
  setLoading(true, "Loading chat history...");

  try {
    const response = await fetch(`${API_BASE_URL}/chat/history/${encodeURIComponent(currentSessionId)}`, {
      headers: buildAuthHeaders(),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || "Failed to load chat history.");
    }

    renderChatHistory(result);
    renderReferences([]);
    renderSessionList(sessionListItems);
    statusText.textContent = "Success";
    noticeBox.textContent = `Loaded history for session_id = ${currentSessionId}.`;
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

  setLoading(true);

  try {
    await ensureCurrentSessionId();

    const formData = new FormData();
    formData.append("question", questionInput.value.trim());
    formData.append("session_id", currentSessionId);
    formData.append("model_flag", modelFlagSelect.value);
    formData.append("top_k", topKSelect.value);

    for (const file of uploadInput.files) {
      formData.append("upload_file", file);
    }

    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: buildAuthHeaders(),
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

async function handleCreateDevlog() {
  clearError();
  updateStatus();

  const validationError = validateDevlogContent();
  if (validationError) {
    showError(validationError);
    return;
  }

  setLoading(true, "Saving devlog...");

  try {
    const sessionId = await ensureCurrentSessionId();
    const params = new URLSearchParams({
      session_id: sessionId,
      content: devlogContentInput.value.trim(),
    });

    const response = await fetch(`${API_BASE_URL}/context?${params.toString()}`, {
      method: "POST",
      headers: buildAuthHeaders(),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.detail || "Failed to save devlog.");
    }

    await loadDevlogs({ silent: true });
    await loadSessionList();
    devlogContentInput.value = "";
    statusText.textContent = "Success";
    noticeBox.textContent = "Devlog saved.";
    showToast("日志已新增", "success");
  } catch (error) {
    statusText.textContent = "Error";
    noticeBox.textContent = "Failed to save devlog.";
    showError(error.message || "Unknown error while saving devlog.");
  } finally {
    setControlsDisabled(false);
  }
}

async function handleDeleteDevlog(devlogId) {
  if (!Number.isFinite(devlogId) || !ensureAuthenticated()) {
    return;
  }

  const confirmed = window.confirm("Delete this devlog entry?");
  if (!confirmed) {
    return;
  }

  clearError();
  setLoading(true, "Deleting devlog...");

  try {
    const response = await fetch(`${API_BASE_URL}/deleteDevlog/${encodeURIComponent(devlogId)}`, {
      method: "DELETE",
      headers: buildAuthHeaders(),
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result?.detail || "Delete failed.");
    }

    await loadDevlogs({ silent: true });
    statusText.textContent = "Success";
    noticeBox.textContent = "Devlog deleted.";
    showToast("日志已删除", "success");
  } catch (error) {
    statusText.textContent = "Error";
    noticeBox.textContent = "Failed to delete devlog.";
    showError(error.message || "Unknown error while deleting devlog.");
  } finally {
    setControlsDisabled(false);
  }
}

async function handleClearSession() {
  if (!ensureAuthenticated()) {
    renderLoggedOutState();
    return;
  }

  if (!currentSessionId) {
    clearError();
    showError("No active session to delete.");
    return;
  }

  clearError();
  updateStatus();

  const confirmed = window.confirm(`Delete chat history and vector store for session_id = ${currentSessionId}?`);
  if (!confirmed) {
    return;
  }

  setLoading(true, "Clearing current session...");

  try {
    const response = await fetch(`${API_BASE_URL}/chat/history/${encodeURIComponent(currentSessionId)}`, {
      method: "DELETE",
      headers: buildAuthHeaders(),
    });

    const result = await response.json();

    if (!response.ok || result.deleted !== true) {
      throw new Error(result.detail || "Delete failed.");
    }

    setCurrentSessionId(null);
    resetChatView();
    renderSessionList(sessionListItems);
    await loadSessionList();
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
  if (!targetSessionId || !ensureAuthenticated()) {
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
      headers: buildAuthHeaders(),
    });

    const result = await response.json();

    if (!response.ok || result.deleted !== true) {
      throw new Error(result.detail || "Delete failed.");
    }

    if (targetSessionId === currentSessionId) {
      setCurrentSessionId(null);
      resetChatView();
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
  if (!ensureAuthenticated()) {
    renderLoggedOutState();
    return;
  }

  clearError();
  setCurrentSessionId(null);
  resetChatView();
  renderSessionList(sessionListItems);
  statusText.textContent = "Idle";
  noticeBox.textContent = "Started a new session draft.";
}

function stopWebSocketHeartbeat() {
  if (websocketPingTimer) {
    window.clearInterval(websocketPingTimer);
    websocketPingTimer = null;
  }
}

function disconnectWebSocket() {
  stopWebSocketHeartbeat();

  if (websocketReconnectTimer) {
    window.clearTimeout(websocketReconnectTimer);
    websocketReconnectTimer = null;
  }

  if (websocket) {
    websocket.onopen = null;
    websocket.onmessage = null;
    websocket.onclose = null;
    websocket.onerror = null;
    websocket.close();
    websocket = null;
  }
}

function connectWebSocket() {
  if (!hasAccessToken() || websocket) {
    return;
  }

  websocket = new WebSocket(WS_BASE_URL);

  websocket.onopen = () => {
    try {
      websocket.send("client-connected");
    } catch (error) {
      console.warn("Failed to send websocket hello.", error);
    }

    websocketPingTimer = window.setInterval(() => {
      if (websocket?.readyState === WebSocket.OPEN) {
        websocket.send("ping");
      }
    }, 25000);
  };

  websocket.onmessage = async (event) => {
    const message = String(event.data ?? "").trim();
    if (!message) {
      return;
    }

    noticeBox.textContent = message;

    if (message.includes("日志")) {
      await loadDevlogs({ silent: true });
      return;
    }

    showToast(message, "info");
  };

  websocket.onclose = () => {
    websocket = null;
    stopWebSocketHeartbeat();

    if (!hasAccessToken()) {
      return;
    }

    websocketReconnectTimer = window.setTimeout(() => {
      websocketReconnectTimer = null;
      connectWebSocket();
    }, 1500);
  };

  websocket.onerror = () => {
    if (websocket?.readyState === WebSocket.OPEN) {
      websocket.close();
    }
  };
}

function handleLogout() {
  closeDevlogDrawer();
  disconnectWebSocket();
  clearStoredAccessToken();
  setCurrentSessionId(null);
  window.location.href = LOGIN_PAGE_URL;
}

chatForm.addEventListener("submit", handleSubmit);
clearButton.addEventListener("click", handleClearSession);
loadHistoryButton.addEventListener("click", loadChatHistory);
newSessionButton.addEventListener("click", handleNewSession);
refreshSessionButton.addEventListener("click", loadSessionList);
refreshDevlogButton.addEventListener("click", () => loadDevlogs());
saveDevlogButton.addEventListener("click", handleCreateDevlog);
openDevlogButton.addEventListener("click", openDevlogDrawer);
closeDevlogButton.addEventListener("click", closeDevlogDrawer);
devlogDrawerBackdrop.addEventListener("click", closeDevlogDrawer);
logoutButton.addEventListener("click", handleLogout);

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

devlogCalendar.addEventListener("click", (event) => {
  const dateButton = event.target.closest("[data-devlog-date]");
  if (dateButton) {
    selectedDevlogDateKey = dateButton.dataset.devlogDate || null;
    renderDevlogCalendar(devlogItems);
    return;
  }

  const deleteButton = event.target.closest(".devlog-delete");
  if (!deleteButton) {
    return;
  }

  const devlogId = Number(deleteButton.dataset.devlogId);
  handleDeleteDevlog(devlogId);
});

devlogDetail.addEventListener("click", (event) => {
  const deleteButton = event.target.closest(".devlog-delete");
  if (!deleteButton) {
    return;
  }

  const devlogId = Number(deleteButton.dataset.devlogId);
  handleDeleteDevlog(devlogId);
});

devlogPrevMonthButton.addEventListener("click", () => {
  currentDevlogMonthKey = shiftMonthKey(currentDevlogMonthKey, -1);
  renderDevlogCalendar(devlogItems);
});

devlogNextMonthButton.addEventListener("click", () => {
  currentDevlogMonthKey = shiftMonthKey(currentDevlogMonthKey, 1);
  renderDevlogCalendar(devlogItems);
});

modelFlagSelect.addEventListener("change", updateStatus);
topKSelect.addEventListener("change", updateStatus);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && devlogDrawer.classList.contains("is-open")) {
    closeDevlogDrawer();
  }
});

updateStatus();
renderReferences([]);
renderDevlogCalendar([]);

if (hasAccessToken()) {
  connectWebSocket();
  loadSessionList();
  loadDevlogs({ silent: true });
} else {
  renderLoggedOutState();
}
