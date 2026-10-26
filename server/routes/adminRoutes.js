const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, isAdmin } = require('../middlewares/authMiddleware');

router.get('/users', authenticate, isAdmin, adminController.getAllUsers);
router.put('/users/:id/role', authenticate, isAdmin, adminController.updateUserRole);
router.get('/admin/audit-logs', authenticate, isAdmin, adminController.getAuditLogs);

router.get('/admin/courses/instructors', authenticate, isAdmin, adminController.getInstructorOptions);
router.get('/admin/courses', authenticate, isAdmin, adminController.getManagedCourses);
router.post('/admin/courses', authenticate, isAdmin, adminController.createManagedCourse);
router.put('/admin/courses/:id', authenticate, isAdmin, adminController.updateManagedCourse);
router.delete('/admin/courses/:id', authenticate, isAdmin, adminController.deleteManagedCourse);

module.exports = router;