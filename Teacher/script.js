/* ============================================================
   Attendance360 — Teacher Portal Script
   ============================================================ */

/* ─── Theme (runs immediately to prevent flash of wrong theme) ─ */
(function() {
  const saved = localStorage.getItem("attendance360Theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
})();

const STORAGE_KEY = "attendance360-shared-data";
const USERS_KEY = "attendance360Users";
const SESSION_KEY = "attendance360CurrentUser";
const TOKEN_KEY = "attendance360Token";
const TEACHER_NOTIFICATION_STATE_KEY = "attendance360TeacherNotificationState";

let API_BASE = "";
// When running from file:// or local dev port != 3000, point to deployed API
if (
  window.location.protocol === "file:" ||
  ((window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") &&
    window.location.port !== "3000")
) {
  API_BASE = "https://classroom-seven-beta.vercel.app";
}

/* ─── State ─────────────────────────────────────────────────── */
let classes = [];
let shared = [];
let attendanceRecords = [];
let directShares = [];
let conversations = [];
let notifications = [];
let feedbackForms = [];

let currentUser = getCurrentUser();
let activeStudentContext = null;

/* ─── Cached DOM refs ────────────────────────────────────────── */
const studentSearchInput     = document.getElementById("studentSearch");
const attendanceDateInput    = document.getElementById("attendanceDate");
const attendanceSearchInput  = document.getElementById("attendanceSearch");
const studentListEl          = document.getElementById("studentList");
const fileListEl             = document.getElementById("fileList");
const fileUpload             = document.getElementById("fileUpload");
const personalShareUpload    = document.getElementById("personalShareUpload");
const sendFeedbackFormsButton= document.getElementById("sendFeedbackForms");
const feedbackClassSelect    = document.getElementById("feedbackClass");
const teacherNotificationToggle  = document.getElementById("teacherNotificationToggle");
const teacherNotificationBadge   = document.getElementById("teacherNotificationBadge");
const teacherNotificationPanel   = document.getElementById("teacherNotificationPanel");
const teacherNotificationList    = document.getElementById("teacherNotificationList");
const teacherNotificationStatus  = document.getElementById("teacherNotificationStatus");
const teacherNotificationIcon    = document.querySelector("#teacherNotificationToggle .notification-icon");
const teacherNotificationStatusInline = document.getElementById("teacherNotificationStatusInline");

const profileToggle          = document.getElementById("profileToggle");
const profileDropdown        = document.getElementById("profileDropdown");
const openEditProfileButton  = document.getElementById("openEditProfile");
const openTeacherPasswordPage= document.getElementById("openTeacherPasswordPage");
const logoutButton           = document.getElementById("logoutButton");
const editProfileModal       = document.getElementById("editProfileModal");
const closeEditProfileButton = document.getElementById("closeEditProfile");
const cancelEditProfileButton= document.getElementById("cancelEditProfile");
const saveProfileButton      = document.getElementById("saveProfileButton");

const studentConnectModal    = document.getElementById("studentConnectModal");
const closeStudentConnect    = document.getElementById("closeStudentConnect");
const connectStudentName     = document.getElementById("connectStudentName");
const connectStudentMeta     = document.getElementById("connectStudentMeta");
const teacherChatThread      = document.getElementById("teacherChatThread");
const teacherChatMessage     = document.getElementById("teacherChatMessage");
const sendTeacherMessage     = document.getElementById("sendTeacherMessage");
const callStudentButton      = document.getElementById("callStudentButton");
const personalShareTitle     = document.getElementById("personalShareTitle");
const personalShareType      = document.getElementById("personalShareType");
const personalShareMarks     = document.getElementById("personalShareMarks");
const personalShareNotes     = document.getElementById("personalShareNotes");
const sharePersonalUpdate    = document.getElementById("sharePersonalUpdate");
const personalSharePicked    = document.getElementById("personalSharePicked");
const teacherStudentResources= document.getElementById("teacherStudentResources");
const studentResourceCount   = document.getElementById("studentResourceCount");

/* ─── Helpers ────────────────────────────────────────────────── */
function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
  catch { return null; }
}
function getToken() { return localStorage.getItem(TOKEN_KEY) || ""; }
function persistCurrentUser(u) { localStorage.setItem(SESSION_KEY, JSON.stringify(u)); }

function getDisplayName(user) {
  const full = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
  return full || user?.username || "Teacher";
}

/* ─── Toast (colored + longer) ───────────────────────────────── */
function toast(msg, type = "default") {
  const colors = {
    success: { bg: "rgba(22,163,74,0.95)", border: "rgba(74,222,128,0.4)" },
    error:   { bg: "rgba(220,38,38,0.95)", border: "rgba(248,113,113,0.4)" },
    default: { bg: "rgba(15,24,40,0.95)",  border: "rgba(255,255,255,0.12)" }
  };
  const c = colors[type] || colors.default;
  const note = document.createElement("div");
  note.textContent = msg;
  note.className = "toast";
  Object.assign(note.style, {
    position: "fixed", bottom: "24px", right: "24px",
    padding: "12px 18px", background: c.bg, color: "#f0f5ff",
    border: `1px solid ${c.border}`, borderRadius: "12px",
    boxShadow: "0 12px 40px rgba(0,0,0,0.5)", zIndex: "90",
    maxWidth: "340px", fontSize: "0.9rem", lineHeight: "1.4",
    animation: "slideInToast 0.3s ease"
  });
  document.body.appendChild(note);
  setTimeout(() => {
    note.style.opacity = "0";
    note.style.transition = "opacity 0.3s";
    setTimeout(() => note.remove(), 300);
  }, 3500);
}

function showSpinner(show = true) {
  let el = document.getElementById("globalSpinner");
  if (!el) {
    el = document.createElement("div");
    el.id = "globalSpinner";
    el.innerHTML = '<div class="spinner-inner"></div>';
    Object.assign(el.style, {
      position: "fixed", top: 0, left: 0, right: 0, height: "3px",
      zIndex: "999", display: "none"
    });
    document.body.prepend(el);
  }
  el.style.display = show ? "block" : "none";
}

function formatTimestamp(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit"
  });
}
function formatAttendanceDate(value) {
  if (!value) return "No date";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });
}

/* ─── Shared Data (localStorage fallback) ───────────────────── */
function loadLocalData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        directShares:  Array.isArray(p.directShares)  ? p.directShares  : [],
        conversations: Array.isArray(p.conversations)  ? p.conversations : [],
        notifications: Array.isArray(p.notifications)  ? p.notifications : [],
        feedbackForms: Array.isArray(p.feedbackForms)  ? p.feedbackForms : []
      };
    }
  } catch {}
  return { directShares: [], conversations: [], notifications: [], feedbackForms: [] };
}

function persistLocalData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    classes, shared, attendanceRecords, directShares,
    conversations, notifications, feedbackForms
  }));
}

/* ─── Navigation ─────────────────────────────────────────────── */
function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll("nav a").forEach(a => a.classList.remove("active"));
  const section = document.getElementById(id);
  const navLink = document.querySelector(`nav a[data-target="${id}"]`);
  if (section) section.classList.add("active");
  if (navLink) navLink.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
