const USERS_KEY = "attendance360Users";
const SESSION_KEY = "attendance360CurrentUser";
const AUTH_PREFILL_KEY = "attendance360AuthPrefill";

let API_BASE = "";
if (window.location.protocol === "file:" || ((window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") && window.location.port !== "3000")) {
  API_BASE = "http://localhost:3000";
}

const roleButtons = document.querySelectorAll(".role-btn");
const toggleButtons = document.querySelectorAll(".toggle-btn");
const switchButtons = document.querySelectorAll("[data-switch]");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authMessage = document.getElementById("authMessage");
const selectedRoleLabel = document.getElementById("selectedRoleLabel");

const loginTitle = document.getElementById("loginTitle");
const loginSubtitle = document.getElementById("loginSubtitle");
const loginIdentityLabel = document.getElementById("loginIdentityLabel");
const loginIdentity = document.getElementById("loginIdentity");
const loginPassword = document.getElementById("loginPassword");
const loginSubmit = document.getElementById("loginSubmit");
const forgotPasswordToggle = document.getElementById("forgotPasswordToggle");
const forgotPasswordPanel = document.getElementById("forgotPasswordPanel");
const forgotPasswordHelp = document.getElementById("forgotPasswordHelp");
const forgotNewPassword = document.getElementById("forgotNewPassword");
const forgotConfirmPassword = document.getElementById("forgotConfirmPassword");
const forgotPasswordSubmit = document.getElementById("forgotPasswordSubmit");
const forgotPasswordCancel = document.getElementById("forgotPasswordCancel");

const registerTitle = document.getElementById("registerTitle");
const registerSubtitle = document.getElementById("registerSubtitle");
const registerSubmit = document.getElementById("registerSubmit");
const registerInputs = [
  document.getElementById("firstName"),
  document.getElementById("lastName"),
  document.getElementById("registerEmail"),
  document.getElementById("registerUsername"),
  document.getElementById("registerPhone"),
  document.getElementById("registerPassword"),
  document.getElementById("confirmPassword")
];

const roleConfig = {
  teacher: {
    label: "Teacher",
    idPrefix: "TCH",
    destination: "../Teacher/index.html"
  },
  student: {
    label: "Student",
    idPrefix: "STD",
    destination: "../Student/index.html"
  }
};

let selectedRole = "";
let currentMode = "login";
let forgotPasswordOpen = false;

function setMessage(text, type = "") {
  authMessage.textContent = text;
  authMessage.className = `message${type ? ` ${type}` : ""}`;
}

function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function setForgotPasswordOpen(isOpen) {
  forgotPasswordOpen = isOpen;
  forgotPasswordPanel.classList.toggle("hidden", !isOpen);
  if (!isOpen) {
    forgotNewPassword.value = "";
    forgotConfirmPassword.value = "";
  }
}

function updateForgotPasswordCopy(role) {
  const config = roleConfig[role];
  if (!config || !forgotPasswordHelp) return;
  forgotPasswordHelp.textContent = `Enter your ${config.label.toLowerCase()} username, ${config.label.toLowerCase()} ID, or email above, then set a new password.`;
}

function setRole(role) {
  selectedRole = role;
  const config = roleConfig[role];

  roleButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.role === role);
  });

  selectedRoleLabel.textContent = `${config.label} selected`;
  loginTitle.textContent = `${config.label} Login`;
  loginSubtitle.textContent = `Enter your username, ${config.label.toLowerCase()} ID, or email and password to continue.`;
  loginIdentityLabel.textContent = `Username, ${config.label} ID or Email`;
  loginIdentity.placeholder = `Enter username, ${config.idPrefix.toLowerCase()} ID, or email`;
  loginIdentity.disabled = false;
  loginPassword.disabled = false;
  loginSubmit.disabled = false;
  forgotPasswordToggle.classList.remove("hidden");
  forgotNewPassword.disabled = false;
  forgotConfirmPassword.disabled = false;
  forgotPasswordSubmit.disabled = false;
  updateForgotPasswordCopy(role);

  registerTitle.textContent = `Register as ${config.label}`;
  registerSubtitle.textContent = `Fill in your details to create a new ${config.label.toLowerCase()} account.`;
  registerInputs.forEach((input) => {
    input.disabled = false;
  });
  registerSubmit.disabled = false;

  setMessage(`Ready for ${config.label.toLowerCase()} ${currentMode}.`);
}

function setMode(mode) {
  currentMode = mode;
  toggleButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });
  loginForm.classList.toggle("active", mode === "login");
  registerForm.classList.toggle("active", mode === "register");
  if (mode !== "login") setForgotPasswordOpen(false);

  if (!selectedRole) {
    setMessage("Choose Teacher or Student first.");
    return;
  }

  setMessage(`Continue with ${roleConfig[selectedRole].label.toLowerCase()} ${mode}.`);
}

function generateUserId(role) {
  const prefix = roleConfig[role].idPrefix;
  const stamp = Date.now().toString().slice(-6);
  return `${prefix}${stamp}`;
}

function persistSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function goToPortal(role) {
  window.location.href = roleConfig[role].destination;
}

roleButtons.forEach((button) => {
  button.addEventListener("click", () => setRole(button.dataset.role));
});

