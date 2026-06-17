const express = require('express');
const router = express.Router();
const controller = require('../controllers/activityController');

router.get('/recent', controller.getRecentActivities);
router.get('/', controller.getAllActivities);

module.exports = router;