const express = require('express');
const router = express.Router();
const dishController = require('../controllers/dishController');
const verifyToken = require('../middleware/authMiddleware'); // Ton middleware JWT
const upload = require('../config/multer'); // Middleware de téléversement

// --- ROUTES PUBLIQUES / CLIENTS ---
// Les clients peuvent lister uniquement les plats actifs
router.get('/menu', dishController.getClientCatalog);

// --- ROUTES GÉRANTS SÉCURISÉES ---
// Récupérer le catalogue de gestion complet
router.get('/all', verifyToken, dishController.getManagerCatalog);

// Créer un plat (upload.single('image') intercepte le fichier nommé 'image' envoyé depuis Angular)
router.post('/add', verifyToken, upload.single('image'), dishController.createDish);

// Modifier les détails d'un plat (avec ou sans nouvelle image)
router.put('/update/:id', verifyToken, upload.single('image'), dishController.updateDishDetails);

// Activer/Désactiver rapidement un plat
router.patch('/toggle/:id', verifyToken, dishController.toggleDishStatus);

router.get('/catalog', dishController.getClientDishes);

module.exports = router;