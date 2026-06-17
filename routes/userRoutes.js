const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyToken = require('../middleware/authMiddleware');

router.get('/profile', verifyToken, userController.getProfile);
router.get('/dashboard-stats', verifyToken, userController.getDashboardStats);
router.get('/notifications/count', verifyToken, userController.getNotificationCount);
router.put('/profile', verifyToken, userController.updateProfile);
router.put('/profile/password', verifyToken, userController.changePassword);
router.get('/role/:role', userController.getUsersByRole);


module.exports = router;