document.querySelectorAll("nav a").forEach(a => {
  a.addEventListener("click", () => { if (a.dataset.target) showSection(a.dataset.target); });
});
document.querySelectorAll("button[data-target]").forEach(btn => {
  btn.addEventListener("click", () => { if (btn.dataset.target) showSection(btn.dataset.target); });
});

/* ─── Apply Profile ──────────────────────────────────────────── */
function applyTeacherProfile(user) {
  if (!user || user.role?.toLowerCase().trim() !== "teacher") {
    window.location.href = "../Login/index.html";
    return;
  }
  const name = getDisplayName(user);
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("teacherRolePill",    `Logged in as ${user.username}`);
  set("teacherWelcome",     `Welcome back, ${name}!`);
  set("teacherIntro",       "Manage classes, share files, record attendance, and connect with students from one dashboard.");
  set("teacherSummary",     `Username: ${user.username} · Teacher ID: ${user.userId}`);
  set("teacherName",        name);
  set("teacherUsernameText",`Username: ${user.username}`);
  set("teacherCredentials", `Teacher ID: ${user.userId} · ${user.email}`);
  set("teacherPhone",       user.phone ? `Phone: ${user.phone}` : "Phone not added");
  set("profileDisplayName", name);
  set("profileUsername",    `@${user.username}`);
  const av = document.getElementById("profileAvatar");
  if (av) av.textContent = (name[0] || "T").toUpperCase();
}

/* ─── Class options refresh ──────────────────────────────────── */
function refreshClassOptions() {
  const selects = [
    document.getElementById("studentClass"),
    document.getElementById("fileClass"),
    document.getElementById("attClass"),
    document.getElementById("feedbackClass")
  ];
  selects.forEach(sel => {
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = "";
    if (sel.id === "fileClass") {
      const ph = document.createElement("option");
      ph.value = ""; ph.textContent = "Select class";
      ph.disabled = true; ph.selected = !prev;
      sel.appendChild(ph);
    }
    classes.forEach(cls => {
      const opt = document.createElement("option");
      opt.value = cls.code;
      opt.textContent = `${cls.name} (${cls.code})`;
      sel.appendChild(opt);
    });
    if (classes.some(c => c.code === prev)) sel.value = prev;
  });
}

function getClassByCode(code) { return classes.find(c => c.code === code); }
function getClassById(id)     { return classes.find(c => c.id === id); }

