const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { authenticate, isStudent } = require('../middlewares/authMiddleware');

router.use(authenticate, isStudent);

router.get('/', assignmentController.getMyAssignments);

module.exports = router;
