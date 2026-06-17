const express = require('express');
const router = express.Router();
const controller = require('../controllers/managerController');

router.get('/dashboard-data', controller.getDashboardData);
router.get('/dashboard-revenue-orders', controller.getRecentRevenueOrders);
router.get('/dashboard-pending-orders', controller.getRecentPendingOrders);
router.get('/dashboard-recent-dishes', controller.getRecentDishes);
router.get('/dashboard-revenue-summary', controller.getRevenueSummary);
router.get('/dashboard-revenue-list', controller.getRevenueList);
router.get('/dashboard-revenue-pdf', controller.downloadRevenuePdf);

module.exports = router;