toggleButtons.forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

switchButtons.forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.switch));
});

if (forgotPasswordToggle) {
  forgotPasswordToggle.addEventListener("click", () => {
    if (!selectedRole) {
      setMessage("Choose Teacher or Student first.", "error");
      return;
    }
    setForgotPasswordOpen(!forgotPasswordOpen);
    if (forgotPasswordOpen) {
      updateForgotPasswordCopy(selectedRole);
      setMessage(`Enter your ${roleConfig[selectedRole].label.toLowerCase()} username, email, or ID and choose a new password.`);
    } else {
      setMessage(`Continue with ${roleConfig[selectedRole].label.toLowerCase()} login.`);
    }
  });
}

if (forgotPasswordCancel) {
  forgotPasswordCancel.addEventListener("click", () => {
    setForgotPasswordOpen(false);
    if (selectedRole) {
      setMessage(`Continue with ${roleConfig[selectedRole].label.toLowerCase()} login.`);
    }
  });
}

if (forgotPasswordSubmit) {
  forgotPasswordSubmit.addEventListener("click", () => {
    if (!selectedRole) {
      setMessage("Choose Teacher or Student first.", "error");
      return;
    }

    const identity = loginIdentity.value.trim().toLowerCase();
    const newPassword = forgotNewPassword.value;
    const confirmNewPassword = forgotConfirmPassword.value;

    if (!identity || !newPassword || !confirmNewPassword) {
      setMessage("Enter your identity, new password, and confirm password.", "error");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setMessage("New password and confirm password do not match.", "error");
      return;
    }

    const users = getUsers();
    const userIndex = users.findIndex((entry) => {
      const email = (entry.email || "").toLowerCase();
      const userId = (entry.userId || "").toLowerCase();
      const username = (entry.username || "").toLowerCase();
      return entry.role === selectedRole && (email === identity || userId === identity || username === identity);
    });

    if (userIndex === -1) {
      setMessage(`${roleConfig[selectedRole].label} account not found for that username, email, or ID.`, "error");
      return;
    }

    users[userIndex].password = newPassword;
    saveUsers(users);
    loginPassword.value = "";
    setForgotPasswordOpen(false);
    setMessage("Password changed successfully. You can now log in with the new password.", "success");
  });
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!selectedRole) {
    setMessage("Choose Teacher or Student before logging in.", "error");
    return;
  }

  const identity = loginIdentity.value.trim().toLowerCase();
  const password = loginPassword.value;

  try {
    const response = await fetch(API_BASE + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity, password, role: selectedRole })
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || "Login failed.", "error");
      return;
    }

    // Save token and user info
    localStorage.setItem('attendance360Token', data.token);
    persistSession(data.user);
    
    setMessage(`Login successful. Redirecting to ${roleConfig[selectedRole].label} portal...`, "success");
    setTimeout(() => goToPortal(selectedRole), 700);

  } catch (err) {
    console.error("Login fetch error:", err);
    setMessage("Network error: " + (err.message || "Please try again later."), "error");
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!selectedRole) {
    setMessage("Choose Teacher or Student before registering.", "error");
    return;
  }

  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const username = document.getElementById("registerUsername").value.trim();
  const phone = document.getElementById("registerPhone").value.trim();
  const password = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (!firstName || !lastName || !email || !username || !phone || !password || !confirmPassword) {
    setMessage("Fill in all registration fields.", "error");
    return;
  }

  if (password !== confirmPassword) {
    setMessage("Password and confirm password do not match.", "error");
    return;
  }

  const payload = {
    role: selectedRole,
    firstName,
    lastName,
    email,
    username,
    phone,
    password,
    userId: generateUserId(selectedRole)
  };

  try {
    const response = await fetch(API_BASE + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
        setMessage(data.error || "Registration failed.", "error");
        return;
    }

    clearSession();
    registerForm.reset();
    setMode("login");
    loginIdentity.value = username;
    loginPassword.value = "";

    setMessage(`Registration successful. Your ${roleConfig[selectedRole].label.toLowerCase()} ID is ${data.userId}. Please log in.`, "success");
  } catch (err) {
    console.error("Register fetch error:", err);
    setMessage("Network error: " + (err.message || "Please try again later."), "error");
  }
});

function applyPrefillFromStorage() {
  try {
    const raw = localStorage.getItem(AUTH_PREFILL_KEY);
    if (!raw) {
      setMessage("Choose Teacher or Student first.");
      return;
    }
    const prefill = JSON.parse(raw);
    localStorage.removeItem(AUTH_PREFILL_KEY);
    if (prefill.role && roleConfig[prefill.role]) setRole(prefill.role);
    if (prefill.mode === "register" || prefill.mode === "login") setMode(prefill.mode);
    if (prefill.forgot && prefill.role && forgotPasswordToggle) {
      setForgotPasswordOpen(true);
      updateForgotPasswordCopy(prefill.role);
      setMessage(`Enter your ${roleConfig[prefill.role].label.toLowerCase()} username, email, or ID and choose a new password.`);
    }
  } catch (error) {
    console.warn("Failed to apply auth prefill", error);
    setMessage("Choose Teacher or Student first.");
  }
}

applyPrefillFromStorage();
