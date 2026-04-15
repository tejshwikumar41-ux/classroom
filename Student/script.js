const STORAGE_KEY = "attendance360-shared-data";
const SESSION_KEY = "attendance360CurrentUser";

const defaultData = {
  classes: [
    {
      name: "Machine Learning",
      code: "ML-501",
      students: [
        { name: "Prithvi Singh Bhadoria", id: "BTET2501097", mobile: "9826910621" },
        { name: "Sanskar Sinha", id: "BTAM2501058", mobile: "7000411437" }
      ],
      files: []
    },
    {
      name: "Data Structure",
      code: "DS-410",
      students: [
        { name: "Lakshya Gupta", id: "BTET2501075", mobile: "8959566333" },
        { name: "Prithvi Raj Shinde", id: "BTTC2501052", mobile: "8982410994" }
      ],
      files: []
    }
  ],
  shared: [],
  directShares: [],
  conversations: [],
  attendanceRecords: [],
  notifications: [],
  feedbackForms: []
};

const sectionLinks = document.querySelectorAll("nav a, .cta-row .btn, .grid-3 .btn, .item .btn");
const studentClassesList = document.getElementById("studentClassesList");
const studentClassCount = document.getElementById("studentClassCount");
const studentFileList = document.getElementById("studentFileList");
const studentPersonalUpdates = document.getElementById("studentPersonalUpdates");
const personalUpdateCount = document.getElementById("personalUpdateCount");
const studentPersonalStatus = document.getElementById("studentPersonalStatus");
const studentChatThread = document.getElementById("studentChatThread");
const studentConversationStatus = document.getElementById("studentConversationStatus");
const studentReplyMessage = document.getElementById("studentReplyMessage");
const sendStudentReply = document.getElementById("sendStudentReply");
const studentFeedbackForms = document.getElementById("studentFeedbackForms");
const feedbackFormCount = document.getElementById("feedbackFormCount");
const notificationToggle = document.getElementById("notificationToggle");
const notificationBadge = document.getElementById("notificationBadge");
const notificationPanel = document.getElementById("notificationPanel");
const notificationList = document.getElementById("notificationList");
const notificationPanelStatus = document.getElementById("notificationPanelStatus");
const attendanceOverallPercent = document.getElementById("attendanceOverallPercent");
const attendancePresentDays = document.getElementById("attendancePresentDays");
const attendanceAbsentDays = document.getElementById("attendanceAbsentDays");
const attendanceLogCount = document.getElementById("attendanceLogCount");
const attendanceLogList = document.getElementById("attendanceLogList");
const pdfReader = document.getElementById("pdfReader");
const pdfFrame = document.getElementById("pdfFrame");
const pdfTitle = document.getElementById("pdfTitle");
const closePdfReader = document.getElementById("closePdfReader");
const currentUser = getCurrentUser();

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch (error) {
    console.warn("Failed to load current user", error);
    return null;
  }
}

function loadSharedData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        classes: Array.isArray(parsed.classes) ? parsed.classes : structuredClone(defaultData.classes),
        shared: Array.isArray(parsed.shared) ? parsed.shared : structuredClone(defaultData.shared),
        directShares: Array.isArray(parsed.directShares) ? parsed.directShares : structuredClone(defaultData.directShares),
        conversations: Array.isArray(parsed.conversations) ? parsed.conversations : structuredClone(defaultData.conversations),
        attendanceRecords: Array.isArray(parsed.attendanceRecords) ? parsed.attendanceRecords : [],
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
        feedbackForms: Array.isArray(parsed.feedbackForms) ? parsed.feedbackForms : []
      };
    }
  } catch (error) {
    console.warn("Failed to load shared student data", error);
  }

  return structuredClone(defaultData);
}

function saveSharedData(sharedData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sharedData));
}

if (!localStorage.getItem(STORAGE_KEY)) {
  saveSharedData(defaultData);
}

