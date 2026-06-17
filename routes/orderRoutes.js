const express = require('express');
const router = express.Router();

const orderController = require('../controllers/orderController');
const verifyToken = require('../middleware/authMiddleware');

// --- ROUTES CLIENTS SECURISEES ---
router.post('/create', verifyToken, orderController.createOrder);
router.get('/my-orders', verifyToken, orderController.getMyOrders);

// --- ROUTES GERANTS SECURISEES ---
router.get('/manager-orders', verifyToken, orderController.getManagerOrders);
router.put('/update-status/:id', verifyToken, orderController.updateOrderStatus);

// --- ROUTES LIVREURS ---
router.post('/call-rider/:id', verifyToken, orderController.callRider);
router.get('/receipt/:id', verifyToken, orderController.getReceipt);

module.exports = router;