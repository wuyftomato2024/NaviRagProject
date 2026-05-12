const API_BASE_URL = "http://127.0.0.1:8000";
const ACCESS_TOKEN_KEY = "navichat_access_token";
const CHAT_PAGE_URL = "./chat.html";
const LOGIN_PAGE_URL = "./index.html";

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const noticeBox = document.getElementById("auth-notice");
const errorBox = document.getElementById("auth-error");

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

function clearError() {
  errorBox.textContent = "";
  errorBox.classList.add("hidden");
}

function setNotice(message) {
  noticeBox.textContent = message;
}

function setFormDisabled(form, disabled) {
  const controls = form.querySelectorAll("input, button");
  for (const control of controls) {
    control.disabled = disabled;
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  clearError();

  const form = event.currentTarget;
  const userName = form.querySelector('[name="user_name"]').value.trim();
  const password = form.querySelector('[name="password"]').value;

  if (!userName || !password) {
    showError("Please enter both username and password.");
    return;
  }

  setFormDisabled(form, true);
  setNotice("Logging in...");

  try {
    const formData = new FormData();
    formData.append("user_name", userName);
    formData.append("password", password);

    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      body: formData,
    });
    const result = await response.json();

    if (!response.ok || !result?.access_token) {
      throw new Error(result?.detail || "Login failed.");
    }

    window.localStorage.setItem(ACCESS_TOKEN_KEY, result.access_token);
    setNotice("Login succeeded. Redirecting to chat...");
    form.reset();
    window.setTimeout(() => {
      window.location.href = CHAT_PAGE_URL;
    }, 500);
  } catch (error) {
    setNotice("Please check your username and password.");
    showError(error.message || "Login failed.");
  } finally {
    setFormDisabled(form, false);
  }
}

async function handleRegisterSubmit(event) {
  event.preventDefault();
  clearError();

  const form = event.currentTarget;
  const userName = form.querySelector('[name="user_name"]').value.trim();
  const password = form.querySelector('[name="password"]').value;

  if (!userName || !password) {
    showError("Please enter both username and password.");
    return;
  }

  setFormDisabled(form, true);
  setNotice("Creating account...");

  try {
    const formData = new FormData();
    formData.append("user_name", userName);
    formData.append("password", password);

    const response = await fetch(`${API_BASE_URL}/register`, {
      method: "POST",
      body: formData,
    });
    const result = await response.json();

    if (!response.ok || result?.status !== "ok") {
      throw new Error(result?.detail || "Register failed.");
    }

    setNotice("Account created. Redirecting to login...");
    form.reset();
    window.setTimeout(() => {
      window.location.href = LOGIN_PAGE_URL;
    }, 700);
  } catch (error) {
    setNotice("Registration was not successful.");
    showError(error.message || "Register failed.");
  } finally {
    setFormDisabled(form, false);
  }
}

if (loginForm && window.localStorage.getItem(ACCESS_TOKEN_KEY)) {
  window.location.href = CHAT_PAGE_URL;
}

if (loginForm) {
  loginForm.addEventListener("submit", handleLoginSubmit);
}

if (registerForm) {
  registerForm.addEventListener("submit", handleRegisterSubmit);
}
