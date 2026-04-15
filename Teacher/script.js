const STORAGE_KEY = "attendance360-shared-data";
const USERS_KEY = "attendance360Users";
const SESSION_KEY = "attendance360CurrentUser";
const TEACHER_NOTIFICATION_STATE_KEY = "attendance360TeacherNotificationState";



const defaultShared = [];
const defaultAttendanceRecords = [];
const defaultDirectShares = [];
const defaultConversations = [];
const defaultNotifications = [];
const defaultFeedbackForms = [];

const savedData = loadSharedData();
const classes = savedData.classes;
const shared = savedData.shared;
const attendanceRecords = savedData.attendanceRecords;
const directShares = savedData.directShares;
const conversations = savedData.conversations;
const notifications = savedData.notifications;
const feedbackForms = savedData.feedbackForms;

const studentSearchInput = document.getElementById("studentSearch");
const attendanceDateInput = document.getElementById("attendanceDate");
const attendanceSearchInput = document.getElementById("attendanceSearch");
const studentListEl = document.getElementById("studentList");
const fileListEl = document.getElementById("fileList");
const fileUpload = document.getElementById("fileUpload");
const personalShareUpload = document.getElementById("personalShareUpload");
const sendFeedbackFormsButton = document.getElementById("sendFeedbackForms");
const feedbackClassSelect = document.getElementById("feedbackClass");
const teacherNotificationToggle = document.getElementById("teacherNotificationToggle");
const teacherNotificationBadge = document.getElementById("teacherNotificationBadge");
const teacherNotificationPanel = document.getElementById("teacherNotificationPanel");
const teacherNotificationList = document.getElementById("teacherNotificationList");
const teacherNotificationStatus = document.getElementById("teacherNotificationStatus");
const teacherNotificationIcon = document.querySelector("#teacherNotificationToggle .notification-icon");
const teacherNotificationStatusInline = document.getElementById("teacherNotificationStatusInline");

const profileToggle = document.getElementById("profileToggle");
const profileDropdown = document.getElementById("profileDropdown");
const openEditProfileButton = document.getElementById("openEditProfile");
const openTeacherPasswordPage = document.getElementById("openTeacherPasswordPage");
const logoutButton = document.getElementById("logoutButton");
const editProfileModal = document.getElementById("editProfileModal");
const closeEditProfileButton = document.getElementById("closeEditProfile");
const cancelEditProfileButton = document.getElementById("cancelEditProfile");
const saveProfileButton = document.getElementById("saveProfileButton");

const studentConnectModal = document.getElementById("studentConnectModal");
const closeStudentConnect = document.getElementById("closeStudentConnect");
const connectStudentName = document.getElementById("connectStudentName");
const connectStudentMeta = document.getElementById("connectStudentMeta");
const teacherChatThread = document.getElementById("teacherChatThread");
const teacherChatMessage = document.getElementById("teacherChatMessage");
const sendTeacherMessage = document.getElementById("sendTeacherMessage");
const callStudentButton = document.getElementById("callStudentButton");
const personalShareTitle = document.getElementById("personalShareTitle");
const personalShareType = document.getElementById("personalShareType");
const personalShareMarks = document.getElementById("personalShareMarks");
const personalShareNotes = document.getElementById("personalShareNotes");
const sharePersonalUpdate = document.getElementById("sharePersonalUpdate");
const personalSharePicked = document.getElementById("personalSharePicked");
const teacherStudentResources = document.getElementById("teacherStudentResources");
const studentResourceCount = document.getElementById("studentResourceCount");

let currentUser = getCurrentUser();
let activeStudentContext = null;

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch (error) {
    console.warn("Failed to load current user", error);
    return null;
  }
}

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch (error) {
    console.warn("Failed to load users", error);
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function persistCurrentUser(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function getTeacherNotificationSeenMap() {
  try {
    return JSON.parse(localStorage.getItem(TEACHER_NOTIFICATION_STATE_KEY) || "{}");
  } catch (error) {
    console.warn("Failed to load teacher notification state", error);
    return {};
  }
}

function getTeacherNotificationSeenAt() {
  if (!currentUser?.userId) return "";
  const map = getTeacherNotificationSeenMap();
  return map[currentUser.userId] || "";
}

function markTeacherNotificationsRead() {
  if (!currentUser?.userId) return;
  const map = getTeacherNotificationSeenMap();
  map[currentUser.userId] = new Date().toISOString();
  localStorage.setItem(TEACHER_NOTIFICATION_STATE_KEY, JSON.stringify(map));
}

function getDisplayName(user) {
  const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
  return fullName || user?.username || "Teacher";
}

function applyTeacherProfile(user) {
  if (!user || user.role !== "teacher") {
    window.location.href = "../Login/index.html";
    return;
  }

  const displayName = getDisplayName(user);
  const rolePill = document.getElementById("teacherRolePill");
  const welcome = document.getElementById("teacherWelcome");
  const intro = document.getElementById("teacherIntro");
  const summary = document.getElementById("teacherSummary");
  const name = document.getElementById("teacherName");
  const usernameText = document.getElementById("teacherUsernameText");
  const credentials = document.getElementById("teacherCredentials");
  const phone = document.getElementById("teacherPhone");
  const profileDisplayName = document.getElementById("profileDisplayName");
  const profileUsername = document.getElementById("profileUsername");
  const profileAvatar = document.getElementById("profileAvatar");

  if (rolePill) rolePill.textContent = `Logged in as ${user.username}`;
  if (welcome) welcome.textContent = `Welcome back, ${displayName}!`;
  if (intro) intro.textContent = "Use your teacher account to manage classes, share files, take attendance, and connect with students individually.";
  if (summary) summary.textContent = `Username: ${user.username} · Teacher ID: ${user.userId}`;
  if (name) name.textContent = displayName;
  if (usernameText) usernameText.textContent = `Username: ${user.username}`;
  if (credentials) credentials.textContent = `Teacher ID: ${user.userId} · ${user.email}`;
  if (phone) phone.textContent = user.phone ? `Phone: ${user.phone}` : "Phone not added";
  if (profileDisplayName) profileDisplayName.textContent = displayName;
  if (profileUsername) profileUsername.textContent = `@${user.username}`;
  if (profileAvatar) profileAvatar.textContent = (displayName[0] || "T").toUpperCase();
}

function loadSharedData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        classes: [], // Always fetch from backend
        shared: [], // Always fetch from backend
        attendanceRecords: [], // Always fetch from backend
        directShares: Array.isArray(parsed.directShares) ? parsed.directShares : [],
        conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
        feedbackForms: Array.isArray(parsed.feedbackForms) ? parsed.feedbackForms : []
      };
    }
  } catch (error) {
    console.warn("Failed to load shared data", error);
  }

  return {
    classes: [],
    shared: [],
    attendanceRecords: [],
    directShares: [],
    conversations: [],
    notifications: [],
    feedbackForms: []
  };
}