function applyStudentProfile(user) {
  if (!user || user.role !== "student") {
    window.location.href = "../Login/index.html";
    return;
  }

  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  const welcome = document.getElementById("studentWelcome");
  const intro = document.getElementById("studentIntro");
  const nameCard = document.getElementById("studentNameCard");
  const credentials = document.getElementById("studentCredentials");
  const phone = document.getElementById("studentPhone");
  const rolePill = document.getElementById("studentRolePill");

  if (rolePill) rolePill.textContent = `Logged in as ${user.username}`;
  if (welcome) welcome.textContent = `Welcome back, ${fullName}!`;
  if (intro) intro.textContent = "Track your real attendance, catch every teacher update from notifications, and respond to feedback forms from one focused student dashboard.";
  if (nameCard) nameCard.textContent = fullName || "Student";
  if (credentials) credentials.textContent = `Username: ${user.username} · Student ID: ${user.userId}`;
  if (phone) phone.textContent = `${user.email} · ${user.phone}`;
}

sectionLinks.forEach((link) => link.addEventListener("click", () => {
  const target = link.getAttribute("data-target");
  if (target) showSection(target);
}));

function showSection(id) {
  document.querySelectorAll(".section").forEach((sec) => sec.classList.remove("active"));
  document.querySelectorAll("nav a").forEach((a) => a.classList.remove("active"));
  const section = document.getElementById(id);
  const navLink = document.querySelector(`nav a[data-target="${id}"]`);
  if (section) section.classList.add("active");
  if (navLink) navLink.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toast(msg) {
  const note = document.createElement("div");
  note.textContent = msg;
  note.style.position = "fixed";
  note.style.bottom = "24px";
  note.style.right = "24px";
  note.style.padding = "12px 16px";
  note.style.background = "rgba(15,24,40,0.9)";
  note.style.color = getComputedStyle(document.documentElement).getPropertyValue("--text") || "#e7eefc";
  note.style.border = "1px solid rgba(255,255,255,0.12)";
  note.style.borderRadius = "10px";
  note.style.boxShadow = "0 12px 30px rgba(0,0,0,0.35)";
  note.style.zIndex = "50";
  document.body.appendChild(note);
  setTimeout(() => note.remove(), 1800);
}

function formatTimestamp(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatDate(value) {
  if (!value) return "";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function getBadgeClass(type) {
  if (type === "ZIP") return "badge soft";
  if (type === "DOC") return "badge alt";
  return "badge";
}

function isPdfFile(file) {
  const name = (file?.name || "").toLowerCase();
  const mimeType = (file?.mimeType || "").toLowerCase();
  return mimeType.includes("pdf") || name.endsWith(".pdf");
}

function downloadSharedFile(file) {
  if (!file?.dataUrl) return toast("This file is not available for download.");
  const link = document.createElement("a");
  link.href = file.dataUrl;
  link.download = file.name || "shared-file";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function openSharedFile(file) {
  if (!file?.dataUrl) return toast("This file cannot be opened.");
  if (isPdfFile(file)) {
    pdfTitle.textContent = file.name || "PDF Document";
    pdfFrame.src = file.dataUrl;
    pdfReader.classList.remove("hidden");
    return;
  }
  window.open(file.dataUrl, "_blank", "noopener,noreferrer");
}

function hidePdfReader() {
  pdfReader.classList.add("hidden");
  pdfFrame.src = "";
}

function getCurrentStudentRecord(sharedData = loadSharedData()) {
  if (!currentUser) return null;
  const fullName = `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim().toLowerCase();
  for (const classItem of sharedData.classes) {
    for (const student of classItem.students) {
      const sameName = fullName && student.name.toLowerCase() === fullName;
      const samePhone = currentUser.phone && student.mobile === currentUser.phone;
      const sameId = currentUser.userId && student.id === currentUser.userId;
      if (sameName || samePhone || sameId) {
        return { classItem, student };
      }
    }
  }
  return null;
}

function getStudentAttendanceEntries(sharedData, match) {
  if (!match) return [];
  return sharedData.attendanceRecords
    .map((record) => {
      const present = record.present?.some((student) => student.id === match.student.id);
      const absent = record.absent?.some((student) => student.id === match.student.id);
      if (!present && !absent) return null;
      return {
        classCode: record.classCode,
        className: record.className,
        date: record.date,
        status: present ? "Present" : "Absent"
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getAttendanceStats(entries) {
  const total = entries.length;
  const present = entries.filter((entry) => entry.status === "Present").length;
  const absent = total - present;
  const percent = total ? Math.round((present / total) * 100) : 0;
  return { total, present, absent, percent };
}

function renderStudentClasses() {
  const sharedData = loadSharedData();
  const match = getCurrentStudentRecord(sharedData);
  const attendanceEntries = getStudentAttendanceEntries(sharedData, match);
  studentClassesList.innerHTML = "";

  const ownClasses = sharedData.classes.filter((course) => course.students.some((student) => student.id === match?.student?.id));
  studentClassCount.textContent = `${ownClasses.length} active`;

  if (!ownClasses.length) {
    studentClassesList.innerHTML = '<div class="item column"><strong>No courses yet</strong><p>Your teacher has not linked your student account to a class record yet.</p></div>';
    return;
  }

  ownClasses.forEach((course, index) => {
    const courseEntries = attendanceEntries.filter((entry) => entry.classCode === course.code);
    const courseStats = getAttendanceStats(courseEntries);
    const schedule = ["Mon 9:00 AM", "Tue 11:00 AM", "Wed 3:00 PM", "Thu 10:30 AM", "Fri 4:00 PM"][index % 5];
    const card = document.createElement("div");
    card.className = "item";
    card.innerHTML = `
      <div>
        <strong>${course.name}</strong>
        <p>Course code ${course.code} · ${course.students.length} students enrolled</p>
        <div class="progress"><span style="width:${courseStats.percent}%;"></span></div>
      </div>
      <span class="chip">${courseStats.percent}% · Next: ${schedule}</span>
    `;
    studentClassesList.appendChild(card);
  });
}

function renderStudentFiles() {
  const { shared } = loadSharedData();
  studentFileList.innerHTML = "";

  if (!shared.length) {
    studentFileList.innerHTML = '<div class="item column"><strong>No shared files yet</strong><p>Files uploaded by the teacher will appear here automatically.</p></div>';
    return;
  }

  shared.forEach((item) => {
    const card = document.createElement("div");
    card.className = "item column";
    const attachments = Array.isArray(item.attachments) ? item.attachments : [];
    const fileLabel = attachments.length ? attachments.map((file) => file.name).join(", ") : (item.files || "No attachment");
    card.innerHTML = `
      <div class="file-head"><span class="${getBadgeClass(item.type)}">${item.type}</span><strong>${item.title}</strong></div>
      <p>${item.class} · ${fileLabel}</p>
      <p>${item.notes || "No notes added."}</p>
      <div class="cta-row"></div>
    `;
    const actions = card.querySelector(".cta-row");
    if (!attachments.length) {
      const button = document.createElement("button");
      button.className = "btn secondary";
      button.textContent = "No File";
      button.disabled = true;
      actions.appendChild(button);
    } else {
      attachments.forEach((file) => {
        const openButton = document.createElement("button");
        openButton.className = "btn secondary";
        openButton.textContent = isPdfFile(file) ? `Read ${file.name}` : `Open ${file.name}`;
        openButton.addEventListener("click", () => openSharedFile(file));
        actions.appendChild(openButton);

        const downloadButton = document.createElement("button");
        downloadButton.className = "btn secondary";
        downloadButton.textContent = `Download ${file.name}`;
        downloadButton.addEventListener("click", () => downloadSharedFile(file));
        actions.appendChild(downloadButton);
      });
    }
    studentFileList.appendChild(card);
  });
}

function renderPersonalUpdates() {
  const sharedData = loadSharedData();
  const match = getCurrentStudentRecord(sharedData);
  studentPersonalUpdates.innerHTML = "";
  studentChatThread.innerHTML = "";

  if (!match) {
    studentPersonalStatus.textContent = "Profile not linked";
    personalUpdateCount.textContent = "0 items";
    studentConversationStatus.textContent = "No linked student record";
    studentPersonalUpdates.innerHTML = '<div class="item column"><strong>We could not match your account to a class record yet.</strong><p>Your teacher can still message you once your registered name or phone matches the student list.</p></div>';
    studentChatThread.innerHTML = '<div class="item column"><strong>No conversation available yet</strong><p>Ask your teacher to add you with the same name or phone number used during signup.</p></div>';
    return;
  }

  const personalItems = sharedData.directShares
    .filter((item) => item.studentId === match.student.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const conversation = sharedData.conversations.find((item) => item.studentId === match.student.id && item.classCode === match.classItem.code);

  studentPersonalStatus.textContent = `${match.classItem.name} · ${match.student.id}`;
  personalUpdateCount.textContent = `${personalItems.length} item${personalItems.length === 1 ? "" : "s"}`;
  studentConversationStatus.textContent = conversation?.messages?.length ? `${conversation.messages.length} messages` : "No chat yet";

  if (!personalItems.length) {
    studentPersonalUpdates.innerHTML = '<div class="item column"><strong>No personal updates yet</strong><p>Marks, individual files, and teacher notes will appear here.</p></div>';
  } else {
    personalItems.forEach((item) => {
      const card = document.createElement("div");
      card.className = "personal-card";
      const attachmentNames = item.attachments?.length ? item.attachments.map((file) => file.name).join(", ") : "No attachment";
      const marksText = item.marks != null ? `<p><strong>Marks:</strong> ${item.marks}</p>` : "";
      card.innerHTML = `<div class="file-head"><span class="badge">${item.type}</span><strong>${item.title}</strong></div><p>${item.className} · ${formatTimestamp(item.createdAt)}</p>${marksText}<p>${item.notes || "No notes added."}</p><p class="muted-note">${attachmentNames}</p><div class="cta-row"></div>`;
      const actions = card.querySelector(".cta-row");
      (item.attachments || []).forEach((file) => {
        const openButton = document.createElement("button");
        openButton.className = "btn secondary";
        openButton.textContent = isPdfFile(file) ? `Read ${file.name}` : `Open ${file.name}`;
        openButton.addEventListener("click", () => openSharedFile(file));
        actions.appendChild(openButton);

        const downloadButton = document.createElement("button");
        downloadButton.className = "btn secondary";
        downloadButton.textContent = `Download ${file.name}`;
        downloadButton.addEventListener("click", () => downloadSharedFile(file));
        actions.appendChild(downloadButton);
      });
      studentPersonalUpdates.appendChild(card);
    });
  }

  if (!conversation?.messages?.length) {
    studentChatThread.innerHTML = '<div class="item column"><strong>No messages yet</strong><p>Your teacher can start the conversation from the teacher student list.</p></div>';
    return;
  }

  conversation.messages.forEach((message) => {
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${message.senderRole}`;
    bubble.innerHTML = `<span class="chat-meta">${message.senderName} · ${formatTimestamp(message.createdAt)}</span><div>${message.text}</div>`;
    studentChatThread.appendChild(bubble);
  });
  studentChatThread.scrollTop = studentChatThread.scrollHeight;
}

function renderFeedbackForms() {
  const sharedData = loadSharedData();
  const match = getCurrentStudentRecord(sharedData);
  studentFeedbackForms.innerHTML = "";

  if (!match) {
    feedbackFormCount.textContent = "0 forms";
    studentFeedbackForms.innerHTML = '<div class="item column"><strong>No feedback forms yet</strong><p>Your account needs to be linked to a student record first.</p></div>';
    return;
  }

  const forms = sharedData.feedbackForms
    .filter((form) => form.studentId === match.student.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  feedbackFormCount.textContent = `${forms.length} form${forms.length === 1 ? "" : "s"}`;

  if (!forms.length) {
    studentFeedbackForms.innerHTML = '<div class="item column"><strong>No feedback forms waiting</strong><p>When your teacher sends class feedback requests, they will appear here.</p></div>';
    return;
  }

  forms.forEach((form) => {
    const card = document.createElement("div");
    card.className = "feedback-form-card";
    const completedText = form.response?.trim()
      ? `<p><strong>Your response:</strong> ${form.response}</p><p class="muted-note">Submitted on ${formatTimestamp(form.respondedAt)}</p>`
      : "";
    card.innerHTML = `
      <div class="file-head">
        <span class="badge">${form.classCode}</span>
        <strong>${form.title}</strong>
      </div>
      <p>${form.className} · ${formatTimestamp(form.createdAt)}</p>
      <p>${form.prompt}</p>
      ${completedText}
      <textarea id="feedback-response-${form.id}" placeholder="Write your feedback for the class here" ${form.response ? "disabled" : ""}></textarea>
      <button class="btn secondary submit-feedback-btn" data-feedback-id="${form.id}" ${form.response ? "disabled" : ""}>${form.response ? "Submitted" : "Submit Feedback"}</button>
    `;
    studentFeedbackForms.appendChild(card);
  });
}

function renderNotifications() {
  const sharedData = loadSharedData();
  const match = getCurrentStudentRecord(sharedData);
  const notifications = match
    ? sharedData.notifications
      .filter((item) => item.studentId === match.student.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    : [];

  const unread = notifications.filter((item) => !item.read).length;
  notificationBadge.textContent = unread;
  notificationBadge.classList.toggle("hidden", unread === 0);
  notificationPanelStatus.textContent = `${unread} unread`;
  notificationList.innerHTML = "";

  if (!notifications.length) {
    notificationList.innerHTML = '<div class="item column"><strong>No notifications yet</strong><p>Teacher updates, attendance edits, and feedback alerts will show up here.</p></div>';
    return;
  }

  notifications.forEach((item) => {
    const card = document.createElement("div");
    card.className = `notification-card${item.read ? "" : " unread"}`;
    card.innerHTML = `<strong>${item.title}</strong><p>${item.message}</p><p class="muted-note">${formatTimestamp(item.createdAt)}</p>`;
    notificationList.appendChild(card);
  });
}

function markNotificationsRead() {
  const sharedData = loadSharedData();
  const match = getCurrentStudentRecord(sharedData);
  if (!match) return;
  let changed = false;
  sharedData.notifications.forEach((item) => {
    if (item.studentId === match.student.id && !item.read) {
      item.read = true;
      changed = true;
    }
  });
  if (changed) saveSharedData(sharedData);
  renderNotifications();
}

function toggleNotifications() {
  const willOpen = notificationPanel.classList.contains("hidden");
  notificationPanel.classList.toggle("hidden", !willOpen);
  notificationToggle.setAttribute("aria-expanded", String(willOpen));
  if (willOpen) markNotificationsRead();
}

function renderAttendance() {
  const sharedData = loadSharedData();
  const match = getCurrentStudentRecord(sharedData);
  const entries = getStudentAttendanceEntries(sharedData, match);
  const stats = getAttendanceStats(entries);

  attendanceOverallPercent.textContent = `${stats.percent}%`;
  attendancePresentDays.textContent = String(stats.present);
  attendanceAbsentDays.textContent = String(stats.absent);
  attendanceLogCount.textContent = `${entries.length} entr${entries.length === 1 ? "y" : "ies"}`;
  attendanceLogList.innerHTML = "";

  if (!match) {
    document.getElementById("monthLabel").textContent = "Month view";
    document.getElementById("calendarDays").innerHTML = "";
    attendanceLogList.innerHTML = '<div class="item column"><strong>No attendance record available</strong><p>Your account is not yet linked to a student record.</p></div>';
    return;
  }

  const monthDate = new Date(currentYear, currentMonth, 1);
  document.getElementById("monthLabel").textContent = `Month view · ${monthDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`;

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const container = document.getElementById("calendarDays");
  container.innerHTML = "";

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateValue = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayEntries = entries.filter((entry) => entry.date === dateValue);
    const div = document.createElement("div");
    div.className = "day";
    div.textContent = day;

    if (dayEntries.some((entry) => entry.status === "Absent")) {
      div.classList.add("absent");
    } else if (dayEntries.some((entry) => entry.status === "Present")) {
      div.classList.add("present");
    } else {
      div.classList.add("neutral");
    }

    div.addEventListener("click", () => {
      if (!dayEntries.length) {
        toast(`No saved attendance record for ${formatDate(dateValue)}.`);
        return;
      }
      const summary = dayEntries.map((entry) => `${entry.className}: ${entry.status}`).join(" | ");
      toast(`${formatDate(dateValue)} · ${summary}`);
    });
    container.appendChild(div);
  }

  if (!entries.length) {
    attendanceLogList.innerHTML = '<div class="item column"><strong>No saved attendance yet</strong><p>Your teacher has not saved any attendance records for your account yet.</p></div>';
    return;
  }

  entries.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `
      <div>
        <strong>${entry.className}</strong>
        <p>${formatDate(entry.date)}</p>
      </div>
      <span class="chip">${entry.status}</span>
    `;
    attendanceLogList.appendChild(row);
  });
}

function sendReplyToTeacher() {
  const message = studentReplyMessage.value.trim();
  if (!message) return toast("Type a reply first");

  const sharedData = loadSharedData();
  const match = getCurrentStudentRecord(sharedData);
  if (!match) return toast("Your account is not linked to a student record yet");

  let conversation = sharedData.conversations.find((item) => item.studentId === match.student.id && item.classCode === match.classItem.code);
  if (!conversation) {
    conversation = {
      id: `conv-${match.classItem.code}-${match.student.id}`,
      classCode: match.classItem.code,
      studentId: match.student.id,
      studentName: match.student.name,
      messages: []
    };
    sharedData.conversations.push(conversation);
  }

  conversation.messages.push({
    senderRole: "student",
    senderName: `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || currentUser.username,
    senderUserId: currentUser.userId,
    text: message,
    createdAt: new Date().toISOString()
  });

  saveSharedData(sharedData);
  studentReplyMessage.value = "";
  renderPersonalUpdates();
  toast("Reply sent");
}

function submitFeedbackForm(feedbackId) {
  const textarea = document.getElementById(`feedback-response-${feedbackId}`);
  const response = textarea?.value.trim();
  if (!response) return toast("Write your feedback before submitting.");

  const sharedData = loadSharedData();
  const feedback = sharedData.feedbackForms.find((item) => item.id === feedbackId);
  if (!feedback) return toast("Feedback form not found.");

  feedback.response = response;
  feedback.respondedAt = new Date().toISOString();
  saveSharedData(sharedData);
  renderFeedbackForms();
  toast("Feedback submitted");
}

document.getElementById("prevMonth").addEventListener("click", () => {
  if (currentMonth === 0) {
    currentMonth = 11;
    currentYear -= 1;
  } else {
    currentMonth -= 1;
  }
  renderAttendance();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  if (currentMonth === 11) {
    currentMonth = 0;
    currentYear += 1;
  } else {
    currentMonth += 1;
  }
  renderAttendance();
});

if (sendStudentReply) sendStudentReply.addEventListener("click", sendReplyToTeacher);
if (closePdfReader) closePdfReader.addEventListener("click", hidePdfReader);
if (notificationToggle) notificationToggle.addEventListener("click", toggleNotifications);
if (studentFeedbackForms) {
  studentFeedbackForms.addEventListener("click", (event) => {
    const button = event.target.closest(".submit-feedback-btn");
    if (!button) return;
    submitFeedbackForm(button.getAttribute("data-feedback-id"));
  });
}

if (pdfReader) {
  pdfReader.addEventListener("click", (event) => {
    if (event.target === pdfReader) hidePdfReader();
  });
}

document.addEventListener("click", (event) => {
  if (!event.target.closest(".notification-shell") && notificationPanel) {
    notificationPanel.classList.add("hidden");
    notificationToggle?.setAttribute("aria-expanded", "false");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (pdfReader && !pdfReader.classList.contains("hidden")) hidePdfReader();
    notificationPanel?.classList.add("hidden");
    notificationToggle?.setAttribute("aria-expanded", "false");
  }
});

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY) return;
  renderStudentClasses();
  renderStudentFiles();
  renderPersonalUpdates();
  renderFeedbackForms();
  renderNotifications();
  renderAttendance();
});

async function initializeBackend() {
  try {
    const token = localStorage.getItem('attendance360Token');
    if (!token) return;
    
    // Fetch classes (Returns classes with teacher info and potentially files)
    const classesRes = await fetch('/api/classes', {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const classesData = await classesRes.json();
    
    // Fetch all files
    const filesRes = await fetch('/api/files', {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const filesData = await filesRes.json();

    // Fetch messages to/from this user (we'll fetch general conversation later or ignore for now)
    
    let sharedData = loadSharedData();
    
    if (classesRes.ok) {
        sharedData.classes = classesData.map(c => ({
            id: c.id,
            name: c.name,
            code: c.code,
            students: c.students ? c.students.map(cs => ({ id: cs.student.userId, name: cs.student.firstName + " " + cs.student.lastName, mobile: cs.student.phone })) : [],
            files: []
        }));
    }

    if (filesRes.ok) {
        sharedData.shared = filesData.map(f => ({
            id: f.id,
            title: f.title,
            type: f.type,
            class: f.class ? f.class.name : '',
            classCode: f.class ? f.class.code : '',
            notes: f.notes,
            files: f.fileUrl || "No attachment"
        }));
    }

    saveSharedData(sharedData);

    renderStudentClasses();
    renderStudentFiles();
    renderPersonalUpdates();
    renderFeedbackForms();
    renderNotifications();
    renderAttendance();

  } catch (err) {
    console.warn("Failed to init backend data", err);
  }
}

renderStudentClasses();
renderStudentFiles();
renderPersonalUpdates();
renderFeedbackForms();
renderNotifications();
renderAttendance();
showSection("home");
applyStudentProfile(currentUser);

initializeBackend();