/* ─── Attendance helpers ─────────────────────────────────────── */
function getAttendanceRecord(classCode, date) {
  return attendanceRecords.find(r => r.classCode === classCode && r.date === date);
}
function getStudentAttendanceEntries(studentId, classCode = "") {
  return attendanceRecords
    .map(record => {
      if (classCode && record.classCode !== classCode) return null;
      const present = record.present?.some(s => s.id === studentId);
      const absent  = record.absent?.some(s => s.id === studentId);
      if (!present && !absent) return null;
      return { classCode: record.classCode, className: record.className, date: record.date, status: present ? "Present" : "Absent" };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}
function getAttendanceStats(entries) {
  const total = entries.length;
  const present = entries.filter(e => e.status === "Present").length;
  return { total, present, absent: total - present, percent: total ? Math.round((present / total) * 100) : 0 };
}

/* ─── Notifications ──────────────────────────────────────────── */
function pushNotification(studentId, title, message, type = "GENERAL") {
  notifications.unshift({
    id: `note-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    studentId, title, message, type, read: false,
    createdAt: new Date().toISOString()
  });
}

function getTeacherNotificationSeenAt() {
  if (!currentUser?.userId) return "";
  try {
    const m = JSON.parse(localStorage.getItem(TEACHER_NOTIFICATION_STATE_KEY) || "{}");
    return m[currentUser.userId] || "";
  } catch { return ""; }
}
function markTeacherNotificationsRead() {
  if (!currentUser?.userId) return;
  try {
    const m = JSON.parse(localStorage.getItem(TEACHER_NOTIFICATION_STATE_KEY) || "{}");
    m[currentUser.userId] = new Date().toISOString();
    localStorage.setItem(TEACHER_NOTIFICATION_STATE_KEY, JSON.stringify(m));
  } catch {}
}
function getTeacherNotificationItems() {
  const feedbackItems = feedbackForms
    .filter(f => f.teacherUserId === currentUser?.userId && f.response?.trim() && f.respondedAt)
    .map(f => ({
      id: `feedback-${f.id}`, type: "feedback", classCode: f.classCode,
      title: `${f.studentName} submitted feedback`,
      message: `${f.className}: ${f.title}`, detail: f.response.trim(), createdAt: f.respondedAt
    }));
  const replyItems = conversations.flatMap(c =>
    (c.messages || [])
      .filter(m => m.senderRole === "student")
      .map((m, i) => ({
        id: `reply-${c.id}-${i}`, type: "reply", classCode: c.classCode,
        title: `${m.senderName} sent a reply`,
        message: `${c.studentName} · ${getClassByCode(c.classCode)?.name || c.classCode}`,
        detail: m.text, createdAt: m.createdAt
      }))
  );
  return [...feedbackItems, ...replyItems]
    .filter(i => i.createdAt)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
function renderTeacherNotifications() {
  if (!teacherNotificationList || !teacherNotificationBadge || !teacherNotificationStatus) return;
  if (teacherNotificationIcon) teacherNotificationIcon.textContent = "🔔";
  const items = getTeacherNotificationItems();
  const seenAt = getTeacherNotificationSeenAt();
  const unread = items.filter(i => !seenAt || new Date(i.createdAt) > new Date(seenAt)).length;
  teacherNotificationBadge.textContent = unread;
  teacherNotificationBadge.classList.toggle("hidden", unread === 0);
  teacherNotificationStatus.textContent = `${unread} unread`;
  if (teacherNotificationStatusInline) teacherNotificationStatusInline.textContent = `${items.length} total updates`;
  teacherNotificationList.innerHTML = "";
  if (!items.length) {
    teacherNotificationList.innerHTML = '<div class="item column"><strong>No notifications yet</strong><p>Student replies and submitted feedback will appear here.</p></div>';
    return;
  }
  items.slice(0, 12).forEach(item => {
    const isUnread = !seenAt || new Date(item.createdAt) > new Date(seenAt);
    const card = document.createElement("div");
    card.className = `notification-card${isUnread ? " unread" : ""}`;
    card.innerHTML = `<strong>${item.title}</strong><p>${item.message}</p><p>${item.detail}</p><p class="muted small">${formatTimestamp(item.createdAt)}</p>`;
    card.addEventListener("click", () => {
      if (item.type === "feedback") { renderFeedbackEligibility(); renderTeacherFeedbackResponses(); showSection("feedback"); }
    });
    teacherNotificationList.appendChild(card);
  });
}
function toggleTeacherNotifications() {
  if (!teacherNotificationPanel || !teacherNotificationToggle) return;
  const willOpen = teacherNotificationPanel.classList.contains("hidden");
  teacherNotificationPanel.classList.toggle("hidden", !willOpen);
  teacherNotificationToggle.setAttribute("aria-expanded", String(willOpen));
  if (willOpen) { markTeacherNotificationsRead(); renderTeacherNotifications(); }
}

/* ─── Render Classes ─────────────────────────────────────────── */
function renderClasses() {
  const list = document.getElementById("classList");
  if (!list) return;
  list.innerHTML = "";
  if (!classes.length) {
    list.innerHTML = '<div class="empty-state">No classes created yet. Add your first class above.</div>';
    refreshClassOptions();
    return;
  }
  classes.forEach(cls => {
    const stats = getAttendanceStats(cls.students.flatMap(s => getStudentAttendanceEntries(s.id, cls.code)));
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div>
        <strong>${cls.name}</strong>
        <p>Code: <code>${cls.code}</code> · ${cls.students.length} student${cls.students.length !== 1 ? "s" : ""} · Avg attendance ${stats.percent}%</p>
      </div>
      <span class="badge">Active</span>`;
    list.appendChild(div);
  });
  refreshClassOptions();
  renderAttendanceWorkspace();
  renderFeedbackEligibility();
  renderQuickStats();
}

function renderQuickStats() {
  const statAtt = document.getElementById("quickStatAttendance");
  const statAss = document.getElementById("quickStatAssignments");
  const classList = document.getElementById("quickStatClasses");

  if (statAtt) {
    let totalEntries = 0;
    let presentEntries = 0;
    classes.forEach(cls => {
      const clsEntries = cls.students.flatMap(s => getStudentAttendanceEntries(s.id, cls.code));
      totalEntries += clsEntries.length;
      presentEntries += clsEntries.filter(e => e.status === "Present").length;
    });
    const percent = totalEntries ? Math.round((presentEntries / totalEntries) * 100) : 0;
    statAtt.textContent = totalEntries ? `${percent}%` : "—";
  }

  if (statAss) {
    statAss.textContent = shared.length > 0 ? shared.length : "0";
  }

  if (classList) {
    if (!classes.length) {
      classList.innerHTML = '<div class="empty-state" style="margin-top:12px;">Classes will appear here once created.</div>';
    } else {
      classList.innerHTML = "";
      // Show up to 3 classes
      classes.slice(0, 3).forEach(cls => {
        const stats = getAttendanceStats(cls.students.flatMap(s => getStudentAttendanceEntries(s.id, cls.code)));
        const div = document.createElement("div");
        div.className = "item";
        div.innerHTML = `
          <div><strong>${cls.name}</strong><p>${cls.students.length} enrolled</p></div>
          <span class="badge ${stats.percent < 50 && stats.total > 0 ? 'soft' : ''}">${stats.percent}% avg</span>
        `;
        classList.appendChild(div);
      });
    }
  }
}

/* ─── Create Class ───────────────────────────────────────────── */
async function createClass() {
  const nameEl = document.getElementById("className");
  const codeEl = document.getElementById("classCode");
  const name = nameEl.value.trim();
  const code = codeEl.value.trim().toUpperCase();
  if (!name || !code) return toast("Enter class name and code", "error");

  try {
    showSpinner(true);
    const res = await fetch(API_BASE + "/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + getToken() },
      body: JSON.stringify({ name, code })
    });
    const data = await res.json();
    showSpinner(false);

    if (!res.ok) {
      toast(data.error || "Failed to create class", "error");
      return;
    }

    // Avoid duplicates — remove if already exists locally (from previous failed sync)
    const existIdx = classes.findIndex(c => c.id === data.id || c.code === data.code);
    if (existIdx >= 0) classes.splice(existIdx, 1);

    classes.unshift({ id: data.id, name: data.name, code: data.code, students: [], files: [] });
    nameEl.value = "";
    codeEl.value = "";
    renderClasses();
    toast(`Class "${data.name}" created successfully!`, "success");
  } catch (err) {
    showSpinner(false);
    toast("Network error: " + (err.message || "Could not reach server"), "error");
  }
}

/* ─── Render Students ────────────────────────────────────────── */
function renderStudents() {
  const list = document.getElementById("studentList");
  if (!list) return;
  const query = (studentSearchInput?.value || "").trim().toLowerCase();
  list.innerHTML = "";
  let matchCount = 0;

  classes.forEach(cls => {
    cls.students.forEach((student, idx) => {
      const blob = `${student.name} ${student.id} ${student.mobile || ""}`.toLowerCase();
      if (query && !blob.includes(query)) return;
      const shareCount = directShares.filter(d => d.studentId === student.id).length;
      const conv = conversations.find(c => c.classCode === cls.code && c.studentId === student.id);
      const replyCount = conv?.messages?.filter(m => m.senderRole === "student").length || 0;
      const attStats = getAttendanceStats(getStudentAttendanceEntries(student.id, cls.code));
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div>
          <strong>${student.name}</strong>
          <p>${cls.name} · <code>${student.id}</code> · ${student.mobile || "—"}</p>
          <p class="muted small">Attendance: ${attStats.percent}% · Shares: ${shareCount} · Replies: ${replyCount}</p>
        </div>
        <div class="item-actions">
          <button class="chat-btn open-student-connect" data-class="${cls.code}" data-idx="${idx}" aria-label="Chat with ${student.name}">Chat</button>
          <button class="danger-btn remove-student-btn" data-class="${cls.code}" data-idx="${idx}" aria-label="Remove ${student.name}">Remove</button>
        </div>`;
      list.appendChild(div);
      matchCount++;
    });
  });

  if (!matchCount) {
    list.innerHTML = `<div class="empty-state">${query ? "No student matched that search." : "No students added yet."}</div>`;
  }
}

/* ─── Add Student ────────────────────────────────────────────── */
async function addStudent() {
  const idEl    = document.getElementById("studentId");
  const classEl = document.getElementById("studentClass");
  const studentUserId = idEl.value.trim();
  const code = classEl.value;

  if (!studentUserId) return toast("Enter the student's registered ID (e.g., STD123456)", "error");
  if (!code) return toast("Select a class to assign the student to", "error");

  const cls = getClassByCode(code);
  if (!cls) return toast("Class not found", "error");

  // Check not already in class locally
  if (cls.students.some(s => s.id.toLowerCase() === studentUserId.toLowerCase())) {
    return toast("This student is already in this class", "error");
  }

  try {
    showSpinner(true);
    const res = await fetch(API_BASE + `/api/classes/${cls.id}/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + getToken() },
      body: JSON.stringify({ studentId: studentUserId })
    });
    const data = await res.json();
    showSpinner(false);

    if (!res.ok) {
      toast(data.error || "Failed to add student", "error");
      return;
    }

    const s = data.student;
    cls.students.push({
      id: s.userId,
      dbId: s.id,
      name: `${s.firstName} ${s.lastName}`.trim(),
      mobile: s.phone || "",
      email: s.email || "",
      marks: null
    });

    // Auto-fill name field for confirmation
    document.getElementById("studentName").value = `${s.firstName} ${s.lastName}`.trim();
    document.getElementById("studentMobile").value = s.phone || "";

    idEl.value = "";
    renderStudents();
    renderAttendanceWorkspace();
    renderFeedbackEligibility();
    persistLocalData();
    toast(`${s.firstName} ${s.lastName} added to ${cls.name}!`, "success");
  } catch (err) {
    showSpinner(false);
    toast("Network error: " + (err.message || "Try again"), "error");
  }
}

/* "Lookup" student by ID without adding (auto-fills name/phone) */
async function lookupStudent() {
  const idVal = document.getElementById("studentId").value.trim();
  if (!idVal) return;
  try {
    const res = await fetch(API_BASE + `/api/users/lookup/${encodeURIComponent(idVal)}`, {
      headers: { "Authorization": "Bearer " + getToken() }
    });
    if (!res.ok) { const d = await res.json(); toast(d.error, "error"); return; }
    const s = await res.json();
    document.getElementById("studentName").value  = `${s.firstName} ${s.lastName}`.trim();
    document.getElementById("studentMobile").value = s.phone || "";
  } catch {}
}

/* ─── Remove Student ─────────────────────────────────────────── */
async function removeStudentFromClass(classCode, idx) {
  const cls = getClassByCode(classCode);
  if (!cls || !cls.students[idx]) return;
  const student = cls.students[idx];

  // Optimistic local remove
  cls.students.splice(idx, 1);
  // Clean up local linked data
  for (let i = directShares.length - 1; i >= 0; i--) {
    if (directShares[i].studentId === student.id) directShares.splice(i, 1);
  }
  for (let i = conversations.length - 1; i >= 0; i--) {
    if (conversations[i].studentId === student.id) conversations.splice(i, 1);
  }
  for (let i = notifications.length - 1; i >= 0; i--) {
    if (notifications[i].studentId === student.id) notifications.splice(i, 1);
  }
  if (activeStudentContext?.studentId === student.id) closeStudentConnectModal();

  persistLocalData();
  renderStudents();
  renderClasses();
  renderAttendanceWorkspace();
  renderFeedbackEligibility();
  toast(`${student.name} removed from ${cls.name}`);

  // Backend delete (fire and forget)
  const token = getToken();
  if (token) {
    fetch(API_BASE + `/api/classes/${cls.id}/students/${student.id}`, {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + token }
    }).catch(e => console.warn("[removeStudent]", e));
  }
}

