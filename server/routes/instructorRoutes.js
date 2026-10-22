const express = require('express');
const router = express.Router();
const instructorController = require('../controllers/instructorController');
const { authenticate, isInstructor } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');

// All endpoint for instructor will be verified
router.use(authenticate, isInstructor);

// GET all courses by instructor
router.get('/courses', instructorController.getAllCourses);

// POST create single course
router.post('/courses', instructorController.createCourse);


// PUT update course
router.put('/courses/:id', instructorController.updateCourse);

// DELETE course
router.delete('/courses/:id', instructorController.deleteCourse);

// GET single course detail
router.get('/courses/:id', instructorController.getCourseDetail);


// POST single/ multiple file(s)
router.post('/courses/:courseId/materials', upload.array('files',6), instructorController.addMaterial);

// DELETE single material file
router.delete('/courses/:courseId/materials/:materialId', instructorController.deleteMaterial);


// POST single assignment
router.post('/courses/:courseId/assignments', instructorController.addAssignment);

// PUT update assignment
router.put('/assignments/:assignmentId', instructorController.updateAssignment);

// DELETE assignment
router.delete('/assignments/:assignmentId', instructorController.deleteAssignment);

// GET submission summary across all assignments
router.get('/submissions/overview', instructorController.getSubmissionsOverview);

// GET student submission
router.get('/assignments/:assignmentId/submissions', instructorController.getAssignmentSubmissions);

//PUT update submission score
router.put('/submissions/:submissionId/score', instructorController.giveScore);


module.exports = router;
