const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favoritesController');

router.get('/:userId', favoritesController.getFavoritesByUser);
router.post('/:userId', favoritesController.addFavorite);
router.delete('/:id', favoritesController.removeFavorite);

module.exports = router;