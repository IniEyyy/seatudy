const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const upload = require('../middlewares/uploadSubmission');
const { authenticate, isStudent, isEnrolled } = require('../middlewares/authMiddleware');

// Use for all student endpoint
router.use(authenticate, isStudent);

// Routes
router.get('/courses', studentController.getAllStudentCourses);

router.get('/courses/:id', isEnrolled, studentController.getCourseDetail);

router.post('/enroll/:courseId', studentController.enrollCourse);

router.get('/purchases/:courseId', studentController.getPurchaseStatus);

router.post('/buy/:courseId', studentController.buyCourse);

router.post('/topup', studentController.topUpBalance);

router.post(
  '/courses/:courseId/assignments/:assignmentId/submit',
  upload.array('files'),
  studentController.submitAssignment
);

module.exports = router;
