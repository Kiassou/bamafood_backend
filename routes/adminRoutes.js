const express = require('express');
const router = express.Router();
const authPinController = require('../controllers/authPinController');
const adminController = require('../controllers/adminController');
const verifyToken = require('../middleware/authMiddleware'); // Ton middleware JWT existant

// --- ROUTE DE SÉCURITÉ (VALIDATION CODE PIN) ---
router.post('/verify-pin', verifyToken, authPinController.verifyPin);

// --- ROUTES DE CONTRÔLE DES UTILISATEURS (RÉSERVÉES GERANTS) ---
// Récupérer tous les utilisateurs
router.get('/users/all', verifyToken, adminController.getAllUsers);

// Changer le rôle d'un utilisateur
router.put('/users/role/:id', verifyToken, adminController.updateUserRole);

// Bloquer ou débloquer un compte utilisateur
router.put('/users/toggle-block/:id', verifyToken, adminController.toggleUserBlock);

module.exports = router;