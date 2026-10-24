require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

// Import routes
const publicRoutes = require('./routes/publicRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const studentRoutes = require('./routes/studentRoutes');
const forumRoutes = require('./routes/forumRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const instructorRoutes = require('./routes/instructorRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const fileRoutes = require('./routes/fileRoutes');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' },
});

// CORS setup (allow frontend React dev server)
app.use(cors({
  origin: FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // important for cookies / token
}));

// Middleware JSON parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Create HTTP server & bind socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ['websocket', 'polling'], // ensure fallback
});

// Store connected users { userId: socketId }
let onlineUsers = {};

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Unauthorized'));

  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return next(new Error('Unauthorized'));
  }
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  const userId = socket.user.id;
  onlineUsers[userId] = socket.id;
  console.log('User ' + userId + ' connected with socket ' + socket.id);

  socket.on('disconnect', () => {
    if (onlineUsers[userId] === socket.id) {
      delete onlineUsers[userId];
      console.log('User ' + userId + ' disconnected (' + socket.id + ')');
    }
  });
});

// Make io and onlineUsers available in routes/controllers
app.set('io', io);
app.set('onlineUsers', onlineUsers);

// Routes
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);

app.use('/api', authRoutes);
app.use('/api', adminRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/student/forum', forumRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/student/assignments', assignmentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/instructor', instructorRoutes);
app.use('/api', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/files', fileRoutes);

// Health check route
app.get('/', (req, res) => {
  res.json({ status: 'OK', message: 'Welcome to the API' });
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', uptime: process.uptime() });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'unreachable' });
  }
});

// Unknown API route
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Central error handler (multer, JSON parse, etc.)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  const status = err.status || err.statusCode || (err.name === "MulterError" ? 400 : 500);
  const message = status >= 500 ? "Server error" : err.message || "Request failed";
  res.status(status).json({ message });
});

// Start server
server.listen(PORT, () => 
  console.log('Server running on http://localhost:' + PORT)
);