/* ─── File sharing ───────────────────────────────────────────── */
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, mimeType: file.type || "application/octet-stream", dataUrl: reader.result });
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

if (fileUpload) {
  fileUpload.addEventListener("change", () => {
    const picked = fileUpload.files?.length
      ? Array.from(fileUpload.files).map(f => f.name).join(", ")
      : "No file chosen";
    document.getElementById("filePicked").textContent = picked;
  });
}
if (personalShareUpload) {
  personalShareUpload.addEventListener("change", () => {
    const picked = personalShareUpload.files?.length
      ? Array.from(personalShareUpload.files).map(f => f.name).join(", ")
      : "No file chosen";
    personalSharePicked.textContent = picked;
  });
}

async function shareFile() {
  const title  = document.getElementById("fileTitle").value.trim();
  const type   = document.getElementById("fileType").value;
  const code   = document.getElementById("fileClass").value;
  const notes  = document.getElementById("fileNotes").value.trim();
  const upload = document.getElementById("fileUpload");
  if (!title) return toast("Enter a file title", "error");
  if (!code)  return toast("Select a class", "error");

  const cls = getClassByCode(code);
  if (!cls) return toast("Class not found", "error");

  try {
    showSpinner(true);
    const res = await fetch(API_BASE + "/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + getToken() },
      body: JSON.stringify({ title, type, notes, classId: cls.id })
    });
    const data = await res.json();
    showSpinner(false);
    if (!res.ok) { toast(data.error || "Failed to share file", "error"); return; }

    const attachments = upload.files?.length
      ? await Promise.all(Array.from(upload.files).map(readFileAsDataUrl))
      : [];

    const entry = {
      id: data.id, title, type,
      class: cls.name, classCode: cls.code, notes,
      files: attachments.length ? attachments.map(f => f.name).join(", ") : "No attachment",
      attachments
    };
    shared.unshift(entry);
    cls.files.push(entry);

    document.getElementById("fileTitle").value = "";
    document.getElementById("fileNotes").value = "";
    document.getElementById("fileUpload").value = "";
    document.getElementById("filePicked").textContent = "No file chosen";
    renderFiles();
    toast(`"${title}" shared with ${cls.name}!`, "success");
  } catch (err) {
    showSpinner(false);
    toast("Network error: " + (err.message || "Try again"), "error");
  }
}

function renderFiles() {
  const list = document.getElementById("fileList");
  if (!list) return;
  list.innerHTML = "";
  if (!shared.length) {
    list.innerHTML = '<div class="empty-state">No files shared yet.</div>';
    renderQuickStats();
    return;
  }
  shared.forEach((item, sharedIdx) => {
    const div = document.createElement("div");
    div.className = "item";
    const label = item.attachments?.length
      ? item.attachments.map(f => f.name).join(", ")
      : (item.files || "No attachment");
    div.innerHTML = `
      <div>
        <strong>${item.title}</strong>
        <p>${item.class} · <span class="badge">${item.type}</span></p>
        <p class="muted">${label}</p>
        <p class="muted">${item.notes || "No notes"}</p>
      </div>
      <div class="item-actions">
        <button class="danger-btn delete-file-btn" data-file-index="${sharedIdx}" aria-label="Delete ${item.title}">Delete</button>
      </div>`;
    list.appendChild(div);
  });
  renderQuickStats();
}

function deleteSharedFile(sharedIdx) {
  const item = shared[sharedIdx];
  if (!item) return;

  // Backend delete
  if (item.id && getToken()) {
    fetch(API_BASE + `/api/files/${item.id}`, {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + getToken() }
    }).catch(e => console.warn("[deleteFile]", e));
  }

  shared.splice(sharedIdx, 1);
  classes.forEach(cls => { cls.files = cls.files.filter(f => f.id !== item.id); });
  persistLocalData();
  renderFiles();
  toast(`"${item.title}" deleted`);
}

/* ─── Attendance ─────────────────────────────────────────────── */
function renderAttendanceWorkspace() {
  const code = document.getElementById("attClass")?.value || classes[0]?.code;
  const cls  = getClassByCode(code);
  if (!cls) return;

  const date   = attendanceDateInput?.value;
  const record = date ? getAttendanceRecord(code, date) : null;
  const tbody  = document.getElementById("attTable");
  if (!tbody) return;

  tbody.innerHTML = "";
  const classStats = document.getElementById("attendanceClassStats");
  const coverage   = document.getElementById("attendanceCoverage");
  const loadedChip = document.getElementById("loadedAttendanceRecord");
  if (classStats) classStats.textContent = `${cls.students.length} students`;
  if (coverage) coverage.textContent = record
    ? `Loaded saved attendance for ${formatAttendanceDate(date)}. Modify and save again.`
    : "Fresh sheet — mark attendance for any date below.";
  if (loadedChip) loadedChip.textContent = record ? `Loaded ${formatAttendanceDate(date)}` : "Fresh sheet";

  cls.students.forEach(student => {
    const tr = document.createElement("tr");
    const checked = record ? record.present.some(s => s.id === student.id) : true;
    tr.dataset.studentName  = student.name;
    tr.dataset.studentId    = student.id;
    if (student.dbId) tr.dataset.studentDbId = student.dbId;
    tr.innerHTML = `<td>${student.name}</td><td><code>${student.id}</code></td>
      <td>${checked ? "Present" : "Absent"}</td>
      <td><label class="toggle"><input type="checkbox" ${checked ? "checked" : ""}><span>Mark</span></label></td>`;
    tbody.appendChild(tr);
  });
  updateCount();
  renderFeedbackEligibility();
}

