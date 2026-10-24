const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');
const { authenticate } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.get('/:courseId', forumController.getForumMessages);
router.post('/:courseId', forumController.postForumMessage);
router.put('/:courseId/:messageId', forumController.editForumMessage);
router.delete('/:courseId/:messageId', forumController.deleteForumMessage);

module.exports = router;
