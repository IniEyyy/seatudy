require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

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

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Register user by ID
  socket.on('register', (userId) => {
    if (userId) {
      onlineUsers[userId] = socket.id;
      console.log('User ' + userId + ' registered with socket ' + socket.id);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    for (let id in onlineUsers) {
      if (onlineUsers[id] === socket.id) {
        delete onlineUsers[id];
        console.log('User ' + id + ' disconnected (' + socket.id + ')');
        break;
      }
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
app.use('/api/student', studentRoutes);
app.use('/api/student/forum', forumRoutes);
app.use('/api/student/assignments', assignmentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/instructor', instructorRoutes);
app.use('/api', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
  const status = err.status || (err.name === "MulterError" ? 400 : 500);
  res.status(status).json({ message: err.message || "Server error" });
});

// Start server
server.listen(PORT, () => 
  console.log('Server running on http://localhost:' + PORT)
);