function updateCount() {
  let present = 0, absent = 0;
  document.querySelectorAll("#attTable tr").forEach(row => {
    const cb = row.querySelector("input[type='checkbox']");
    const cell = row.children[2];
    const isPresent = Boolean(cb?.checked);
    if (cell) cell.textContent = isPresent ? "Present" : "Absent";
    if (isPresent) present++; else absent++;
  });
  document.getElementById("presentCount").textContent = `Present: ${present}`;
  document.getElementById("absentCount").textContent  = `Absent: ${absent}`;
}

async function saveAttendance() {
  const code = document.getElementById("attClass")?.value || classes[0]?.code;
  const cls  = getClassByCode(code);
  const date = attendanceDateInput?.value;
  if (!cls)  return toast("Select a class first", "error");
  if (!date) return toast("Pick an attendance date", "error");

  const rows = Array.from(document.querySelectorAll("#attTable tr"));
  const present = [], absent = [];
  const apiRecords = [];

  rows.forEach(row => {
    const student = { name: row.dataset.studentName || "", id: row.dataset.studentId || "", dbId: parseInt(row.dataset.studentDbId) || null };
    const isPresent = Boolean(row.querySelector("input[type='checkbox']")?.checked);
    if (isPresent) present.push(student); else absent.push(student);
    if (student.dbId) apiRecords.push({ studentId: student.dbId, status: isPresent ? "present" : "absent" });
  });

  // Save locally
  const existIdx = attendanceRecords.findIndex(r => r.classCode === cls.code && r.date === date);
  const prevRecord = existIdx >= 0 ? attendanceRecords[existIdx] : null;
  const record = { className: cls.name, classCode: cls.code, date, present, absent, savedAt: new Date().toISOString() };
  if (existIdx >= 0) attendanceRecords.splice(existIdx, 1);
  attendanceRecords.unshift(record);

  // Push notifications
  cls.students.forEach(s => {
    const oldStatus = prevRecord?.present?.some(e => e.id === s.id) ? "Present" : prevRecord ? "Absent" : "";
    const newStatus = present.some(e => e.id === s.id) ? "Present" : "Absent";
    const msg = oldStatus && oldStatus !== newStatus
      ? `${cls.name}: attendance for ${formatAttendanceDate(date)} changed to ${newStatus}.`
      : `${cls.name}: attendance for ${formatAttendanceDate(date)} marked ${newStatus}.`;
    pushNotification(s.id, "Attendance Updated", msg, "ATTENDANCE");
  });

  persistLocalData();
  renderAttendanceWorkspace();
  renderAttendanceHistory();
  renderAttendanceSearchResults();
  renderQuickStats();
  toast(`Attendance saved for ${cls.name} · ${formatAttendanceDate(date)}`, "success");

  // Persist to backend
  if (apiRecords.length && getToken()) {
    try {
      const res = await fetch(API_BASE + "/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + getToken() },
        body: JSON.stringify({ date, classId: cls.id, records: apiRecords })
      });
      if (!res.ok) {
        const d = await res.json();
        toast("Attendance saved locally but backend sync failed: " + d.error, "error");
      }
    } catch (e) {
      toast("Attendance saved locally — backend offline", "error");
    }
  }
}

function renderAttendanceHistory() {
  const list  = document.getElementById("attendanceHistoryList");
  const count = document.getElementById("attendanceHistoryCount");
  if (!list || !count) return;
  count.textContent = `${attendanceRecords.length} record${attendanceRecords.length !== 1 ? "s" : ""}`;
  list.innerHTML = "";
  if (!attendanceRecords.length) {
    list.innerHTML = '<div class="item column"><strong>No attendance saved yet</strong><p>Save class attendance to see the history here.</p></div>';
    return;
  }
  attendanceRecords.forEach(record => {
    const card = document.createElement("div");
    card.className = "item column attendance-record";
    const pNames = record.present.length ? record.present.map(s => `${s.name} (${s.id})`).join(", ") : "None";
    const aNames = record.absent.length  ? record.absent.map(s =>  `${s.name} (${s.id})`).join(", ") : "None";
    card.innerHTML = `
      <div class="attendance-record-head">
        <div><strong>${record.className}</strong><p>${record.classCode} · ${formatAttendanceDate(record.date)}</p></div>
        <div class="attendance-record-actions">
          <span class="badge">${record.present.length} Present / ${record.absent.length} Absent</span>
          <button class="ghost-btn load-attendance-btn" data-class="${record.classCode}" data-date="${record.date}" type="button">Load Record</button>
        </div>
      </div>
      <div class="attendance-split">
        <div class="attendance-block present-block"><strong>Present</strong><p>${pNames}</p></div>
        <div class="attendance-block absent-block"><strong>Absent</strong><p>${aNames}</p></div>
      </div>`;
    list.appendChild(card);
  });
}

function renderAttendanceSearchResults() {
  const list    = document.getElementById("attendanceRecordResults");
  const summary = document.getElementById("attendanceSearchSummary");
  if (!list || !summary) return;
  const query = (attendanceSearchInput?.value || "").trim().toLowerCase();
  list.innerHTML = "";
  if (!query) {
    summary.textContent = "Search a student";
    list.innerHTML = '<div class="empty-state">Search a student by name or ID to review attendance.</div>';
    return;
  }
  const all = classes.flatMap(cls => cls.students.map(s => ({ ...s, className: cls.name })));
  const matches = all.filter(s => `${s.name} ${s.id}`.toLowerCase().includes(query));
  if (!matches.length) {
    summary.textContent = "No match";
    list.innerHTML = '<div class="empty-state">No student matched that search.</div>';
    return;
  }
  summary.textContent = `${matches.length} match${matches.length !== 1 ? "es" : ""}`;
  matches.forEach(student => {
    const entries = getStudentAttendanceEntries(student.id);
    const stats = getAttendanceStats(entries);
    const card = document.createElement("div");
    card.className = "student-record-card";
    card.innerHTML = `
      <strong>${student.name}</strong><p>${student.className} · ${student.id}</p>
      <div class="student-record-summary">
        <div class="mini-stat"><strong>${stats.percent}%</strong><span class="muted small">Overall</span></div>
        <div class="mini-stat"><strong>${stats.present}</strong><span class="muted small">Present</span></div>
        <div class="mini-stat"><strong>${stats.absent}</strong><span class="muted small">Absent</span></div>
      </div>
      <div class="attendance-line-list">
        ${entries.length
          ? entries.map(e => `<div class="attendance-line-item"><div><strong>${e.className}</strong><p>${formatAttendanceDate(e.date)}</p></div><span class="status-pill ${e.status.toLowerCase()}">${e.status}</span></div>`).join("")
          : '<div class="empty-state">No saved records for this student yet.</div>'}
      </div>`;
    list.appendChild(card);
  });
}

