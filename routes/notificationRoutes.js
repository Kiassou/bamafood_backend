const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware'); // Ton middleware d'auth
const notifyController = require('../controllers/notificationController');

// Route pour lister les messages (GET)
router.get('/', verifyToken, notifyController.getMyNotifications);

// Route pour envoyer un broadcast
router.post('/broadcast', verifyToken, notifyController.sendBroadcast);

// Route pour envoyer un message (POST)
router.post('/send', verifyToken, notifyController.sendMessage);

// Route pour supprimer un message (DELETE)
router.delete('/:id', verifyToken, notifyController.deleteNotification);

// Route pour marquer une notification comme lue
router.put('/:id/read', verifyToken, notifyController.markAsRead);

module.exports = router;
