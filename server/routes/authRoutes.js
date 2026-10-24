const express = require('express');
const router = express.Router();
const { register, login, refresh, logout, getProfile } = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/auth/refresh', refresh);
router.post('/auth/logout', logout);
router.get('/profile', authenticate, getProfile);

module.exports = router;
