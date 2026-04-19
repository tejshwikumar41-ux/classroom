/* ============================================================
   Attendance360 — Student Portal Script
   ============================================================ */

const STORAGE_KEY  = "attendance360-shared-data";
const SESSION_KEY  = "attendance360CurrentUser";
const TOKEN_KEY    = "attendance360Token";

let API_BASE = "";
if (
  window.location.protocol === "file:" ||
  ((window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") &&
    window.location.port !== "3000")
) {
  API_BASE = "https://classroom-seven-beta.vercel.app";
}

// Map key → teacher context object (used by data-teacher-key on buttons)
const teacherContextMap = {};

/* ─── State ─────────────────────────────────────────────────── */
let enrolledClasses   = [];   // from backend
let sharedFiles       = [];   // from backend
let apiMessages       = {};   // keyed by teacherDbId → messages[]
let directShares      = [];   // from localStorage
let conversations     = [];   // from localStorage (fallback)
let notifications     = [];   // from localStorage
let feedbackForms     = [];   // from localStorage

let currentUser       = getCurrentUser();
let activeTeacherCtx  = null; // { teacherId, teacherName, teacherDbId, classCode, className }

let currentMonth = new Date().getMonth();
let currentYear  = new Date().getFullYear();

/* ─── DOM refs ───────────────────────────────────────────────── */
const studentClassesList        = document.getElementById("studentClassesList");
const studentClassCount         = document.getElementById("studentClassCount");
const studentFileList           = document.getElementById("studentFileList");
const studentPersonalUpdates    = document.getElementById("studentPersonalUpdates");
const personalUpdateCount       = document.getElementById("personalUpdateCount");
const studentPersonalStatus     = document.getElementById("studentPersonalStatus");
const studentChatThread         = document.getElementById("studentChatThread");
const studentConversationStatus = document.getElementById("studentConversationStatus");
const studentReplyMessage       = document.getElementById("studentReplyMessage");
const sendStudentReply          = document.getElementById("sendStudentReply");
const studentFeedbackForms      = document.getElementById("studentFeedbackForms");
const feedbackFormCount         = document.getElementById("feedbackFormCount");
const notificationToggle        = document.getElementById("notificationToggle");
const notificationBadge         = document.getElementById("notificationBadge");
const notificationPanel         = document.getElementById("notificationPanel");
const notificationList          = document.getElementById("notificationList");
const notificationPanelStatus   = document.getElementById("notificationPanelStatus");
const attendanceOverallPercent  = document.getElementById("attendanceOverallPercent");
const attendancePresentDays     = document.getElementById("attendancePresentDays");
const attendanceAbsentDays      = document.getElementById("attendanceAbsentDays");
const attendanceLogCount        = document.getElementById("attendanceLogCount");
const attendanceLogList         = document.getElementById("attendanceLogList");
const pdfReader                 = document.getElementById("pdfReader");
const pdfFrame                  = document.getElementById("pdfFrame");
const pdfTitle                  = document.getElementById("pdfTitle");
const closePdfReader            = document.getElementById("closePdfReader");
const logoutBtn                 = document.getElementById("logoutBtn");

/* ─── Helpers ────────────────────────────────────────────────── */
function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
  catch { return null; }
}
function getToken() { return localStorage.getItem(TOKEN_KEY) || ""; }

function toast(msg, type = "default") {
  const colors = {
    success: { bg: "rgba(22,163,74,0.95)",  border: "rgba(74,222,128,0.4)"  },
    error:   { bg: "rgba(220,38,38,0.95)",  border: "rgba(248,113,113,0.4)" },
    default: { bg: "rgba(15,24,40,0.95)",   border: "rgba(255,255,255,0.12)"}
  };
  const c = colors[type] || colors.default;
  const note = document.createElement("div");
  note.textContent = msg;
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
  if (!el && show) {
    el = document.createElement("div");
    el.id = "globalSpinner";
    Object.assign(el.style, {
      position: "fixed", top: 0, left: 0, right: 0, height: "3px",
      background: "linear-gradient(90deg, #6366f1, #a855f7)",
      zIndex: "9999", animation: "spinnerSlide 1.2s ease-in-out infinite"
    });
    document.body.prepend(el);
  }
  if (el) el.style.display = show ? "block" : "none";
}

