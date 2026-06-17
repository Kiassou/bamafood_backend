const express = require('express');
const router = express.Router();
const controller = require('../controllers/deliverycontroller');

router.get('/', controller.getAllDeliveries);
router.get('/deliverer/:delivererId', controller.getDeliveriesByDeliverer);
router.put('/:id/status', controller.updateStatus);
router.put('/:id/assign', controller.assignLivreur);

module.exports = router;