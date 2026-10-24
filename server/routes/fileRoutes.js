const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { authenticate } = require('../middlewares/authMiddleware');

router.get('/materials/:materialId', authenticate, fileController.downloadMaterial);
router.get('/submissions/:fileId', authenticate, fileController.downloadSubmissionFile);

module.exports = router;
