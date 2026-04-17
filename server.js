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

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) return res.sendStatus(403);
    
    try {
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user) return res.sendStatus(403);
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

app.post('/api/auth/register', async (req, res) => {
  try {
    const { role, firstName, lastName, email, username, phone, password, userId } = req.body;
    
    // Check if user exists
    const existing = await prisma.user.findFirst({
      where: { 
        OR: [
          { email: { equals: email, mode: 'insensitive' } }, 
          { username: { equals: username, mode: 'insensitive' } }
        ] 
      }
    });
    if (existing) return res.status(400).json({ error: 'Email or username already exists' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: { role, firstName, lastName, email, username, phone, userId, password: hashedPassword }
    });
    
    res.json({ message: 'User registered successfully', userId: user.userId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { identity, password, role } = req.body;
    
    const user = await prisma.user.findFirst({
      where: {
        role,
        OR: [
          { email: { equals: identity, mode: 'insensitive' } }, 
          { username: { equals: identity, mode: 'insensitive' } }, 
          { userId: { equals: identity, mode: 'insensitive' } }
        ]
      }
    });

    if (!user) return res.status(401).json({ error: 'Account not found' });
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Incorrect password' });
    
    const token = jwt.sign({ id: user.id, role: user.role, userId: user.userId }, JWT_SECRET, { expiresIn: '24h' });
    
    // Remove password from returned user object
    const { password: _, ...userWithoutPass } = user;
    res.json({ token, user: userWithoutPass });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

app.get('/api/users/students', authenticateToken, async (req, res) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'student' },
      select: { id: true, firstName: true, lastName: true, userId: true, username: true, phone: true }
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/search', authenticateToken, async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.json([]);
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { firstName: { contains: query, mode: 'insensitive' } },
                    { lastName: { contains: query, mode: 'insensitive' } },
                    { userId: { contains: query, mode: 'insensitive' } }
                ]
            },
            select: { id: true, firstName: true, lastName: true, userId: true, role: true }
        });
        res.json(users);
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

/* ==================
   CLASS ENDPOINTS
================== */

app.post('/api/classes', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Only teachers can create classes' });
    const { name, code } = req.body;
    
    const existing = await prisma.class.findUnique({ where: { code } });
    if (existing) return res.status(400).json({ error: 'Class code already exists' });

    const newClass = await prisma.class.create({
      data: { name, code, teacherId: req.user.id }
    });
    res.json(newClass);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/classes', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'teacher') {
      const classes = await prisma.class.findMany({ 
        where: { teacherId: req.user.id },
        include: {
            students: { include: { student: true } },
            files: true
        }
      });
      res.json(classes);
    } else {
      const classes = await prisma.classStudent.findMany({
        where: { studentId: req.user.id },
        include: { 
            class: { 
                include: { 
                    teacher: { select: { firstName: true, lastName: true } },
                    files: true,
                    students: { include: { student: true } }
                } 
            } 
        }
      });
      res.json(classes.map(c => c.class));
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/classes/:classId/students', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.sendStatus(403);
    const { classId } = req.params;
    const { studentId } = req.body; // Actually the userId (e.g. STD123)

    const student = await prisma.user.findUnique({ where: { userId: studentId } });
    if (!student || student.role !== 'student') return res.status(404).json({ error: 'Student not found' });

    await prisma.classStudent.create({
      data: { classId: parseInt(classId), studentId: student.id }
    });

    res.json({ message: 'Student added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/classes/:classId/students', authenticateToken, async (req, res) => {
  try {
      const { classId } = req.params;
      const classStudents = await prisma.classStudent.findMany({
          where: { classId: parseInt(classId) },
          include: { student: { select: { id: true, firstName: true, lastName: true, userId: true } } }
      });
      res.json(classStudents.map(cs => cs.student));
  } catch(error) {
      res.status(500).json({ error: error.message });
  }
});

/* ==================
   FILES ENDPOINTS
================== */

app.post('/api/files', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.sendStatus(403);
    const { title, type, notes, classId } = req.body;
    
    const file = await prisma.file.create({
      data: { title, type, notes, classId: parseInt(classId), teacherId: req.user.id }
    });
    res.json(file);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/files', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'teacher') {
      const files = await prisma.file.findMany({
        where: { teacherId: req.user.id },
        include: { class: true }
      });
      res.json(files);
    } else {
      // Student viewing files for classes they are in
      const enrolled = await prisma.classStudent.findMany({ where: { studentId: req.user.id } });
      const classIds = enrolled.map(e => e.classId);
      const files = await prisma.file.findMany({
        where: { classId: { in: classIds } },
        include: { class: true, teacher: { select: { firstName: true, lastName: true } } }
      });
      res.json(files);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ======================
   ATTENDANCE ENDPOINTS
====================== */

app.post('/api/attendance', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.sendStatus(403);
    const { date, classId, records } = req.body;
    // records: [{ studentId: Int, status: 'present' | 'absent' }]

    const parsedDate = new Date(date);

    // Create or update attendance record
    const attendance = await prisma.attendance.upsert({
      where: { date_classId: { date: parsedDate, classId: parseInt(classId) } },
      update: {},
      create: { date: parsedDate, classId: parseInt(classId) }
    });

    for (const record of records) {
      await prisma.attendanceRecord.upsert({
        where: { attendanceId_studentId: { attendanceId: attendance.id, studentId: record.studentId } },
        update: { status: record.status },
        create: { attendanceId: attendance.id, studentId: record.studentId, status: record.status }
      });
    }

    res.json({ message: 'Attendance saved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/attendance/:classId/:date', authenticateToken, async (req, res) => {
  try {
    const { classId, date } = req.params;
    const parsedDate = new Date(date);

    const attendance = await prisma.attendance.findUnique({
      where: { date_classId: { date: parsedDate, classId: parseInt(classId) } },
      include: { records: true }
    });

    res.json(attendance ? attendance.records : []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/attendance/student/:studentId', authenticateToken, async (req, res) => {
    try {
        const { studentId } = req.params;
        const records = await prisma.attendanceRecord.findMany({
            where: { studentId: parseInt(studentId) },
            include: { attendance: { include: { class: true } } }
        });
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ======================
   MESSAGES ENDPOINTS
====================== */

app.post('/api/messages', authenticateToken, async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    
    // Find receiver internally if they passed a user string ID
    let recId = receiverId;
    if (typeof receiverId === 'string' && isNaN(parseInt(receiverId))) {
        const r = await prisma.user.findUnique({ where: { userId: receiverId } });
        if(r) recId = r.id;
    } else {
        recId = parseInt(receiverId);
    }

    const message = await prisma.message.create({
      data: { text, senderId: req.user.id, receiverId: recId }
    });
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/messages/:otherUserId', authenticateToken, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    
    let otherId = parseInt(otherUserId);
    if (isNaN(otherId)) {
        const r = await prisma.user.findUnique({ where: { userId: otherUserId } });
        if(r) otherId = r.id;
    }
    
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: req.user.id, receiverId: otherId },
          { senderId: otherId, receiverId: req.user.id }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fallback to serve index for everything else (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'Login', 'index.html'));
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
