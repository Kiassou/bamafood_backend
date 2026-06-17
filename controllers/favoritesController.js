const db = require('../config/db');

exports.getFavoritesByUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const query = `
      SELECT 
        f.id AS favoriteId,
        f.created_at,
        d.id AS dishId,
        d.name,
        d.price,
        d.category,
        d.description,
        d.image_url AS imageUrl,
        d.is_active AS isActive,
        d.order_count AS orderCount
      FROM favorites f
      JOIN dishes d ON f.dish_id = d.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `;

    const [results] = await db.query(query, [userId]);
    res.json(results);
  } catch (err) {
    console.error('getFavoritesByUser error:', err);
    res.status(500).json(err);
  }
};

exports.addFavorite = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const dishId = parseInt(req.body.dishId);

    console.log('addFavorite params:', req.params);
    console.log('addFavorite body:', req.body);

    if (!dishId) {
      return res.status(400).json({ message: 'dishId est requis.' });
    }

    const checkQuery = `SELECT id FROM favorites WHERE user_id = ? AND dish_id = ?`;
    const [results] = await db.query(checkQuery, [userId, dishId]);

    if (results.length > 0) {
      return res.status(409).json({ message: 'Ce plat est déjà en favori.' });
    }

    const insertQuery = `INSERT INTO favorites (user_id, dish_id) VALUES (?, ?)`;
    const [result] = await db.query(insertQuery, [userId, dishId]);

    return res.status(201).json({
      message: 'Plat ajouté aux favoris.',
      favoriteId: result.insertId
    });
  } catch (err) {
    console.error('addFavorite error:', err);
    res.status(500).json(err);
  }
};

exports.removeFavorite = async (req, res) => {
  try {
    const favoriteId = parseInt(req.params.id);
    await db.query(`DELETE FROM favorites WHERE id = ?`, [favoriteId]);
    res.json({ message: 'Favori supprimé.' });
  } catch (err) {
    console.error('removeFavorite error:', err);
    res.status(500).json(err);
  }
};