function persistSharedData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ classes, shared, attendanceRecords, directShares, conversations, notifications, feedbackForms }));
}

if (!localStorage.getItem(STORAGE_KEY)) {
  persistSharedData();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      dataUrl: reader.result
    });
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

document.querySelectorAll("nav a").forEach((a) => {
  a.addEventListener("click", () => {
    const target = a.getAttribute("data-target");
    if (target) showSection(target);
  });
});

document.querySelectorAll("button[data-target]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-target");
    if (target) showSection(target);
  });
});

if (fileUpload) {
  fileUpload.addEventListener("change", () => {
    const picked = fileUpload.files && fileUpload.files.length
      ? Array.from(fileUpload.files).map((file) => file.name).join(", ")
      : "No file chosen";
    document.getElementById("filePicked").textContent = picked;
  });
}

if (personalShareUpload) {
  personalShareUpload.addEventListener("change", () => {
    const picked = personalShareUpload.files && personalShareUpload.files.length
      ? Array.from(personalShareUpload.files).map((file) => file.name).join(", ")
      : "No file chosen";
    personalSharePicked.textContent = picked;
  });
}

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
  note.className = "toast";
  note.style.position = "fixed";
  note.style.bottom = "24px";
  note.style.right = "24px";
  note.style.padding = "12px 16px";
  note.style.background = "rgba(15,24,40,0.92)";
  note.style.color = "#e7eefc";
  note.style.border = "1px solid rgba(255,255,255,0.12)";
  note.style.borderRadius = "10px";
  note.style.boxShadow = "0 12px 30px rgba(0,0,0,0.35)";
  note.style.zIndex = "80";
  document.body.appendChild(note);
  setTimeout(() => note.remove(), 1800);
}

function refreshClassOptions() {
  const selects = [document.getElementById("studentClass"), document.getElementById("fileClass"), document.getElementById("attClass"), document.getElementById("feedbackClass")];
  selects.forEach((sel) => {
    const previousValue = sel.value;
    sel.innerHTML = "";
    if (sel.id === "fileClass") {
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Select class";
      placeholder.disabled = true;
      placeholder.selected = true;
      sel.appendChild(placeholder);
    }
    classes.forEach((classItem) => {
      const opt = document.createElement("option");
      opt.value = classItem.code;
      opt.textContent = `${classItem.name} (${classItem.code})`;
      sel.appendChild(opt);
    });
    if (classes.some((classItem) => classItem.code === previousValue)) sel.value = previousValue;
  });
}

function getClassByCode(code) {
  return classes.find((entry) => entry.code === code);
}

function getAttendanceRecord(classCode, date) {
  return attendanceRecords.find((record) => record.classCode === classCode && record.date === date);
}

