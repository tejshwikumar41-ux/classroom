require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_for_attendance360';

// CORS — allow all origins (needed for Vercel + local dev)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// ─── Authentication Middleware ─────────────────────────────────────────────────
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized — no token provided' });

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Token invalid or expired' });
    try {
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user) return res.status(403).json({ error: 'User not found' });
      req.user = user;
      next();
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
};

/* ==================
   AUTH ENDPOINTS
================== */

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { role, firstName, lastName, email, username, phone, password, userId } = req.body;

    if (!role || !firstName || !lastName || !email || !username || !phone || !password || !userId) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const normRole = role.toLowerCase().trim();
    if (!['teacher', 'student'].includes(normRole)) {
      return res.status(400).json({ error: 'Role must be teacher or student' });
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: email, mode: 'insensitive' } },
          { username: { equals: username, mode: 'insensitive' } },
          { userId: { equals: userId, mode: 'insensitive' } }
        ]
      }
    });
    if (existing) {
      if (existing.email.toLowerCase() === email.toLowerCase()) {
        return res.status(400).json({ error: 'An account with this email already exists' });
      }
      if (existing.username.toLowerCase() === username.toLowerCase()) {
        return res.status(400).json({ error: 'This username is already taken' });
      }
      return res.status(400).json({ error: 'Account already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { role: normRole, firstName, lastName, email, username, phone, userId, password: hashedPassword }
    });

    res.json({ message: 'Registration successful', userId: user.userId, id: user.id });
  } catch (error) {
    console.error('[register]', error);
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identity, password, role } = req.body;
    if (!identity || !password || !role) {
      return res.status(400).json({ error: 'Identity, password, and role are required' });
    }

    const normRole = role.toLowerCase().trim();
    const user = await prisma.user.findFirst({
      where: {
        role: normRole,
        OR: [
          { email: { equals: identity, mode: 'insensitive' } },
          { username: { equals: identity, mode: 'insensitive' } },
          { userId: { equals: identity, mode: 'insensitive' } }
        ]
      }
    });

    if (!user) return res.status(401).json({ error: `No ${normRole} account found with that username, email, or ID` });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Incorrect password' });

    const token = jwt.sign(
      { id: user.id, role: user.role, userId: user.userId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPass } = user;
    res.json({ token, user: userWithoutPass });
  } catch (error) {
    console.error('[login]', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user from token
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password: _, ...userWithoutPass } = user;
    res.json({ user: userWithoutPass });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ==================
   USER ENDPOINTS
================== */

// List all students (for teacher)
app.get('/api/users/students', authenticateToken, async (req, res) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'student' },
      select: { id: true, firstName: true, lastName: true, userId: true, username: true, phone: true, email: true }
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search users
app.get('/api/users/search', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length < 2) return res.json([]);
    const users = await prisma.user.findMany({
      where: {
        role: 'student',
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { userId: { contains: query, mode: 'insensitive' } },
          { username: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: { id: true, firstName: true, lastName: true, userId: true, username: true, phone: true, role: true }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Look up a single student by their userId string (e.g., STD123456)
app.get('/api/users/lookup/:userId', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: { userId: { equals: req.params.userId, mode: 'insensitive' } },
      select: { id: true, firstName: true, lastName: true, userId: true, phone: true, email: true, role: true }
    });
    if (!user) return res.status(404).json({ error: 'No account found with that Student ID' });
    if (user.role !== 'student') return res.status(400).json({ error: 'That ID belongs to a teacher, not a student' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==================
   CLASS ENDPOINTS
================== */

// Create class (teacher only)
app.post('/api/classes', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can create classes' });
    }
    const { name, code } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'Class name and code are required' });

    const trimmedCode = code.trim().toUpperCase();
    const existing = await prisma.class.findUnique({ where: { code: trimmedCode } });
    if (existing) {
      return res.status(400).json({ error: `Class code "${trimmedCode}" is already in use. Choose a different code.` });
    }

    const newClass = await prisma.class.create({
      data: { name: name.trim(), code: trimmedCode, teacherId: req.user.id }
    });
    res.json(newClass);
  } catch (error) {
    console.error('[createClass]', error);
    res.status(500).json({ error: error.message });
  }
});

// Get classes (teacher → their own; student → enrolled)
app.get('/api/classes', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'teacher') {
      const classes = await prisma.class.findMany({
        where: { teacherId: req.user.id },
        include: {
          students: {
            include: { student: { select: { id: true, firstName: true, lastName: true, userId: true, phone: true, email: true } } }
          },
          files: true
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(classes);
    } else {
      // Student — return only enrolled classes
      const enrollments = await prisma.classStudent.findMany({
        where: { studentId: req.user.id },
        include: {
          class: {
            include: {
              teacher: { select: { id: true, firstName: true, lastName: true, userId: true, email: true } },
              files: true,
              students: {
                include: { student: { select: { id: true, firstName: true, lastName: true, userId: true } } }
              }
            }
          }
        }
      });
      res.json(enrollments.map(e => e.class));
    }
  } catch (error) {
    console.error('[getClasses]', error);
    res.status(500).json({ error: error.message });
  }
});

// Add student to class
app.post('/api/classes/:classId/students', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can add students to classes' });
    }
    const classId = parseInt(req.params.classId);
    if (isNaN(classId)) return res.status(400).json({ error: 'Invalid class ID' });

    const { studentId } = req.body; // userId string like STD123456
    if (!studentId) return res.status(400).json({ error: 'Student ID is required' });

    // Verify this class belongs to this teacher
    const classRecord = await prisma.class.findUnique({ where: { id: classId } });
    if (!classRecord) return res.status(404).json({ error: 'Class not found' });
    if (classRecord.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'You can only add students to your own classes' });
    }

    // Find student by their userId string
    const student = await prisma.user.findFirst({
      where: { userId: { equals: studentId.trim(), mode: 'insensitive' } }
    });
    if (!student) {
      return res.status(404).json({ error: `No account found with Student ID "${studentId}". Make sure the student is registered.` });
    }
    if (student.role !== 'student') {
      return res.status(400).json({ error: `"${studentId}" is a teacher account, not a student.` });
    }

    // Check if already enrolled
    const existingLink = await prisma.classStudent.findUnique({
      where: { classId_studentId: { classId, studentId: student.id } }
    });
    if (existingLink) {
      return res.status(400).json({ error: `${student.firstName} ${student.lastName} is already enrolled in this class.` });
    }

    await prisma.classStudent.create({
      data: { classId, studentId: student.id }
    });

    res.json({
      message: `${student.firstName} ${student.lastName} added to ${classRecord.name} successfully`,
      student: {
        id: student.id,
        userId: student.userId,
        firstName: student.firstName,
        lastName: student.lastName,
        phone: student.phone,
        email: student.email
      }
    });
  } catch (error) {
    console.error('[addStudentToClass]', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove student from class
app.delete('/api/classes/:classId/students/:studentUserId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can remove students' });
    }

    const classId = parseInt(req.params.classId);
    const classRecord = await prisma.class.findUnique({ where: { id: classId } });
    if (!classRecord || classRecord.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'No permission to modify this class' });
    }

    const student = await prisma.user.findFirst({
      where: { userId: { equals: req.params.studentUserId, mode: 'insensitive' } }
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    await prisma.classStudent.deleteMany({
      where: { classId, studentId: student.id }
    });
    res.json({ message: 'Student removed from class' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List students in a class
app.get('/api/classes/:classId/students', authenticateToken, async (req, res) => {
  try {
    const classId = parseInt(req.params.classId);
    const classStudents = await prisma.classStudent.findMany({
      where: { classId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, userId: true, phone: true, email: true } }
      }
    });
    res.json(classStudents.map(cs => cs.student));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ======================
   FILES ENDPOINTS
====================== */

app.post('/api/files', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can share files' });
    }
    const { title, type, notes, classId, fileUrl } = req.body;
    if (!title || !type) return res.status(400).json({ error: 'Title and type are required' });

    const file = await prisma.file.create({
      data: {
        title,
        type,
        notes: notes || null,
        classId: classId ? parseInt(classId) : null,
        teacherId: req.user.id,
        fileUrl: fileUrl || null
      }
    });
    const fullFile = await prisma.file.findUnique({
      where: { id: file.id },
      include: { class: true }
    });
    res.json(fullFile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/files', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'teacher') {
      const files = await prisma.file.findMany({
        where: { teacherId: req.user.id },
        include: { class: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json(files);
    } else {
      const enrolled = await prisma.classStudent.findMany({ where: { studentId: req.user.id } });
      const classIds = enrolled.map(e => e.classId);
      const files = await prisma.file.findMany({
        where: { classId: { in: classIds } },
        include: {
          class: true,
          teacher: { select: { firstName: true, lastName: true, userId: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(files);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/files/:fileId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can delete files' });
    }
    const fileId = parseInt(req.params.fileId);
    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.teacherId !== req.user.id) return res.status(403).json({ error: 'Not your file' });
    await prisma.file.delete({ where: { id: fileId } });
    res.json({ message: 'File deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ======================
   ATTENDANCE ENDPOINTS
====================== */

app.post('/api/attendance', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can save attendance' });
    }
    const { date, classId, records } = req.body;
    if (!date || !classId || !records) {
      return res.status(400).json({ error: 'date, classId, and records are required' });
    }

    // Verify teacher owns this class
    const classRecord = await prisma.class.findUnique({ where: { id: parseInt(classId) } });
    if (!classRecord || classRecord.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'You can only save attendance for your own classes' });
    }

    const parsedDate = new Date(date);

    const attendance = await prisma.attendance.upsert({
      where: { date_classId: { date: parsedDate, classId: parseInt(classId) } },
      update: {},
      create: { date: parsedDate, classId: parseInt(classId) }
    });

    for (const record of records) {
      if (!record.studentId || !record.status) continue;
      await prisma.attendanceRecord.upsert({
        where: { attendanceId_studentId: { attendanceId: attendance.id, studentId: record.studentId } },
        update: { status: record.status },
        create: { attendanceId: attendance.id, studentId: record.studentId, status: record.status }
      });
    }

    res.json({ message: 'Attendance saved successfully', attendanceId: attendance.id });
  } catch (error) {
    console.error('[saveAttendance]', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/attendance/:classId/:date', authenticateToken, async (req, res) => {
  try {
    const { classId, date } = req.params;
    const parsedDate = new Date(date);
    const attendance = await prisma.attendance.findUnique({
      where: { date_classId: { date: parsedDate, classId: parseInt(classId) } },
      include: { records: { include: { student: { select: { id: true, userId: true, firstName: true, lastName: true } } } } }
    });
    res.json(attendance ? attendance.records : []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/attendance/student/:studentDbId', authenticateToken, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentDbId);
    // Students can only see their own attendance
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const records = await prisma.attendanceRecord.findMany({
      where: { studentId },
      include: {
        attendance: {
          include: { class: { select: { id: true, name: true, code: true } } }
        }
      },
      orderBy: { attendance: { date: 'desc' } }
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ======================
   MESSAGES ENDPOINTS
====================== */

// Send a message
app.post('/api/messages', authenticateToken, async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    if (!receiverId || !text || !text.trim()) {
      return res.status(400).json({ error: 'receiverId and text are required' });
    }

    // Resolve receiver — accept both DB int id and userId string
    let recId;
    if (typeof receiverId === 'string' && isNaN(parseInt(receiverId))) {
      const r = await prisma.user.findFirst({ where: { userId: { equals: receiverId, mode: 'insensitive' } } });
      if (!r) return res.status(404).json({ error: 'Receiver not found' });
      recId = r.id;
    } else {
      recId = parseInt(receiverId);
    }

    const receiver = await prisma.user.findUnique({ where: { id: recId } });
    if (!receiver) return res.status(404).json({ error: 'Receiver not found' });

    const message = await prisma.message.create({
      data: { text: text.trim(), senderId: req.user.id, receiverId: recId }
    });

    const fullMessage = await prisma.message.findUnique({
      where: { id: message.id },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, userId: true, role: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, userId: true, role: true } }
      }
    });
    res.json(fullMessage);
  } catch (error) {
    console.error('[sendMessage]', error);
    res.status(500).json({ error: error.message });
  }
});

// Get conversation with another user
app.get('/api/messages/:otherUserId', authenticateToken, async (req, res) => {
  try {
    const { otherUserId } = req.params;

    let otherId = parseInt(otherUserId);
    if (isNaN(otherId)) {
      const r = await prisma.user.findFirst({ where: { userId: { equals: otherUserId, mode: 'insensitive' } } });
      if (!r) return res.status(404).json({ error: 'User not found' });
      otherId = r.id;
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: req.user.id, receiverId: otherId },
          { senderId: otherId, receiverId: req.user.id }
        ]
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, userId: true, role: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, userId: true, role: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all message contacts (people this user has talked to)
app.get('/api/messages', authenticateToken, async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: req.user.id },
          { receiverId: req.user.id }
        ]
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, userId: true, role: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, userId: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Deduplicate to get unique contacts
    const contactMap = new Map();
    messages.forEach(msg => {
      const other = msg.senderId === req.user.id ? msg.receiver : msg.sender;
      if (!contactMap.has(other.id)) {
        contactMap.set(other.id, { ...other, lastMessage: msg.text, lastAt: msg.createdAt });
      }
    });

    res.json(Array.from(contactMap.values()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fallback — serve Login index for all unmatched routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'Login', 'index.html'));
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`[Attendance360] Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
