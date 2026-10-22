const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');
const { authenticate, isStudent, isEnrolled } = require('../middlewares/authMiddleware');

// Protected Student Routes
router.use(authenticate, isStudent);

router.get('/:courseId', isEnrolled, forumController.getForumMessages);
router.post('/:courseId', isEnrolled, forumController.postForumMessage);

module.exports = router;