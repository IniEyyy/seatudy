const jwt = require('jsonwebtoken');
const pool = require('../db');

// Middleware: Check JWT token
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token missing or invalid format' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Middleware: Check admin role
const isAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Admin only' });
  }
  next();
};

// Middleware: Check instructor role
const isInstructor = (req, res, next) => {
  if (req.user?.role !== 'instructor') {
    return res.status(403).json({ message: 'Access denied: Instructor only' });
  }
  next();
};

// Middleware: Check student role
const isStudent = (req, res, next) => {
  if (req.user?.role !== 'student') {
    return res.status(403).json({ message: 'Access denied: Student only' });
  }
  next();
};

// Middleware: Check if user is enrolled
const isEnrolled = async (req, res, next) => {
  const courseId = req.params.courseId || req.params.id;
  const userId = req.user?.id;

  try {
    const result = await pool.query(
      'SELECT * FROM enrollments WHERE student_id = $1 AND course_id = $2',
      [userId, courseId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ message: 'You are not enrolled in this course' });
    }

    next();
  } catch (err) {
    console.error('Enrollment check error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  authenticate,
  isAdmin,
  isInstructor,
  isStudent,
  isEnrolled
};