/* ─── Feedback ───────────────────────────────────────────────── */
function getEligibleFeedbackStudents(classCode) {
  const cls = getClassByCode(classCode);
  if (!cls) return [];
  return cls.students.filter(s => {
    const stats = getAttendanceStats(getStudentAttendanceEntries(s.id, classCode));
    return stats.total > 0 && stats.percent > 60;
  });
}

function renderFeedbackEligibility() {
  const classCode = feedbackClassSelect?.value || classes[0]?.code;
  const eligible  = getEligibleFeedbackStudents(classCode);
  const chip = document.getElementById("eligibleFeedbackCount");
  if (chip) chip.textContent = `${eligible.length} eligible`;
}

function renderTeacherFeedbackResponses() {
  const list  = document.getElementById("teacherFeedbackResponseList");
  const count = document.getElementById("teacherFeedbackResponseCount");
  if (!list || !count) return;
  const classCode = feedbackClassSelect?.value || classes[0]?.code;
  const responses = feedbackForms
    .filter(f => f.teacherUserId === currentUser?.userId && f.classCode === classCode && f.response?.trim() && f.respondedAt)
    .sort((a, b) => new Date(b.respondedAt) - new Date(a.respondedAt));
  count.textContent = `${responses.length} response${responses.length !== 1 ? "s" : ""}`;
  list.innerHTML = "";
  if (!responses.length) {
    list.innerHTML = '<div class="item column"><strong>No feedback responses yet</strong><p>Student responses will appear here once submitted.</p></div>';
    return;
  }
  responses.forEach(f => {
    const card = document.createElement("div");
    card.className = "feedback-response-card";
    card.innerHTML = `
      <div class="section-head wrap">
        <div><strong>${f.studentName}</strong><p>${f.studentId} · ${f.className}</p></div>
        <span class="chip">${formatTimestamp(f.respondedAt)}</span>
      </div>
      <p><strong>${f.title}</strong></p><p class="muted">${f.prompt}</p>
      <div class="feedback-response-body">${f.response}</div>`;
    list.appendChild(card);
  });
}