function getStudentAttendanceEntries(studentId, classCode = "") {
  return attendanceRecords
    .map((record) => {
      if (classCode && record.classCode !== classCode) return null;
      const present = record.present?.some((student) => student.id === studentId);
      const absent = record.absent?.some((student) => student.id === studentId);
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

function pushNotification(studentId, title, message, type = "GENERAL") {
  notifications.unshift({
    id: `note-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    studentId,
    title,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString()
  });
}

function getEligibleFeedbackStudents(classCode) {
  const classItem = getClassByCode(classCode);
  if (!classItem) return [];
  return classItem.students.filter((student) => {
    const stats = getAttendanceStats(getStudentAttendanceEntries(student.id, classCode));
    return stats.total > 0 && stats.percent > 60;
  });
}

function getTeacherNotificationItems() {
  if (!currentUser?.userId) return [];

  const feedbackItems = feedbackForms
    .filter((form) => form.teacherUserId === currentUser.userId && form.response?.trim() && form.respondedAt)
    .map((form) => ({
      id: `feedback-${form.id}`,
      type: "feedback",
      classCode: form.classCode,
      title: `${form.studentName} submitted feedback`,
      message: `${form.className}: ${form.title}`,
      detail: form.response.trim(),
      createdAt: form.respondedAt
    }));

  const studentReplyItems = conversations.flatMap((conversation) =>
    (conversation.messages || [])
      .filter((message) => message.senderRole === "student")
      .map((message, index) => ({
        id: `reply-${conversation.id}-${index}`,
        type: "reply",
        classCode: conversation.classCode,
        title: `${message.senderName} sent a reply`,
        message: `${conversation.studentName} · ${getClassByCode(conversation.classCode)?.name || conversation.classCode}`,
        detail: message.text,
        createdAt: message.createdAt
      }))
  );

  return [...feedbackItems, ...studentReplyItems]
    .filter((item) => item.createdAt)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function renderTeacherNotifications() {
  if (!teacherNotificationList || !teacherNotificationBadge || !teacherNotificationStatus) return;

  if (teacherNotificationIcon) teacherNotificationIcon.textContent = String.fromCodePoint(0x1F514);
  const items = getTeacherNotificationItems();
  const seenAt = getTeacherNotificationSeenAt();
  const unreadCount = items.filter((item) => !seenAt || new Date(item.createdAt) > new Date(seenAt)).length;

  teacherNotificationBadge.textContent = unreadCount;
  teacherNotificationBadge.classList.toggle("hidden", unreadCount === 0);
  teacherNotificationStatus.textContent = `${unreadCount} unread`;
  if (teacherNotificationStatusInline) teacherNotificationStatusInline.textContent = `${items.length} total updates`;
  teacherNotificationList.innerHTML = "";

  if (!items.length) {
    teacherNotificationList.innerHTML = '<div class="item column"><strong>No notifications yet</strong><p>Student replies and submitted feedback will appear here.</p></div>';
    return;
  }

  items.slice(0, 12).forEach((item) => {
    const isUnread = !seenAt || new Date(item.createdAt) > new Date(seenAt);
    const card = document.createElement("div");
    card.className = `notification-card${isUnread ? " unread" : ""}`;
    card.innerHTML = `<strong>${item.title}</strong><p>${item.message}</p><p>${item.detail}</p><p class="muted small">${formatTimestamp(item.createdAt)}</p>`;
    card.addEventListener("click", () => {
      if (item.type === "feedback") {
        if (feedbackClassSelect && item.classCode) feedbackClassSelect.value = item.classCode;
        renderFeedbackEligibility();
        renderTeacherFeedbackResponses();
        showSection("feedback");
      }
    });
    teacherNotificationList.appendChild(card);
  });
}

function toggleTeacherNotifications() {
  if (!teacherNotificationPanel || !teacherNotificationToggle) return;
  const willOpen = teacherNotificationPanel.classList.contains("hidden");
  teacherNotificationPanel.classList.toggle("hidden", !willOpen);
  teacherNotificationToggle.setAttribute("aria-expanded", String(willOpen));
  if (willOpen) {
    markTeacherNotificationsRead();
    renderTeacherNotifications();
  }
}

function renderClasses() {
  const list = document.getElementById("classList");
  list.innerHTML = "";
  classes.forEach((classItem) => {
    const div = document.createElement("div");
    div.className = "item";
    const stats = getAttendanceStats(classItem.students.flatMap((student) => getStudentAttendanceEntries(student.id, classItem.code)));
    div.innerHTML = `<div><strong>${classItem.name}</strong><p>Code: ${classItem.code} · ${classItem.students.length} students · Avg attendance ${stats.percent}%</p></div><span class="badge">Active</span>`;
    list.appendChild(div);
  });
  refreshClassOptions();
  renderAttendanceWorkspace();
  renderFeedbackEligibility();
}
async function createClass() {
  const name = document.getElementById("className").value.trim();
  const code = document.getElementById("classCode").value.trim();
  if (!name || !code) return toast("Add class name and code");

  try {
    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('attendance360Token')
      },
      body: JSON.stringify({ name, code })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    classes.push({ id: data.id, name: data.name, code: data.code, students: [], files: [] });
    // persistSharedData(); is now obsolete here
    document.getElementById("className").value = "";
    document.getElementById("classCode").value = "";
    renderClasses();
    toast("Class created");
  } catch (error) {
    toast(error.message || "Failed to create class");
  }
}

function getConversation(classCode, studentId, studentName) {
  let conversation = conversations.find((entry) => entry.classCode === classCode && entry.studentId === studentId);
  if (!conversation) {
    conversation = {
      id: `conv-${classCode}-${studentId}`,
      classCode,
      studentId,
      studentName,
      messages: []
    };
    conversations.push(conversation);
  }
  return conversation;
}

function getStudentDirectShares(studentId) {
  return directShares
    .filter((entry) => entry.studentId === studentId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function renderStudents() {
  const list = document.getElementById("studentList");
  const query = (studentSearchInput?.value || "").trim().toLowerCase();
  list.innerHTML = "";
  let matches = 0;

  classes.forEach((classItem) => {
    classItem.students.forEach((student, idx) => {
      const searchBlob = `${student.name} ${student.id} ${student.mobile}`.toLowerCase();
      if (query && !searchBlob.includes(query)) return;
      const studentShareCount = getStudentDirectShares(student.id).length;
      const conversation = getConversation(classItem.code, student.id, student.name);
      const replyCount = conversation.messages.filter((message) => message.senderRole === "student").length;
      const attendanceStats = getAttendanceStats(getStudentAttendanceEntries(student.id, classItem.code));
      const div = document.createElement("div");
      div.className = "item";
      const marksText = student.marks != null ? ` · Marks: ${student.marks}` : "";
      div.innerHTML = `<div><strong>${student.name}</strong><p>${classItem.name} · ${student.id} · ${student.mobile}${marksText}</p><p class="muted small">Attendance: ${attendanceStats.percent}% · Personal shares: ${studentShareCount} · Student replies: ${replyCount}</p></div>
        <div class="item-actions">
          <button class="chat-btn open-student-connect" data-class="${classItem.code}" data-idx="${idx}" aria-label="Open chat with ${student.name}">Chat</button>
          <button class="danger-btn remove-student-btn" data-class="${classItem.code}" data-idx="${idx}" aria-label="Remove ${student.name}">Remove</button>
        </div>`;
      list.appendChild(div);
      matches += 1;
    });
  });

  if (!matches) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = query
      ? "No student found for that name, ID, or mobile number."
      : "No students added yet.";
    list.appendChild(empty);
  }
}

async function addStudent() {
  const name = document.getElementById("studentName").value.trim();
  const id = document.getElementById("studentId").value.trim();
  const mobile = document.getElementById("studentMobile").value.trim();
  const code = document.getElementById("studentClass").value;
  if (!name || !id || !mobile || !code) return toast("Add student name, ID, mobile, and pick a class");

  const classItem = getClassByCode(code);
  if (!classItem) return toast("Class not found");

  try {
    // Note: classItem must have an .id property from DB!
    const res = await fetch(`/api/classes/${classItem.id}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('attendance360Token')
      },
      body: JSON.stringify({ studentId: id })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    classItem.students.push({ name, id, mobile, marks: null });

    document.getElementById("studentName").value = "";
    document.getElementById("studentId").value = "";
    document.getElementById("studentMobile").value = "";
    renderStudents();
    renderAttendanceWorkspace();
    renderAttendanceSearchResults();
    renderFeedbackEligibility();
    toast("Student added");
  } catch (err) {
    toast(err.message || "Failed to add student. Ensure ID exists.");
  }
}

async function shareFile() {
  const title = document.getElementById("fileTitle").value.trim();
  const type = document.getElementById("fileType").value;
  const code = document.getElementById("fileClass").value;
  const notes = document.getElementById("fileNotes").value.trim();
  const upload = document.getElementById("fileUpload");
  if (!title || !code) return toast("Add title and class");

  const classItem = getClassByCode(code);
  if (!classItem) return toast("Class not found");

  try {
    const res = await fetch('/api/files', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('attendance360Token')
      },
      body: JSON.stringify({
        title,
        type,
        notes,
        classId: classItem.id
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const attachments = upload.files && upload.files.length
      ? await Promise.all(Array.from(upload.files).map(readFileAsDataUrl))
      : [];
    const pickedNames = attachments.length ? attachments.map((file) => file.name).join(", ") : "No attachment";

    const entry = {
      id: data.id,
      title,
      type,
      class: classItem.name,
      classCode: classItem.code,
      notes,
      files: pickedNames,
      attachments
    };

    shared.unshift(entry);
    classItem.files.push(entry);

    document.getElementById("fileTitle").value = "";
    document.getElementById("fileNotes").value = "";
    document.getElementById("fileUpload").value = "";
    document.getElementById("filePicked").textContent = "No file chosen";
    renderFiles();
    toast("Shared successfully");
  } catch (err) {
    toast(err.message || "Failed to share file");
  }
}

function renderFiles() {
  const list = document.getElementById("fileList");
  list.innerHTML = "";
  shared.forEach((item, sharedIndex) => {
    const div = document.createElement("div");
    div.className = "item";
    const fileLabel = item.attachments?.length ? item.attachments.map((file) => file.name).join(", ") : (item.files || "No attachment");
    div.innerHTML = `<div><strong>${item.title}</strong><p>${item.class}</p><p class="muted">${fileLabel}</p><p class="muted">${item.notes || "No notes"}</p></div>
      <div class="item-actions">
        <span class="badge">${item.type}</span>
        <button class="danger-btn delete-file-btn" data-file-index="${sharedIndex}" aria-label="Delete ${item.title}">Delete</button>
      </div>`;
    list.appendChild(div);
  });
}

function removeStudent(classCode, idx) {
  const classItem = getClassByCode(classCode);
  if (!classItem || !classItem.students[idx]) return;
  const [removedStudent] = classItem.students.splice(idx, 1);

  for (let shareIndex = directShares.length - 1; shareIndex >= 0; shareIndex -= 1) {
    if (directShares[shareIndex].studentId === removedStudent.id) directShares.splice(shareIndex, 1);
  }

  for (let conversationIndex = conversations.length - 1; conversationIndex >= 0; conversationIndex -= 1) {
    if (conversations[conversationIndex].studentId === removedStudent.id) conversations.splice(conversationIndex, 1);
  }
  for (let noteIndex = notifications.length - 1; noteIndex >= 0; noteIndex -= 1) {
    if (notifications[noteIndex].studentId === removedStudent.id) notifications.splice(noteIndex, 1);
  }
  for (let formIndex = feedbackForms.length - 1; formIndex >= 0; formIndex -= 1) {
    if (feedbackForms[formIndex].studentId === removedStudent.id) feedbackForms.splice(formIndex, 1);
  }

  if (activeStudentContext?.studentId === removedStudent.id) closeStudentConnectModal();

  persistSharedData();
  renderStudents();
  renderClasses();
  renderAttendanceWorkspace();
  renderAttendanceSearchResults();
  renderFeedbackEligibility();
  toast(`${removedStudent.name} removed from ${classItem.name}`);
}

function deleteSharedFile(sharedIndex) {
  const item = shared[sharedIndex];
  if (!item) return;
  shared.splice(sharedIndex, 1);
  classes.forEach((classItem) => {
    classItem.files = classItem.files.filter((file) => file.id !== item.id);
  });
  persistSharedData();
  renderFiles();
  toast(`${item.title} deleted`);
}

function renderAttendanceWorkspace() {
  const code = document.getElementById("attClass").value || classes[0]?.code;
  const classItem = getClassByCode(code);
  if (!classItem) return;

  const attendanceDate = attendanceDateInput?.value;
  const record = attendanceDate ? getAttendanceRecord(code, attendanceDate) : null;
  const tbody = document.getElementById("attTable");
  const classStats = document.getElementById("attendanceClassStats");
  const coverage = document.getElementById("attendanceCoverage");
  const loadedChip = document.getElementById("loadedAttendanceRecord");

  tbody.innerHTML = "";
  if (classStats) classStats.textContent = `${classItem.students.length} students`;
  if (coverage) {
    coverage.textContent = record
      ? `Loaded saved attendance for ${formatAttendanceDate(attendanceDate)}. You can update it and save again.`
      : "No record exists for the selected date yet. This fresh sheet can be used for today or any past date.";
  }
  if (loadedChip) loadedChip.textContent = record ? `Loaded ${formatAttendanceDate(attendanceDate)}` : "Fresh sheet";

  classItem.students.forEach((student) => {
    const tr = document.createElement("tr");
    const checked = record ? record.present.some((entry) => entry.id === student.id) : true;
    tr.dataset.studentName = student.name;
    tr.dataset.studentId = student.id;
    tr.innerHTML = `<td>${student.name}</td>
      <td>${student.id}</td>
      <td>${checked ? "Present" : "Absent"}</td>
      <td><label class="toggle"><input type="checkbox" ${checked ? "checked" : ""}><span>Mark</span></label></td>`;
    tbody.appendChild(tr);
  });

  updateCount();
  renderFeedbackEligibility();
}

function updateCount() {
  const rows = Array.from(document.querySelectorAll("#attTable tr"));
  let present = 0;
  let absent = 0;

  rows.forEach((row) => {
    const checkbox = row.querySelector("input[type='checkbox']");
    const statusCell = row.children[2];
    const isPresent = Boolean(checkbox?.checked);
    if (statusCell) statusCell.textContent = isPresent ? "Present" : "Absent";
    if (isPresent) present += 1;
    else absent += 1;
  });

  document.getElementById("presentCount").textContent = `Present: ${present}`;
  document.getElementById("absentCount").textContent = `Absent: ${absent}`;
}

function formatAttendanceDate(value) {
  if (!value) return "No date";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function renderAttendanceHistory() {
  const list = document.getElementById("attendanceHistoryList");
  const count = document.getElementById("attendanceHistoryCount");
  if (!list || !count) return;

  list.innerHTML = "";
  count.textContent = `${attendanceRecords.length} record${attendanceRecords.length === 1 ? "" : "s"}`;

  if (!attendanceRecords.length) {
    list.innerHTML = '<div class="item column"><strong>No attendance saved yet</strong><p>Saved class attendance will appear here with the present and absent students for each day.</p></div>';
    return;
  }

  attendanceRecords.forEach((record) => {
    const card = document.createElement("div");
    card.className = "item column attendance-record";
    const presentNames = record.present.length ? record.present.map((student) => `${student.name} (${student.id})`).join(", ") : "None";
    const absentNames = record.absent.length ? record.absent.map((student) => `${student.name} (${student.id})`).join(", ") : "None";
    card.innerHTML = `
      <div class="attendance-record-head">
        <div>
          <strong>${record.className}</strong>
          <p>${record.classCode} · ${formatAttendanceDate(record.date)}</p>
        </div>
        <div class="attendance-record-actions">
          <span class="badge">${record.present.length} Present / ${record.absent.length} Absent</span>
          <button class="ghost-btn load-attendance-btn" data-class="${record.classCode}" data-date="${record.date}" type="button">Load Record</button>
        </div>
      </div>
      <div class="attendance-split">
        <div class="attendance-block present-block">
          <strong>Present</strong>
          <p>${presentNames}</p>
        </div>
        <div class="attendance-block absent-block">
          <strong>Absent</strong>
          <p>${absentNames}</p>
        </div>
      </div>
    `;
    list.appendChild(card);
  });
}

function saveAttendance() {
  const classCode = document.getElementById("attClass").value || classes[0]?.code;
  const classItem = getClassByCode(classCode);
  const attendanceDate = attendanceDateInput?.value;

  if (!classItem) return toast("Select a class first");
  if (!attendanceDate) return toast("Pick an attendance date");
  const previousRecord = getAttendanceRecord(classCode, attendanceDate);

  const rows = Array.from(document.querySelectorAll("#attTable tr"));
  const present = [];
  const absent = [];

  rows.forEach((row) => {
    const student = { name: row.dataset.studentName || "", id: row.dataset.studentId || "" };
    const checked = Boolean(row.querySelector("input[type='checkbox']")?.checked);
    if (checked) present.push(student);
    else absent.push(student);
  });

  const existingRecordIndex = attendanceRecords.findIndex((record) => record.classCode === classItem.code && record.date === attendanceDate);
  const record = {
    className: classItem.name,
    classCode: classItem.code,
    date: attendanceDate,
    present,
    absent,
    savedAt: new Date().toISOString()
  };

  if (existingRecordIndex >= 0) attendanceRecords.splice(existingRecordIndex, 1);

  attendanceRecords.unshift(record);
  classItem.students.forEach((student) => {
    const oldStatus = previousRecord?.present?.some((entry) => entry.id === student.id) ? "Present"
      : previousRecord?.absent?.some((entry) => entry.id === student.id) ? "Absent"
        : "";
    const newStatus = present.some((entry) => entry.id === student.id) ? "Present" : "Absent";
    const message = oldStatus && oldStatus !== newStatus
      ? `${classItem.name}: attendance for ${formatAttendanceDate(attendanceDate)} was updated to ${newStatus}.`
      : `${classItem.name}: attendance for ${formatAttendanceDate(attendanceDate)} was marked ${newStatus}.`;
    pushNotification(student.id, "Attendance updated", message, "ATTENDANCE");
  });
  persistSharedData();
  renderAttendanceWorkspace();
  renderAttendanceHistory();
  renderAttendanceSearchResults();
  renderFeedbackEligibility();
  renderStudents();
  toast(`Attendance saved for ${classItem.name} on ${formatAttendanceDate(attendanceDate)}`);
}

function renderAttendanceSearchResults() {
  const list = document.getElementById("attendanceRecordResults");
  const summary = document.getElementById("attendanceSearchSummary");
  if (!list || !summary) return;

  const query = (attendanceSearchInput?.value || "").trim().toLowerCase();
  const allStudents = classes.flatMap((classItem) => classItem.students.map((student) => ({
    ...student,
    className: classItem.name
  })));

  list.innerHTML = "";
  if (!query) {
    summary.textContent = "Search a student";
    list.innerHTML = '<div class="empty-state">Search a student by name or ID to review each attendance entry and the overall percentage.</div>';
    return;
  }

  const matches = allStudents.filter((student) => `${student.name} ${student.id}`.toLowerCase().includes(query));
  if (!matches.length) {
    summary.textContent = "No match";
    list.innerHTML = '<div class="empty-state">No student matched that name or ID.</div>';
    return;
  }

  summary.textContent = `${matches.length} match${matches.length === 1 ? "" : "es"}`;
  matches.forEach((student) => {
    const entries = getStudentAttendanceEntries(student.id);
    const stats = getAttendanceStats(entries);
    const card = document.createElement("div");
    card.className = "student-record-card";
    card.innerHTML = `
      <strong>${student.name}</strong>
      <p>${student.className} · ${student.id}</p>
      <div class="student-record-summary">
        <div class="mini-stat"><strong>${stats.percent}%</strong><span class="muted small">Overall attendance</span></div>
        <div class="mini-stat"><strong>${stats.present}</strong><span class="muted small">Present</span></div>
        <div class="mini-stat"><strong>${stats.absent}</strong><span class="muted small">Absent</span></div>
      </div>
      <div class="attendance-line-list">
        ${entries.length ? entries.map((entry) => `
          <div class="attendance-line-item">
            <div>
              <strong>${entry.className}</strong>
              <p>${formatAttendanceDate(entry.date)}</p>
            </div>
            <span class="status-pill ${entry.status.toLowerCase()}">${entry.status}</span>
          </div>
        `).join("") : '<div class="empty-state">No saved attendance records for this student yet.</div>'}
      </div>
    `;
    list.appendChild(card);
  });
}

function renderFeedbackEligibility() {
  const classCode = feedbackClassSelect?.value || classes[0]?.code;
  const eligible = getEligibleFeedbackStudents(classCode);
  const chip = document.getElementById("eligibleFeedbackCount");
  if (chip) chip.textContent = `${eligible.length} eligible`;
}

function renderTeacherFeedbackResponses() {
  const list = document.getElementById("teacherFeedbackResponseList");
  const count = document.getElementById("teacherFeedbackResponseCount");
  if (!list || !count) return;

  const classCode = feedbackClassSelect?.value || classes[0]?.code;
  const responses = feedbackForms
    .filter((form) => form.teacherUserId === currentUser?.userId && form.classCode === classCode && form.response?.trim() && form.respondedAt)
    .sort((a, b) => new Date(b.respondedAt) - new Date(a.respondedAt));

  count.textContent = `${responses.length} response${responses.length === 1 ? "" : "s"}`;
  list.innerHTML = "";

  if (!responses.length) {
    list.innerHTML = '<div class="item column"><strong>No submitted feedback yet</strong><p>Once students send their responses, they will appear here class-wise.</p></div>';
    return;
  }

  responses.forEach((form) => {
    const card = document.createElement("div");
    card.className = "feedback-response-card";
    card.innerHTML = `
      <div class="section-head wrap">
        <div>
          <strong>${form.studentName}</strong>
          <p>${form.studentId} · ${form.className}</p>
        </div>
        <span class="chip">${formatTimestamp(form.respondedAt)}</span>
      </div>
      <p><strong>${form.title}</strong></p>
      <p class="muted">${form.prompt}</p>
      <div class="feedback-response-body">${form.response}</div>
    `;
    list.appendChild(card);
  });
}

function sendFeedbackBroadcast() {
  const classCode = feedbackClassSelect?.value || classes[0]?.code;
  const classItem = getClassByCode(classCode);
  const title = document.getElementById("feedbackTitle").value.trim() || "Class feedback form";
  const prompt = document.getElementById("feedbackPrompt").value.trim();

  if (!classItem) return toast("Choose a class first");
  if (!prompt) return toast("Add a feedback prompt first");

  const eligibleStudents = getEligibleFeedbackStudents(classCode);
  if (!eligibleStudents.length) return toast("No students above 60% attendance for this class yet");

  eligibleStudents.forEach((student) => {
    feedbackForms.unshift({
      id: `feedback-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      classCode: classItem.code,
      className: classItem.name,
      studentId: student.id,
      studentName: student.name,
      teacherUserId: currentUser.userId,
      teacherName: getDisplayName(currentUser),
      title,
      prompt,
      createdAt: new Date().toISOString(),
      response: "",
      respondedAt: ""
    });
    pushNotification(student.id, "Feedback form received", `${title} is available for ${classItem.name}.`, "FEEDBACK");
  });

  persistSharedData();
  document.getElementById("feedbackTitle").value = "";
  document.getElementById("feedbackPrompt").value = "";
  renderFeedbackEligibility();
  renderTeacherFeedbackResponses();
  renderTeacherNotifications();
  toast(`Feedback form sent to ${eligibleStudents.length} student${eligibleStudents.length === 1 ? "" : "s"}`);
}
function formatTimestamp(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  });
}

function getStudentContext(classCode, idx) {
  const classItem = classes.find((entry) => entry.code === classCode);
  if (!classItem || !classItem.students[idx]) return null;
  const student = classItem.students[idx];
  return {
    classCode,
    className: classItem.name,
    idx,
    studentId: student.id,
    studentName: student.name,
    studentMobile: student.mobile || "",
    student
  };
}

function openStudentConnectModal(classCode, idx) {
  const context = getStudentContext(classCode, idx);
  if (!context) return;
  activeStudentContext = context;
  connectStudentName.textContent = context.studentName;
  connectStudentMeta.textContent = `${context.className} · ${context.studentId} · ${context.studentMobile || "No mobile"}`;
  teacherChatMessage.value = "";
  personalShareTitle.value = "";
  personalShareNotes.value = "";
  personalShareMarks.value = context.student.marks ?? "";
  personalShareType.value = context.student.marks != null ? "MARKS" : "FILE";
  personalShareUpload.value = "";
  personalSharePicked.textContent = "No file chosen";
  renderTeacherConversation();
  renderTeacherStudentResources();
  studentConnectModal.classList.remove("hidden");
}

function closeStudentConnectModal() {
  studentConnectModal.classList.add("hidden");
  activeStudentContext = null;
}

function renderTeacherConversation() {
  if (!activeStudentContext) return;
  const conversation = getConversation(activeStudentContext.classCode, activeStudentContext.studentId, activeStudentContext.studentName);
  teacherChatThread.innerHTML = "";

  if (!conversation.messages.length) {
    teacherChatThread.innerHTML = '<div class="empty-state">No messages yet. Start the conversation with this student.</div>';
    return;
  }

  conversation.messages.forEach((message) => {
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${message.senderRole}`;
    bubble.innerHTML = `<span class="chat-meta">${message.senderName} · ${formatTimestamp(message.createdAt)}</span><div>${message.text}</div>`;
    teacherChatThread.appendChild(bubble);
  });
  teacherChatThread.scrollTop = teacherChatThread.scrollHeight;
}

function renderTeacherStudentResources() {
  if (!activeStudentContext) return;
  const resources = getStudentDirectShares(activeStudentContext.studentId);
  teacherStudentResources.innerHTML = "";
  studentResourceCount.textContent = `${resources.length} item${resources.length === 1 ? "" : "s"}`;

  if (!resources.length) {
    teacherStudentResources.innerHTML = '<div class="empty-state">No personal files, marks, or notes shared with this student yet.</div>';
    return;
  }

  resources.forEach((resource) => {
    const card = document.createElement("div");
    const attachmentText = resource.attachments?.length ? resource.attachments.map((file) => file.name).join(", ") : "No attachment";
    const marksText = resource.marks != null ? `<p>Marks: ${resource.marks}</p>` : "";
    card.className = "resource-card";
    card.innerHTML = `<strong>${resource.title}</strong><p>${resource.type} · ${formatTimestamp(resource.createdAt)}</p>${marksText}<p>${resource.notes || "No notes added."}</p><p class="muted">${attachmentText}</p>`;
    teacherStudentResources.appendChild(card);
  });
}

function sendTeacherMessageToStudent() {
  if (!activeStudentContext) return;
  const text = teacherChatMessage.value.trim();
  if (!text) return toast("Type a message first");
  const conversation = getConversation(activeStudentContext.classCode, activeStudentContext.studentId, activeStudentContext.studentName);
  conversation.messages.push({
    senderRole: "teacher",
    senderName: getDisplayName(currentUser),
    senderUserId: currentUser.userId,
    text,
    createdAt: new Date().toISOString()
  });
  pushNotification(activeStudentContext.studentId, "New teacher message", `${getDisplayName(currentUser)} sent you a message in ${activeStudentContext.className}.`, "MESSAGE");
  persistSharedData();
  teacherChatMessage.value = "";
  renderTeacherConversation();
  renderStudents();
  toast("Message sent");
}

async function shareIndividualUpdate() {
  if (!activeStudentContext) return;

  const type = personalShareType.value;
  const title = personalShareTitle.value.trim() || (type === "MARKS" ? "Marks update" : type === "NOTE" ? "Teacher note" : "Shared file");
  const notes = personalShareNotes.value.trim();
  const marksRaw = personalShareMarks.value.trim();
  const marks = marksRaw ? Number(marksRaw) : null;
  const attachments = personalShareUpload.files && personalShareUpload.files.length
    ? await Promise.all(Array.from(personalShareUpload.files).map(readFileAsDataUrl))
    : [];

  if (type === "MARKS" && (marks === null || Number.isNaN(marks) || marks < 0 || marks > 100)) return toast("Enter marks between 0 and 100");
  if (type === "FILE" && !attachments.length && !notes) return toast("Attach a file or add notes");
  if (type === "NOTE" && !notes) return toast("Add notes for the student");

  const resource = {
    id: `direct-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    classCode: activeStudentContext.classCode,
    className: activeStudentContext.className,
    studentId: activeStudentContext.studentId,
    studentName: activeStudentContext.studentName,
    teacherUserId: currentUser.userId,
    teacherName: getDisplayName(currentUser),
    type,
    title,
    notes,
    marks: type === "MARKS" ? marks : null,
    attachments,
    createdAt: new Date().toISOString()
  };

  directShares.unshift(resource);
  if (type === "MARKS") activeStudentContext.student.marks = marks;
  pushNotification(activeStudentContext.studentId, "New personal update", `${title} was shared with you by ${getDisplayName(currentUser)}.`, "PERSONAL");

  persistSharedData();
  personalShareTitle.value = "";
  personalShareNotes.value = "";
  personalShareUpload.value = "";
  personalSharePicked.textContent = "No file chosen";
  if (type !== "MARKS") personalShareMarks.value = activeStudentContext.student.marks ?? "";
  renderTeacherStudentResources();
  renderStudents();
  toast("Shared with student");
}

function setDropdownOpen(isOpen) {
  if (!profileDropdown || !profileToggle) return;
  profileDropdown.classList.toggle("hidden", !isOpen);
  profileToggle.setAttribute("aria-expanded", String(isOpen));
}

function fillEditProfileForm(user) {
  document.getElementById("editFirstName").value = user.firstName || "";
  document.getElementById("editLastName").value = user.lastName || "";
  document.getElementById("editUsername").value = user.username || "";
  document.getElementById("editEmail").value = user.email || "";
  document.getElementById("editPhone").value = user.phone || "";
}

function openEditProfile() {
  if (!currentUser) return;
  fillEditProfileForm(currentUser);
  editProfileModal.classList.remove("hidden");
  setDropdownOpen(false);
}

function closeEditProfile() {
  editProfileModal.classList.add("hidden");
}

function saveProfile() {
  if (!currentUser) return;

  const firstName = document.getElementById("editFirstName").value.trim();
  const lastName = document.getElementById("editLastName").value.trim();
  const username = document.getElementById("editUsername").value.trim();
  const email = document.getElementById("editEmail").value.trim();
  const phone = document.getElementById("editPhone").value.trim();

  if (!firstName || !lastName || !username || !email || !phone) return toast("Fill in all profile fields");

  const users = getUsers();
  const usernameTaken = users.some((user) => user.userId !== currentUser.userId && (user.username || "").toLowerCase() === username.toLowerCase());
  if (usernameTaken) return toast("This username is already taken");

  const emailTaken = users.some((user) => user.userId !== currentUser.userId && (user.email || "").toLowerCase() === email.toLowerCase());
  if (emailTaken) return toast("This email is already in use");

  const updatedUser = { ...currentUser, firstName, lastName, username, email, phone };
  const updatedUsers = users.map((user) => user.userId === currentUser.userId ? { ...user, ...updatedUser } : user);
  saveUsers(updatedUsers);
  persistCurrentUser(updatedUser);
  currentUser = updatedUser;
  applyTeacherProfile(currentUser);
  closeEditProfile();
  toast("Profile updated");
}

function openTeacherPasswordReset() {
  localStorage.setItem("attendance360AuthPrefill", JSON.stringify({ role: "teacher", mode: "login", forgot: true }));
  window.location.href = "../Login/index.html";
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "../Login/index.html";
}
if (studentListEl) {
  studentListEl.addEventListener("click", (event) => {
    const removeBtn = event.target.closest(".remove-student-btn");
    if (removeBtn) {
      removeStudent(removeBtn.getAttribute("data-class"), Number(removeBtn.getAttribute("data-idx")));
      return;
    }
    const chatBtn = event.target.closest(".open-student-connect");
    if (chatBtn) openStudentConnectModal(chatBtn.getAttribute("data-class"), Number(chatBtn.getAttribute("data-idx")));
  });
}

if (fileListEl) {
  fileListEl.addEventListener("click", (event) => {
    const deleteBtn = event.target.closest(".delete-file-btn");
    if (!deleteBtn) return;
    deleteSharedFile(Number(deleteBtn.getAttribute("data-file-index")));
  });
}

if (studentSearchInput) studentSearchInput.addEventListener("input", renderStudents);
if (attendanceSearchInput) attendanceSearchInput.addEventListener("input", renderAttendanceSearchResults);
if (attendanceDateInput) attendanceDateInput.addEventListener("change", renderAttendanceWorkspace);
if (feedbackClassSelect) {
  feedbackClassSelect.addEventListener("change", () => {
    renderFeedbackEligibility();
    renderTeacherFeedbackResponses();
  });
}
if (sendFeedbackFormsButton) sendFeedbackFormsButton.addEventListener("click", sendFeedbackBroadcast);
if (teacherNotificationToggle) teacherNotificationToggle.addEventListener("click", toggleTeacherNotifications);
if (profileToggle) profileToggle.addEventListener("click", () => setDropdownOpen(profileDropdown.classList.contains("hidden")));
if (openEditProfileButton) openEditProfileButton.addEventListener("click", openEditProfile);
if (openTeacherPasswordPage) openTeacherPasswordPage.addEventListener("click", openTeacherPasswordReset);
if (logoutButton) logoutButton.addEventListener("click", logout);
if (closeEditProfileButton) closeEditProfileButton.addEventListener("click", closeEditProfile);
if (cancelEditProfileButton) cancelEditProfileButton.addEventListener("click", closeEditProfile);
if (saveProfileButton) saveProfileButton.addEventListener("click", saveProfile);
if (sendTeacherMessage) sendTeacherMessage.addEventListener("click", sendTeacherMessageToStudent);
if (sharePersonalUpdate) sharePersonalUpdate.addEventListener("click", shareIndividualUpdate);
if (closeStudentConnect) closeStudentConnect.addEventListener("click", closeStudentConnectModal);
if (callStudentButton) {
  callStudentButton.addEventListener("click", () => {
    if (!activeStudentContext?.studentMobile) return toast("No mobile number on record");
    window.location.href = `tel:${activeStudentContext.studentMobile}`;
  });
}

document.getElementById("attTable")?.addEventListener("change", (event) => {
  if (event.target.matches("input[type='checkbox']")) updateCount();
});

document.getElementById("attendanceHistoryList")?.addEventListener("click", (event) => {
  const button = event.target.closest(".load-attendance-btn");
  if (!button) return;
  document.getElementById("attClass").value = button.getAttribute("data-class");
  if (attendanceDateInput) attendanceDateInput.value = button.getAttribute("data-date");
  showSection("attendance");
  renderAttendanceWorkspace();
});

if (studentConnectModal) {
  studentConnectModal.addEventListener("click", (event) => {
    if (event.target === studentConnectModal) closeStudentConnectModal();
  });
}

if (editProfileModal) {
  editProfileModal.addEventListener("click", (event) => {
    if (event.target === editProfileModal) closeEditProfile();
  });
}

document.addEventListener("click", (event) => {
  if (!event.target.closest(".notification-shell")) {
    teacherNotificationPanel?.classList.add("hidden");
    teacherNotificationToggle?.setAttribute("aria-expanded", "false");
  }
  if (!event.target.closest(".profile-menu")) setDropdownOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    teacherNotificationPanel?.classList.add("hidden");
    teacherNotificationToggle?.setAttribute("aria-expanded", "false");
    setDropdownOpen(false);
    closeEditProfile();
    closeStudentConnectModal();
  }
});

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY) return;
  const latest = loadSharedData();
  classes.splice(0, classes.length, ...latest.classes);
  shared.splice(0, shared.length, ...latest.shared);
  attendanceRecords.splice(0, attendanceRecords.length, ...latest.attendanceRecords);
  directShares.splice(0, directShares.length, ...latest.directShares);
  conversations.splice(0, conversations.length, ...latest.conversations);
  notifications.splice(0, notifications.length, ...latest.notifications);
  feedbackForms.splice(0, feedbackForms.length, ...latest.feedbackForms);
  renderClasses();
  renderStudents();
  renderFiles();
  renderAttendanceHistory();
  renderAttendanceSearchResults();
  renderTeacherFeedbackResponses();
  renderTeacherNotifications();
  if (activeStudentContext) {
    const refreshed = getStudentContext(activeStudentContext.classCode, activeStudentContext.idx);
    if (refreshed) {
      activeStudentContext = refreshed;
      renderTeacherConversation();
      renderTeacherStudentResources();
    }
  }
});

if (attendanceDateInput && !attendanceDateInput.value) {
  attendanceDateInput.value = new Date().toISOString().split("T")[0];
}

async function initializeBackend() {
  try {
    const token = localStorage.getItem('attendance360Token');
    if (!token) return;

    const classesRes = await fetch('/api/classes', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const classesData = await classesRes.json();

    if (classesRes.ok) {
      const mappedClasses = classesData.map(c => ({
        id: c.id,
        name: c.name,
        code: c.code,
        students: c.students ? c.students.map(cs => ({
          id: cs.student.userId,
          name: cs.student.firstName + ' ' + cs.student.lastName,
          mobile: cs.student.phone,
          marks: null
        })) : [],
        files: c.files || []
      }));

      classes.splice(0, classes.length, ...mappedClasses);
      renderClasses();
      renderStudents();
    }

    const filesRes = await fetch('/api/files', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const filesData = await filesRes.json();

    if (filesRes.ok) {
      shared.splice(0, shared.length, ...filesData.map(f => ({
        id: f.id,
        title: f.title,
        type: f.type,
        notes: f.notes,
        class: f.class ? f.class.name : '',
        classCode: f.class ? f.class.code : '',
        files: f.fileUrl || "No attachment"
      })));
      renderFiles();
    }
  } catch (err) {
    console.warn("Failed to initialize backend data", err);
  }
}

renderClasses();
renderStudents();
renderFiles();
renderAttendanceHistory();
renderAttendanceSearchResults();
renderTeacherFeedbackResponses();
renderTeacherNotifications();
showSection("home");
applyTeacherProfile(currentUser);

// Initialize Backend to overwrite default/local state
initializeBackend();