function formatTimestamp(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit"
  });
}
function formatDate(value) {
  if (!value) return "";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });
}
function getBadgeClass(type) {
  if (type === "ZIP") return "badge soft";
  if (type === "DOC") return "badge alt";
  return "badge";
}

/* ─── Local storage (conversations / notifications / feedback) ─ */
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
function saveLocalData() {
  const local = loadLocalData(); // preserve teacher-side data
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...local,
    directShares, conversations, notifications, feedbackForms
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
document.querySelectorAll("nav a, .cta-row .btn, .grid-3 .btn, .item .btn").forEach(link => {
  link.addEventListener("click", () => {
    const target = link.getAttribute("data-target");
    if (target) showSection(target);
  });
});

/* ─── Apply profile ──────────────────────────────────────────── */
function applyStudentProfile(user) {
  if (!user || user.role?.toLowerCase().trim() !== "student") {
    window.location.href = "../Login/index.html";
    return;
  }
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("studentRolePill",   `Logged in as ${user.username}`);
  set("studentWelcome",    `Welcome back, ${fullName || user.username}!`);
  set("studentIntro",      "Track your attendance, view shared files, and communicate with your teachers.");
  set("studentNameCard",   fullName || "Student");
  set("studentCredentials",`Username: ${user.username} · Student ID: ${user.userId}`);
  set("studentPhone",      `${user.email || ""} · ${user.phone || ""}`);
}

/* ─── Render Classes (using backend data) ────────────────────── */
function renderStudentClasses() {
  if (!studentClassesList) return;
  studentClassesList.innerHTML = "";

  if (!enrolledClasses.length) {
    if (studentClassCount) studentClassCount.textContent = "0 active";
    studentClassesList.innerHTML = '<div class="item column"><strong>No courses yet</strong><p>Your teacher has not added you to a class yet. Ask them to add you using your Student ID: <strong>' + (currentUser?.userId || "—") + '</strong></p></div>';
    return;
  }

  if (studentClassCount) studentClassCount.textContent = `${enrolledClasses.length} active`;

  enrolledClasses.forEach((course, index) => {
    const attEntries  = getAttendanceEntriesForStudent(course.id);
    const stats       = getAttendanceStats(attEntries);
    const teacherName = course.teacher
      ? `${course.teacher.firstName} ${course.teacher.lastName}`.trim()
      : "Teacher";
    const enrolled    = course.students ? course.students.length : 0;

    // Store teacher context in map so buttons can reference it safely
    const ctxKey = `${course.id}-${course.teacher?.id || "none"}`;
    if (course.teacher?.id) {
      teacherContextMap[ctxKey] = {
        teacherDbId:    course.teacher.id,
        teacherName,
        teacherUserId:  course.teacher.userId || "",
        classCode:      course.code,
        className:      course.name
      };
    }

    const card = document.createElement("div");
    card.className = "item";

    const chatBtnHtml = course.teacher?.id
      ? `<button class="chat-btn msg-teacher-btn" data-teacher-key="${ctxKey}" style="margin-top:8px;">💬 Message Teacher</button>`
      : "";

    card.innerHTML = `
      <div>
        <strong>${course.name}</strong>
        <p>Code: <code>${course.code}</code> · ${enrolled} enrolled · Teacher: ${teacherName}</p>
        <div class="progress"><span style="width:${stats.percent}%;"></span></div>
      </div>
      <div style="text-align:right;">
        <span class="chip">${stats.percent}% attendance</span>
        ${chatBtnHtml}
      </div>`;
    studentClassesList.appendChild(card);
  });
}

/* ─── Render Files ───────────────────────────────────────────── */
function isPdfFile(file) {
  const name = (file?.name || "").toLowerCase();
  const mime = (file?.mimeType || "").toLowerCase();
  return mime.includes("pdf") || name.endsWith(".pdf");
}
function downloadSharedFile(file) {
  if (!file?.dataUrl) return toast("No download available.", "error");
  const link = document.createElement("a");
  link.href = file.dataUrl; link.download = file.name || "file";
  document.body.appendChild(link); link.click(); link.remove();
}
function openSharedFile(file) {
  if (!file?.dataUrl) return toast("File cannot be opened.", "error");
  if (isPdfFile(file)) { pdfTitle.textContent = file.name; pdfFrame.src = file.dataUrl; pdfReader.classList.remove("hidden"); return; }
  window.open(file.dataUrl, "_blank", "noopener,noreferrer");
}
function hidePdfReader() { pdfReader.classList.add("hidden"); pdfFrame.src = ""; }

function renderStudentFiles() {
  if (!studentFileList) return;
  studentFileList.innerHTML = "";

  if (!sharedFiles.length) {
    studentFileList.innerHTML = '<div class="item column"><strong>No shared files yet</strong><p>Files shared by your teachers will appear here.</p></div>';
    return;
  }

  sharedFiles.forEach(item => {
    const card = document.createElement("div");
    card.className = "item column";
    const attachments = Array.isArray(item.attachments) ? item.attachments : [];
    const label = attachments.length ? attachments.map(f => f.name).join(", ") : (item.files || "No attachment");
    const teacherName = item.teacher ? `${item.teacher.firstName} ${item.teacher.lastName}`.trim() : "";
    card.innerHTML = `
      <div class="file-head">
        <span class="${getBadgeClass(item.type)}">${item.type}</span>
        <strong>${item.title}</strong>
      </div>
      <p>${item.class || ""}${teacherName ? " · " + teacherName : ""} · ${label}</p>
      <p>${item.notes || "No notes added."}</p>
      <div class="cta-row"></div>`;
    const actions = card.querySelector(".cta-row");
    if (!attachments.length) {
      const btn = document.createElement("button");
      btn.className = "btn secondary"; btn.textContent = "No File"; btn.disabled = true;
      actions.appendChild(btn);
    } else {
      attachments.forEach(file => {
        const openBtn = document.createElement("button");
        openBtn.className = "btn secondary";
        openBtn.textContent = isPdfFile(file) ? `Read ${file.name}` : `Open ${file.name}`;
        openBtn.addEventListener("click", () => openSharedFile(file));
        actions.appendChild(openBtn);
        const dlBtn = document.createElement("button");
        dlBtn.className = "btn secondary"; dlBtn.textContent = `Download ${file.name}`;
        dlBtn.addEventListener("click", () => downloadSharedFile(file));
        actions.appendChild(dlBtn);
      });
    }
    studentFileList.appendChild(card);
  });
}

/* ─── Attendance (from backend API records) ──────────────────── */
let apiAttendanceRecords = []; // raw from /api/attendance/student/:id

function getAttendanceEntriesForStudent(classId) {
  // classId = DB int id  OR  undefined to get all classes
  return apiAttendanceRecords
    .filter(r => classId === undefined || r.attendance.class?.id === classId)
    .map(r => ({
      classCode: r.attendance.class?.code || "",
      className: r.attendance.class?.name || "",
      date: r.attendance.date?.split("T")[0] || "",
      status: r.status === "present" ? "Present" : "Absent"
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getAttendanceStats(entries) {
  const total   = entries.length;
  const present = entries.filter(e => e.status === "Present").length;
  return { total, present, absent: total - present, percent: total ? Math.round((present / total) * 100) : 0 };
}

function renderAttendance() {
  const entries = getAttendanceEntriesForStudent();
  const stats   = getAttendanceStats(entries);

  if (attendanceOverallPercent) attendanceOverallPercent.textContent = `${stats.percent}%`;
  if (attendancePresentDays)    attendancePresentDays.textContent    = String(stats.present);
  if (attendanceAbsentDays)     attendanceAbsentDays.textContent     = String(stats.absent);
  if (attendanceLogCount)       attendanceLogCount.textContent       = `${entries.length} entr${entries.length === 1 ? "y" : "ies"}`;
  if (!attendanceLogList) return;
  attendanceLogList.innerHTML = "";

  // Calendar
  const monthDate    = new Date(currentYear, currentMonth, 1);
  const monthLbl     = document.getElementById("monthLabel");
  if (monthLbl) monthLbl.textContent = `${monthDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`;
  const daysInMonth  = new Date(currentYear, currentMonth + 1, 0).getDate();
  const calContainer = document.getElementById("calendarDays");
  if (calContainer) {
    calContainer.innerHTML = "";
    for (let day = 1; day <= daysInMonth; day++) {
      const dv   = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayE = entries.filter(e => e.date === dv);
      const div  = document.createElement("div");
      div.className = "day";
      div.textContent = day;
      if (dayE.some(e => e.status === "Absent"))  div.classList.add("absent");
      else if (dayE.some(e => e.status === "Present")) div.classList.add("present");
      else div.classList.add("neutral");
      div.addEventListener("click", () => {
        if (!dayE.length) { toast(`No record for ${formatDate(dv)}.`); return; }
        toast(dayE.map(e => `${e.className}: ${e.status}`).join(" | "));
      });
      calContainer.appendChild(div);
    }
  }

  if (!entries.length) {
    attendanceLogList.innerHTML = '<div class="item column"><strong>No attendance records yet</strong><p>Your teacher has not saved attendance for your account yet.</p></div>';
    return;
  }

  entries.forEach(entry => {
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `
      <div><strong>${entry.className}</strong><p>${formatDate(entry.date)}</p></div>
      <span class="chip ${entry.status === 'Present' ? 'present' : 'absent'}">${entry.status}</span>`;
    attendanceLogList.appendChild(row);
  });
}

/* ─── Messaging ──────────────────────────────────────────────── */
function openMessageTeacher(ctx) {
  // ctx = { teacherDbId, teacherName, teacherUserId, classCode, className }
  if (typeof ctx === "string") ctx = JSON.parse(ctx);
  activeTeacherCtx = ctx;

  // Update chat UI header
  const header = document.getElementById("chatTeacherName");
  const meta   = document.getElementById("chatTeacherMeta");
  if (header) header.textContent = ctx.teacherName || "Teacher";
  if (meta)   meta.textContent   = ctx.className || "";

  showSection("messages");
  renderStudentChat();
  // Load from backend immediately
  loadMessagesFromTeacher(ctx.teacherDbId);
  // Restart fast polling for active chat
  startPolling();
}

async function loadMessagesFromTeacher(teacherDbId) {
  if (!teacherDbId || !getToken()) return;
  try {
    const res = await fetch(API_BASE + `/api/messages/${teacherDbId}`, {
      headers: { "Authorization": "Bearer " + getToken() }
    });
    if (!res.ok) return;
    const data = await res.json();
    apiMessages[teacherDbId] = data;
    renderStudentChat();
  } catch (e) { console.warn("[loadMessages]", e); }
}

// Load all conversations (contacts the student has messaged or received from)
async function loadAllConversations() {
  if (!getToken()) return;
  try {
    const res = await fetch(API_BASE + "/api/messages", {
      headers: { "Authorization": "Bearer " + getToken() }
    });
    if (!res.ok) return;
    const contacts = await res.json(); // [{id, firstName, lastName, userId, role, lastMessage, lastAt}]

    // For each contact, load their full message thread
    for (const contact of contacts) {
      const msgRes = await fetch(API_BASE + `/api/messages/${contact.id}`, {
        headers: { "Authorization": "Bearer " + getToken() }
      });
      if (msgRes.ok) {
        apiMessages[contact.id] = await msgRes.json();
        // If this contact matches our active teacher ctx, refresh chat
        if (activeTeacherCtx && contact.id === activeTeacherCtx.teacherDbId) {
          renderStudentChat();
        }
      }
    }

    // Auto-restore context: if no active teacher yet, pick the most recent contact
    // that matches a teacher in our enrolled classes so Messages tab shows real data
    if (!activeTeacherCtx && contacts.length > 0 && enrolledClasses.length > 0) {
      // contacts are sorted desc by lastAt — try to match the first teacher contact
      for (const contact of contacts) {
        if (contact.role !== "teacher") continue;
        // Find which enrolled class this teacher teaches
        const course = enrolledClasses.find(c => c.teacher && c.teacher.id === contact.id);
        if (course) {
          activeTeacherCtx = {
            teacherDbId:   contact.id,
            teacherName:   `${contact.firstName} ${contact.lastName}`.trim(),
            teacherUserId: contact.userId || "",
            classCode:     course.code,
            className:     course.name
          };
          // Update chat header
          const header = document.getElementById("chatTeacherName");
          const meta   = document.getElementById("chatTeacherMeta");
          if (header) header.textContent = activeTeacherCtx.teacherName;
          if (meta)   meta.textContent   = activeTeacherCtx.className;
          renderStudentChat();
          break;
        }
      }
    }
  } catch (e) { console.warn("[loadAllConversations]", e); }
}

function renderStudentChat() {
  if (!studentChatThread) return;
  studentChatThread.innerHTML = "";

  const messages = activeTeacherCtx
    ? (apiMessages[activeTeacherCtx.teacherDbId] || [])
    : [];

  if (studentConversationStatus) {
    studentConversationStatus.textContent = activeTeacherCtx
      ? (messages.length ? `${messages.length} messages` : "No messages yet")
      : "Pick a class to message the teacher";
  }

  if (!activeTeacherCtx) {
    studentChatThread.innerHTML = '<div class="item column"><strong>Select a class</strong><p>Go to My Classes and tap “Message Teacher” to open a conversation.</p></div>';
    return;
  }
  if (!messages.length) {
    studentChatThread.innerHTML = '<div class="item column"><strong>No messages yet</strong><p>Send a message to your teacher below.</p></div>';
    return;
  }

  messages.forEach(msg => {
    // isMe = this message was sent by the current student
    // Use DB id first (most reliable), then userId string — avoid role fallback
    const isMe = (msg.sender?.id !== undefined && currentUser?.id !== undefined && msg.sender.id === currentUser.id)
               || (msg.sender?.userId && currentUser?.userId && msg.sender.userId === currentUser.userId);
    const bubble = document.createElement("div");
    // student (me) aligns right  → use "student" class (justify-self: end)
    // teacher aligns left        → use "teacher" class (justify-self: start)
    bubble.className = `chat-bubble ${isMe ? "student" : "teacher"}`;
    const senderName = isMe
      ? `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || "You"
      : `${msg.sender?.firstName || ""} ${msg.sender?.lastName || ""}`.trim() || "Teacher";
    bubble.innerHTML = `<span class="chat-meta">${senderName} · ${formatTimestamp(msg.createdAt)}</span><div>${msg.text}</div>`;
    studentChatThread.appendChild(bubble);
  });
  studentChatThread.scrollTop = studentChatThread.scrollHeight;
}

async function sendReplyToTeacher() {
  const text = studentReplyMessage?.value.trim();
  if (!text) return toast("Type a message first", "error");

  if (!activeTeacherCtx) {
    return toast("Open a class first, then tap 'Message Teacher'", "error");
  }

  const teacherDbId = activeTeacherCtx.teacherDbId;
  if (!teacherDbId) return toast("Cannot find teacher account", "error");

  // Optimistic local message
  const tempMsg = {
    id: null,
    sender:   { id: currentUser.id, userId: currentUser.userId, firstName: currentUser.firstName, lastName: currentUser.lastName, role: "student" },
    receiver: { id: teacherDbId, role: "teacher" },
    text,
    createdAt: new Date().toISOString()
  };
  if (!apiMessages[teacherDbId]) apiMessages[teacherDbId] = [];
  apiMessages[teacherDbId].push(tempMsg);
  studentReplyMessage.value = "";
  renderStudentChat();

  // Also mirror into localStorage conversations for teacher-side cross-tab
  let conv = conversations.find(c => c.studentId === currentUser.userId && c.classCode === activeTeacherCtx.classCode);
  if (!conv) {
    conv = { id: `conv-${activeTeacherCtx.classCode}-${currentUser.userId}`, classCode: activeTeacherCtx.classCode, studentId: currentUser.userId, studentName: `${currentUser.firstName} ${currentUser.lastName}`.trim(), messages: [] };
    conversations.push(conv);
  }
  conv.messages.push({ senderRole: "student", senderName: `${currentUser.firstName} ${currentUser.lastName}`.trim(), senderUserId: currentUser.userId, text, createdAt: tempMsg.createdAt });
  saveLocalData();

  // Backend
  try {
    const res = await fetch(API_BASE + "/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + getToken() },
      body: JSON.stringify({ receiverId: teacherDbId, text })
    });
    if (res.ok) {
      toast("Message sent!", "success");
      // Reload full thread from server to confirm and pick up any teacher replies
      await loadMessagesFromTeacher(teacherDbId);
    } else {
      const d = await res.json();
      // Roll back optimistic message
      apiMessages[teacherDbId] = apiMessages[teacherDbId].filter(m => m !== tempMsg);
      renderStudentChat();
      toast(d.error || "Failed to send message", "error");
    }
  } catch (e) {
    toast("Network error — message saved locally only", "error");
  }
}

/* ─── Personal Updates (direct shares from teacher) ─────────── */
function getStudentDirectShares() {
  if (!currentUser) return [];
  return directShares
    .filter(d => d.studentId === currentUser.userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function renderPersonalUpdates() {
  if (!studentPersonalUpdates) return;
  studentPersonalUpdates.innerHTML = "";

  const items = getStudentDirectShares();
  if (personalUpdateCount) personalUpdateCount.textContent = `${items.length} item${items.length !== 1 ? "s" : ""}`;
  if (studentPersonalStatus) {
    studentPersonalStatus.textContent = enrolledClasses.length
      ? enrolledClasses.map(c => c.name).join(", ")
      : "No classes yet";
  }

  if (!items.length) {
    studentPersonalUpdates.innerHTML = '<div class="item column"><strong>No personal updates yet</strong><p>Marks, files, and notes shared directly by your teacher will appear here.</p></div>';
  } else {
    items.forEach(item => {
      const card = document.createElement("div");
      card.className = "personal-card";
      const aNames  = item.attachments?.length ? item.attachments.map(f => f.name).join(", ") : "No attachment";
      const mText   = item.marks != null ? `<p><strong>Marks:</strong> ${item.marks}</p>` : "";
      card.innerHTML = `
        <div class="file-head"><span class="badge">${item.type}</span><strong>${item.title}</strong></div>
        <p>${item.className} · ${formatTimestamp(item.createdAt)}</p>
        ${mText}<p>${item.notes || "No notes."}</p>
        <p class="muted-note">${aNames}</p><div class="cta-row"></div>`;
      const actions = card.querySelector(".cta-row");
      (item.attachments || []).forEach(file => {
        const openBtn = document.createElement("button");
        openBtn.className = "btn secondary"; openBtn.textContent = isPdfFile(file) ? `Read ${file.name}` : `Open ${file.name}`;
        openBtn.addEventListener("click", () => openSharedFile(file)); actions.appendChild(openBtn);
        const dlBtn = document.createElement("button");
        dlBtn.className = "btn secondary"; dlBtn.textContent = `Download ${file.name}`;
        dlBtn.addEventListener("click", () => downloadSharedFile(file)); actions.appendChild(dlBtn);
      });
      studentPersonalUpdates.appendChild(card);
    });
  }
}

/* ─── Feedback Forms ─────────────────────────────────────────── */
function renderFeedbackForms() {
  if (!studentFeedbackForms) return;
  studentFeedbackForms.innerHTML = "";

  const forms = feedbackForms
    .filter(f => f.studentId === currentUser?.userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (feedbackFormCount) feedbackFormCount.textContent = `${forms.length} form${forms.length !== 1 ? "s" : ""}`;

  if (!forms.length) {
    studentFeedbackForms.innerHTML = '<div class="item column"><strong>No feedback forms yet</strong><p>When your teacher sends feedback requests, they will appear here.</p></div>';
    return;
  }

  forms.forEach(form => {
    const card = document.createElement("div");
    card.className = "feedback-form-card";
    const done = form.response?.trim();
    card.innerHTML = `
      <div class="file-head"><span class="badge">${form.classCode}</span><strong>${form.title}</strong></div>
      <p>${form.className} · ${formatTimestamp(form.createdAt)}</p>
      <p>${form.prompt}</p>
      ${done ? `<p><strong>Your response:</strong> ${form.response}</p><p class="muted-note">Submitted ${formatTimestamp(form.respondedAt)}</p>` : ""}
      <textarea id="feedback-response-${form.id}" placeholder="Write your feedback here" ${done ? "disabled" : ""}></textarea>
      <button class="btn secondary submit-feedback-btn" data-feedback-id="${form.id}" ${done ? "disabled" : ""}>${done ? "Submitted" : "Submit Feedback"}</button>`;
    studentFeedbackForms.appendChild(card);
  });
}

function submitFeedbackForm(feedbackId) {
  const textarea = document.getElementById(`feedback-response-${feedbackId}`);
  const response = textarea?.value.trim();
  if (!response) return toast("Write your feedback before submitting.", "error");

  const form = feedbackForms.find(f => f.id === feedbackId);
  if (!form) return toast("Feedback form not found.", "error");

  form.response    = response;
  form.respondedAt = new Date().toISOString();
  saveLocalData();
  renderFeedbackForms();
  toast("Feedback submitted!", "success");
}

/* ─── Notifications ──────────────────────────────────────────── */
function renderNotifications() {
  const userNotifs = notifications
    .filter(n => n.studentId === currentUser?.userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const unread = userNotifs.filter(n => !n.read).length;
  if (notificationBadge)      { notificationBadge.textContent = unread; notificationBadge.classList.toggle("hidden", unread === 0); }
  if (notificationPanelStatus) notificationPanelStatus.textContent = `${unread} unread`;
  if (!notificationList) return;
  notificationList.innerHTML = "";

  if (!userNotifs.length) {
    notificationList.innerHTML = '<div class="item column"><strong>No notifications yet</strong><p>Attendance updates and teacher messages will show up here.</p></div>';
    return;
  }

  userNotifs.forEach(n => {
    const card = document.createElement("div");
    card.className = `notification-card${n.read ? "" : " unread"}`;
    card.innerHTML = `<strong>${n.title}</strong><p>${n.message}</p><p class="muted-note">${formatTimestamp(n.createdAt)}</p>`;
    notificationList.appendChild(card);
  });
}

function markNotificationsRead() {
  let changed = false;
  notifications.forEach(n => {
    if (n.studentId === currentUser?.userId && !n.read) { n.read = true; changed = true; }
  });
  if (changed) saveLocalData();
  renderNotifications();
}
function toggleNotifications() {
  const willOpen = notificationPanel?.classList.contains("hidden");
  notificationPanel?.classList.toggle("hidden", !willOpen);
  notificationToggle?.setAttribute("aria-expanded", String(willOpen));
  if (willOpen) markNotificationsRead();
}

/* ─── Calendar month controls ────────────────────────────────── */
document.getElementById("prevMonth")?.addEventListener("click", () => {
  if (currentMonth === 0) { currentMonth = 11; currentYear--; } else currentMonth--;
  renderAttendance();
});
document.getElementById("nextMonth")?.addEventListener("click", () => {
  if (currentMonth === 11) { currentMonth = 0; currentYear++; } else currentMonth++;
  renderAttendance();
});

/* ─── Event wiring ───────────────────────────────────────────── */
if (sendStudentReply) sendStudentReply.addEventListener("click", sendReplyToTeacher);
if (closePdfReader)   closePdfReader.addEventListener("click", hidePdfReader);
if (notificationToggle) notificationToggle.addEventListener("click", toggleNotifications);
if (studentFeedbackForms) {
  studentFeedbackForms.addEventListener("click", evt => {
    const btn = evt.target.closest(".submit-feedback-btn");
    if (btn) submitFeedbackForm(btn.dataset.feedbackId);
  });
}
if (pdfReader) pdfReader.addEventListener("click", evt => { if (evt.target === pdfReader) hidePdfReader(); });
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = "../Login/index.html";
  });
}
document.addEventListener("click", evt => {
  if (!evt.target.closest(".notification-shell") && notificationPanel) {
    notificationPanel.classList.add("hidden");
    notificationToggle?.setAttribute("aria-expanded", "false");
  }
});
document.addEventListener("keydown", evt => {
  if (evt.key === "Escape") {
    if (pdfReader && !pdfReader.classList.contains("hidden")) hidePdfReader();
    notificationPanel?.classList.add("hidden");
    notificationToggle?.setAttribute("aria-expanded", "false");
  }
});
// Sync across tabs (teacher on same browser)
window.addEventListener("storage", evt => {
  if (evt.key !== STORAGE_KEY) return;
  const local = loadLocalData();
  directShares.splice(0,  directShares.length,  ...local.directShares);
  conversations.splice(0, conversations.length, ...local.conversations);
  notifications.splice(0, notifications.length, ...local.notifications);
  feedbackForms.splice(0, feedbackForms.length,  ...local.feedbackForms);
  renderPersonalUpdates();
  renderFeedbackForms();
  renderNotifications();
});

/* ─── Backend Initializer ────────────────────────────────────── */
async function initializeBackend() {
  const token = getToken();
  if (!token) { console.warn("No token — cannot load backend data"); return; }
  showSpinner(true);
  try {
    // Fetch enrolled classes (backend filters by student)
    const [classesRes, filesRes] = await Promise.all([
      fetch(API_BASE + "/api/classes", { headers: { "Authorization": "Bearer " + token } }),
      fetch(API_BASE + "/api/files",   { headers: { "Authorization": "Bearer " + token } })
    ]);

    if (classesRes.ok) {
      const data = await classesRes.json();
      enrolledClasses.splice(0, enrolledClasses.length, ...data);
      renderStudentClasses();
    } else {
      const d = await classesRes.json();
      console.warn("[classes]", d.error);
    }

    if (filesRes.ok) {
      const data = await filesRes.json();
      sharedFiles.splice(0, sharedFiles.length, ...data.map(f => ({
        id:       f.id,
        title:    f.title,
        type:     f.type,
        notes:    f.notes,
        class:    f.class?.name || "",
        classCode:f.class?.code || "",
        teacher:  f.teacher || null,
        files:    f.fileUrl || "No attachment",
        attachments: [] // file content not stored on server side yet
      })));
      renderStudentFiles();
    }

    // Fetch attendance records for this student
    if (currentUser?.id) {
      const attRes = await fetch(API_BASE + `/api/attendance/student/${currentUser.id}`, {
        headers: { "Authorization": "Bearer " + token }
      });
      if (attRes.ok) {
        apiAttendanceRecords = await attRes.json();
        renderAttendance();
        renderStudentClasses(); // re-render with updated stats
      }
    }

  } catch (err) {
    console.warn("[initializeBackend]", err);
    toast("Could not fetch data from server", "error");
  }
  showSpinner(false);
}

/* ─── Live polling (messages every 5s when chat is active) ───── */
let pollingInterval = null;
function startPolling() {
  if (pollingInterval) clearInterval(pollingInterval);
  pollingInterval = setInterval(() => {
    if (activeTeacherCtx?.teacherDbId) {
      loadMessagesFromTeacher(activeTeacherCtx.teacherDbId);
    }
  }, 5000);
}

/* ─── Delegated click: "Message Teacher" buttons in class cards ── */
if (studentClassesList) {
  studentClassesList.addEventListener("click", evt => {
    const btn = evt.target.closest(".msg-teacher-btn");
    if (!btn) return;
    const key = btn.dataset.teacherKey;
    const ctx = teacherContextMap[key];
    if (!ctx) { toast("Teacher info not available", "error"); return; }
    openMessageTeacher(ctx);
  });
}

/* ─── Also reload messages when navigating to Messages section ── */
document.querySelectorAll("nav a").forEach(link => {
  link.addEventListener("click", () => {
    if (link.getAttribute("data-target") === "messages" && activeTeacherCtx?.teacherDbId) {
      loadMessagesFromTeacher(activeTeacherCtx.teacherDbId);
    }
  });
});

/* ─── Init ───────────────────────────────────────────────────── */
(function init() {
  // Load local data first (conversations, notifications, feedback, directShares)
  const local = loadLocalData();
  directShares.splice(0,  directShares.length,  ...local.directShares);
  conversations.splice(0, conversations.length, ...local.conversations);
  notifications.splice(0, notifications.length, ...local.notifications);
  feedbackForms.splice(0, feedbackForms.length,  ...local.feedbackForms);

  // Apply profile (redirects if not student)
  applyStudentProfile(currentUser);

  // Initial render with empty state
  renderStudentClasses();
  renderStudentFiles();
  renderPersonalUpdates();
  renderFeedbackForms();
  renderNotifications();
  renderAttendance();
  renderStudentChat();
  showSection("home");

  // Hit backend to get real data
  initializeBackend().then(() => {
    startPolling();
    // Pre-load all conversations so Messages tab is ready even without opening a class first
    loadAllConversations();
  });
})();