function sendFeedbackBroadcast() {
  const classCode = feedbackClassSelect?.value || classes[0]?.code;
  const cls       = getClassByCode(classCode);
  const title     = document.getElementById("feedbackTitle").value.trim() || "Class feedback form";
  const prompt    = document.getElementById("feedbackPrompt").value.trim();
  if (!cls)    return toast("Choose a class first", "error");
  if (!prompt) return toast("Add a feedback prompt first", "error");
  const eligible = getEligibleFeedbackStudents(classCode);
  if (!eligible.length) return toast("No students above 60% attendance for this class yet", "error");
  eligible.forEach(s => {
    feedbackForms.unshift({
      id: `feedback-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      classCode: cls.code, className: cls.name,
      studentId: s.id, studentName: s.name,
      teacherUserId: currentUser.userId, teacherName: getDisplayName(currentUser),
      title, prompt, createdAt: new Date().toISOString(),
      response: "", respondedAt: ""
    });
    pushNotification(s.id, "Feedback form received", `${title} is available for ${cls.name}.`, "FEEDBACK");
  });
  persistLocalData();
  document.getElementById("feedbackTitle").value = "";
  document.getElementById("feedbackPrompt").value = "";
  renderFeedbackEligibility();
  renderTeacherFeedbackResponses();
  renderTeacherNotifications();
  toast(`Feedback form sent to ${eligible.length} student${eligible.length !== 1 ? "s" : ""}`, "success");
}

/* ─── Student Connect Modal ──────────────────────────────────── */
function getConversation(classCode, studentId, studentName) {
  let conv = conversations.find(c => c.classCode === classCode && c.studentId === studentId);
  if (!conv) {
    conv = { id: `conv-${classCode}-${studentId}`, classCode, studentId, studentName, messages: [] };
    conversations.push(conv);
  }
  return conv;
}

function getStudentDirectShares(studentId) {
  return directShares.filter(d => d.studentId === studentId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function openStudentConnectModal(classCode, idx) {
  const cls = getClassByCode(classCode);
  if (!cls || !cls.students[idx]) return;
  const student = cls.students[idx];
  activeStudentContext = { classCode, className: cls.name, idx, studentId: student.id, studentDbId: student.dbId, studentName: student.name, studentMobile: student.mobile || "", student };
  connectStudentName.textContent = student.name;
  connectStudentMeta.textContent = `${cls.name} · ${student.id} · ${student.mobile || "No mobile"}`;
  teacherChatMessage.value   = "";
  personalShareTitle.value   = "";
  personalShareNotes.value   = "";
  personalShareMarks.value   = student.marks ?? "";
  personalShareType.value    = student.marks != null ? "MARKS" : "FILE";
  personalShareUpload.value  = "";
  personalSharePicked.textContent = "No file chosen";
  renderTeacherConversation();
  renderTeacherStudentResources();
  studentConnectModal.classList.remove("hidden");
  // Load real messages from backend and restart fast polling
  if (student.dbId) {
    loadRealMessages(student.dbId);
    startPolling();
  }
}
function closeStudentConnectModal() {
  studentConnectModal.classList.add("hidden");
  activeStudentContext = null;
  // Pause polling — no active chat open
  if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; }
}

async function loadRealMessages(studentDbId) {
  try {
    const res = await fetch(API_BASE + `/api/messages/${studentDbId}`, {
      headers: { "Authorization": "Bearer " + getToken() }
    });
    if (!res.ok) return;
    const messages = await res.json();
    if (!activeStudentContext) return;

    const conv = getConversation(activeStudentContext.classCode, activeStudentContext.studentId, activeStudentContext.studentName);
    // Merge real messages (API messages take priority)
    conv.messages = messages.map(m => ({
      id: m.id,
      senderRole: m.sender.role,
      senderName: `${m.sender.firstName} ${m.sender.lastName}`.trim(),
      senderUserId: m.sender.userId,
      text: m.text,
      createdAt: m.createdAt
    }));
    persistLocalData();
    renderTeacherConversation();
  } catch (e) {
    console.warn("[loadRealMessages]", e);
  }
}

function renderTeacherConversation() {
  if (!activeStudentContext) return;
  const conv = getConversation(activeStudentContext.classCode, activeStudentContext.studentId, activeStudentContext.studentName);
  teacherChatThread.innerHTML = "";
  if (!conv.messages.length) {
    teacherChatThread.innerHTML = '<div class="empty-state">No messages yet. Start the conversation.</div>';
    return;
  }
  conv.messages.forEach(msg => {
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${msg.senderRole}`;
    bubble.innerHTML = `<span class="chat-meta">${msg.senderName} · ${formatTimestamp(msg.createdAt)}</span><div>${msg.text}</div>`;
    teacherChatThread.appendChild(bubble);
  });
  teacherChatThread.scrollTop = teacherChatThread.scrollHeight;
}

function renderTeacherStudentResources() {
  if (!activeStudentContext) return;
  const resources = getStudentDirectShares(activeStudentContext.studentId);
  teacherStudentResources.innerHTML = "";
  studentResourceCount.textContent = `${resources.length} item${resources.length !== 1 ? "s" : ""}`;
  if (!resources.length) {
    teacherStudentResources.innerHTML = '<div class="empty-state">No personal files or marks shared yet.</div>';
    return;
  }
  resources.forEach(r => {
    const card = document.createElement("div");
    card.className = "resource-card";
    const mText = r.marks != null ? `<p>Marks: ${r.marks}</p>` : "";
    const aText = r.attachments?.length ? r.attachments.map(f => f.name).join(", ") : "No attachment";
    card.innerHTML = `<strong>${r.title}</strong><p>${r.type} · ${formatTimestamp(r.createdAt)}</p>${mText}<p>${r.notes || "No notes."}</p><p class="muted">${aText}</p>`;
    teacherStudentResources.appendChild(card);
  });
}

async function sendTeacherMessageToStudent() {
  if (!activeStudentContext) return;
  const text = teacherChatMessage.value.trim();
  if (!text) return toast("Type a message first", "error");

  // Optimistic local update
  const conv = getConversation(activeStudentContext.classCode, activeStudentContext.studentId, activeStudentContext.studentName);
  const localMsg = {
    senderRole: "teacher",
    senderName: getDisplayName(currentUser),
    senderUserId: currentUser.userId,
    text,
    createdAt: new Date().toISOString()
  };
  conv.messages.push(localMsg);
  pushNotification(activeStudentContext.studentId, "New teacher message",
    `${getDisplayName(currentUser)} sent you a message in ${activeStudentContext.className}.`, "MESSAGE");
  persistLocalData();
  teacherChatMessage.value = "";
  renderTeacherConversation();
  renderStudents();

  // Backend persist
  if (activeStudentContext.studentDbId && getToken()) {
    try {
      const res = await fetch(API_BASE + "/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + getToken() },
        body: JSON.stringify({ receiverId: activeStudentContext.studentDbId, text })
      });
      if (res.ok) {
        toast("Message sent", "success");
        // Reload full thread so we get confirmed message + any student replies
        await loadRealMessages(activeStudentContext.studentDbId);
      } else {
        // Roll back optimistic message
        conv.messages = conv.messages.filter(m => m !== localMsg);
        renderTeacherConversation();
        const d = await res.json();
        toast(d.error || "Failed to send message", "error");
      }
    } catch (e) {
      console.warn("[sendMessage]", e);
      toast("Message saved locally — backend offline", "error");
    }
  } else {
    toast("Message sent", "success");
  }
}

async function shareIndividualUpdate() {
  if (!activeStudentContext) return;
  const type     = personalShareType.value;
  const title    = personalShareTitle.value.trim() || (type === "MARKS" ? "Marks update" : type === "NOTE" ? "Teacher note" : "Shared file");
  const notes    = personalShareNotes.value.trim();
  const marksRaw = personalShareMarks.value.trim();
  const marks    = marksRaw ? Number(marksRaw) : null;
  const attachments = personalShareUpload.files?.length
    ? await Promise.all(Array.from(personalShareUpload.files).map(readFileAsDataUrl))
    : [];

  if (type === "MARKS" && (marks === null || isNaN(marks) || marks < 0 || marks > 100)) return toast("Enter marks between 0 and 100", "error");
  if (type === "FILE" && !attachments.length && !notes) return toast("Attach a file or add notes", "error");
  if (type === "NOTE" && !notes) return toast("Add notes for the student", "error");

  const resource = {
    id: `direct-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    classCode: activeStudentContext.classCode, className: activeStudentContext.className,
    studentId: activeStudentContext.studentId, studentName: activeStudentContext.studentName,
    teacherUserId: currentUser.userId, teacherName: getDisplayName(currentUser),
    type, title, notes, marks: type === "MARKS" ? marks : null,
    attachments, createdAt: new Date().toISOString()
  };
  directShares.unshift(resource);
  if (type === "MARKS") activeStudentContext.student.marks = marks;
  pushNotification(activeStudentContext.studentId, "New personal update",
    `${title} was shared with you by ${getDisplayName(currentUser)}.`, "PERSONAL");
  persistLocalData();
  personalShareTitle.value = "";
  personalShareNotes.value = "";
  personalShareUpload.value = "";
  personalSharePicked.textContent = "No file chosen";
  if (type !== "MARKS") personalShareMarks.value = activeStudentContext.student.marks ?? "";
  renderTeacherStudentResources();
  renderStudents();
  toast("Shared with student!", "success");
}

/* ─── Profile & Auth ─────────────────────────────────────────── */
function setDropdownOpen(isOpen) {
  if (!profileDropdown || !profileToggle) return;
  profileDropdown.classList.toggle("hidden", !isOpen);
  profileToggle.setAttribute("aria-expanded", String(isOpen));
}

function openEditProfile() {
  if (!currentUser) return;
  document.getElementById("editFirstName").value = currentUser.firstName || "";
  document.getElementById("editLastName").value  = currentUser.lastName  || "";
  document.getElementById("editUsername").value  = currentUser.username  || "";
  document.getElementById("editEmail").value     = currentUser.email     || "";
  document.getElementById("editPhone").value     = currentUser.phone     || "";
  editProfileModal.classList.remove("hidden");
  setDropdownOpen(false);
}
function closeEditProfile() { editProfileModal.classList.add("hidden"); }

function saveProfile() {
  if (!currentUser) return;
  const firstName = document.getElementById("editFirstName").value.trim();
  const lastName  = document.getElementById("editLastName").value.trim();
  const username  = document.getElementById("editUsername").value.trim();
  const email     = document.getElementById("editEmail").value.trim();
  const phone     = document.getElementById("editPhone").value.trim();
  if (!firstName || !lastName || !username || !email || !phone) return toast("Fill in all profile fields", "error");
  const updated = { ...currentUser, firstName, lastName, username, email, phone };
  persistCurrentUser(updated);
  currentUser = updated;
  applyTeacherProfile(currentUser);
  closeEditProfile();
  toast("Profile updated!", "success");
}

function openTeacherPasswordReset() {
  localStorage.setItem("attendance360AuthPrefill", JSON.stringify({ role: "teacher", mode: "login", forgot: true }));
  window.location.href = "../Login/index.html";
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(TOKEN_KEY);
  window.location.href = "../Login/index.html";
}

/* ─── Backend Initializer ────────────────────────────────────── */
async function initializeBackend() {
  const token = getToken();
  if (!token) return;
  showSpinner(true);
  try {
    const [classesRes, filesRes] = await Promise.all([
      fetch(API_BASE + "/api/classes", { headers: { "Authorization": "Bearer " + token } }),
      fetch(API_BASE + "/api/files",   { headers: { "Authorization": "Bearer " + token } })
    ]);

    if (classesRes.ok) {
      const data = await classesRes.json();
      const mapped = data.map(c => ({
        id: c.id, name: c.name, code: c.code,
        students: (c.students || []).map(cs => ({
          id:    cs.student.userId,
          dbId:  cs.student.id,
          name:  `${cs.student.firstName} ${cs.student.lastName}`.trim(),
          mobile: cs.student.phone || "",
          email:  cs.student.email || "",
          marks:  null
        })),
        files: []
      }));
      classes.splice(0, classes.length, ...mapped);
      renderClasses();
      renderStudents();
      renderAttendanceWorkspace();
      renderFeedbackEligibility();
    }

    if (filesRes.ok) {
      const data = await filesRes.json();
      shared.splice(0, shared.length, ...data.map(f => ({
        id: f.id, title: f.title, type: f.type, notes: f.notes,
        class: f.class ? f.class.name : "—",
        classCode: f.class ? f.class.code : "",
        files: f.fileUrl || "No attachment"
      })));
      renderFiles();
    }
  } catch (err) {
    console.warn("[initializeBackend]", err);
  }
  showSpinner(false);
}

/* ─── Live polling (every 5s when student modal is open) ─────── */
let pollingInterval = null;
function startPolling() {
  if (pollingInterval) clearInterval(pollingInterval);
  pollingInterval = setInterval(() => {
    if (activeStudentContext?.studentDbId) loadRealMessages(activeStudentContext.studentDbId);
  }, 5000);
}

/* ─── Event Wiring ───────────────────────────────────────────── */
if (studentListEl) {
  studentListEl.addEventListener("click", evt => {
    if (evt.target.classList.contains("remove-student-btn")) {
      removeStudentFromClass(evt.target.dataset.class, parseInt(evt.target.dataset.idx));
      return;
    }
    const chatBtn = evt.target.closest(".open-student-connect");
    if (chatBtn) openStudentConnectModal(chatBtn.dataset.class, Number(chatBtn.dataset.idx));
  });
}
if (fileListEl) {
  fileListEl.addEventListener("click", evt => {
    const btn = evt.target.closest(".delete-file-btn");
    if (btn) deleteSharedFile(Number(btn.dataset.fileIndex));
  });
}
if (studentSearchInput)    studentSearchInput.addEventListener("input", renderStudents);
if (attendanceSearchInput) attendanceSearchInput.addEventListener("input", renderAttendanceSearchResults);
if (attendanceDateInput)   attendanceDateInput.addEventListener("change", renderAttendanceWorkspace);
if (feedbackClassSelect) {
  feedbackClassSelect.addEventListener("change", () => { renderFeedbackEligibility(); renderTeacherFeedbackResponses(); });
}
if (sendFeedbackFormsButton) sendFeedbackFormsButton.addEventListener("click", sendFeedbackBroadcast);
if (teacherNotificationToggle) teacherNotificationToggle.addEventListener("click", toggleTeacherNotifications);
if (profileToggle) profileToggle.addEventListener("click", () => setDropdownOpen(profileDropdown.classList.contains("hidden")));
if (openEditProfileButton)   openEditProfileButton.addEventListener("click", openEditProfile);
if (openTeacherPasswordPage) openTeacherPasswordPage.addEventListener("click", openTeacherPasswordReset);
if (logoutButton)            logoutButton.addEventListener("click", logout);
if (closeEditProfileButton)  closeEditProfileButton.addEventListener("click", closeEditProfile);
if (cancelEditProfileButton) cancelEditProfileButton.addEventListener("click", closeEditProfile);
if (saveProfileButton)       saveProfileButton.addEventListener("click", saveProfile);
if (sendTeacherMessage)      sendTeacherMessage.addEventListener("click", sendTeacherMessageToStudent);
if (sharePersonalUpdate)     sharePersonalUpdate.addEventListener("click", shareIndividualUpdate);
if (closeStudentConnect)     closeStudentConnect.addEventListener("click", closeStudentConnectModal);
if (callStudentButton) {
  callStudentButton.addEventListener("click", () => {
    if (!activeStudentContext?.studentMobile) return toast("No mobile number on record", "error");
    window.location.href = `tel:${activeStudentContext.studentMobile}`;
  });
}
document.getElementById("attTable")?.addEventListener("change", evt => {
  if (evt.target.matches("input[type='checkbox']")) updateCount();
});
document.getElementById("attendanceHistoryList")?.addEventListener("click", evt => {
  const btn = evt.target.closest(".load-attendance-btn");
  if (!btn) return;
  document.getElementById("attClass").value = btn.dataset.class;
  if (attendanceDateInput) attendanceDateInput.value = btn.dataset.date;
  showSection("attendance");
  renderAttendanceWorkspace();
});
if (studentConnectModal) {
  studentConnectModal.addEventListener("click", evt => { if (evt.target === studentConnectModal) closeStudentConnectModal(); });
}
if (editProfileModal) {
  editProfileModal.addEventListener("click", evt => { if (evt.target === editProfileModal) closeEditProfile(); });
}
document.addEventListener("click", evt => {
  if (!evt.target.closest(".notification-shell")) {
    teacherNotificationPanel?.classList.add("hidden");
    teacherNotificationToggle?.setAttribute("aria-expanded", "false");
  }
  if (!evt.target.closest(".profile-menu")) setDropdownOpen(false);
});
document.addEventListener("keydown", evt => {
  if (evt.key === "Escape") {
    teacherNotificationPanel?.classList.add("hidden");
    teacherNotificationToggle?.setAttribute("aria-expanded", "false");
    setDropdownOpen(false);
    closeEditProfile();
    closeStudentConnectModal();
  }
});
window.addEventListener("storage", evt => {
  if (evt.key !== STORAGE_KEY) return;
  const local = loadLocalData();
  directShares.splice(0,  directShares.length,  ...local.directShares);
  conversations.splice(0, conversations.length, ...local.conversations);
  notifications.splice(0, notifications.length, ...local.notifications);
  feedbackForms.splice(0, feedbackForms.length,  ...local.feedbackForms);
  renderStudents();
  renderTeacherFeedbackResponses();
  renderTeacherNotifications();
});

/* ─── Lookup on blur ─────────────────────────────────────────── */
const studentIdInput = document.getElementById("studentId");
if (studentIdInput) studentIdInput.addEventListener("blur", lookupStudent);

/* ─── Set today's date ───────────────────────────────────────── */
if (attendanceDateInput && !attendanceDateInput.value) {
  attendanceDateInput.value = new Date().toISOString().split("T")[0];
}

/* ─── Init ───────────────────────────────────────────────────── */
(function init() {
  const local = loadLocalData();
  directShares.splice(0,  directShares.length,  ...local.directShares);
  conversations.splice(0, conversations.length, ...local.conversations);
  notifications.splice(0, notifications.length, ...local.notifications);
  feedbackForms.splice(0, feedbackForms.length,  ...local.feedbackForms);

  applyTeacherProfile(currentUser);
  showSection("home");
  renderClasses();
  renderStudents();
  renderFiles();
  renderAttendanceHistory();
  renderAttendanceSearchResults();
  renderTeacherFeedbackResponses();
  renderTeacherNotifications();

  // Load from backend (overwrites local)
  initializeBackend().then(() => startPolling());
})();
