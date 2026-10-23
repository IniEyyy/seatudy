const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const { getDashboardStats } = require('../controllers/dashboardController');

router.get('/stats', authenticate, getDashboardStats);

module.exports = router;
