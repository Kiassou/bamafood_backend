const db = require('../config/db');
const bcrypt = require('bcrypt');

exports.getProfile = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, first_name, last_name, username, email, phone, role, is_verified, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.status(200).json(users[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const [orders] = await db.query(
      'SELECT COUNT(*) AS count FROM orders WHERE user_id = ?',
      [req.user.id]
    );

    const [enAttente] = await db.query(
      'SELECT COUNT(*) AS count FROM orders WHERE user_id = ? AND status = "en_attente"',
      [req.user.id]
    );

    const [delivery] = await db.query(
      "SELECT COUNT(*) AS count FROM orders WHERE user_id = ? AND status = 'livraison'",
      [req.user.id]
    );

    const [favorites] = await db.query(
      'SELECT COUNT(*) AS count FROM favorites WHERE user_id = ?',
      [req.user.id]
    );

    res.status(200).json({
      ordersCount: orders[0].count,
      deliveryCount: delivery[0].count,
      enAttenteCount: enAttente[0].count,
      favoritesCount: favorites[0].count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors du chargement des statistiques' });
  }
};

exports.getNotificationCount = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT COUNT(*) AS count FROM notifications WHERE recipient_id = ? AND is_read = 0',
      [req.user.id]
    );

    res.status(200).json({ count: rows[0].count || 0 });
  } catch (error) {
    console.error('getNotificationCount error:', error);
    res.status(500).json({ message: 'Erreur lors du chargement des notifications' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }

    const { first_name, last_name, email, phone } = req.body;

    if (!first_name || !last_name || !email) {
      return res.status(400).json({ message: "Champs obligatoires manquants" });
    }

    await db.query(
      'UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ? WHERE id = ?',
      [first_name, last_name, email, phone || '', req.user.id]
    );

    res.status(200).json({ message: "Profil mis à jour avec succès" });
  } catch (error) {
    console.error('updateProfile error:', error);
    res.status(500).json({ message: "Erreur lors de la mise à jour" });
  }
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const [users] = await db.query(
      'SELECT id, password FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Ancien mot de passe incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, req.user.id]
    );

    res.status(200).json({ message: "Mot de passe modifié avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors du changement de mot de passe" });
  }
};

exports.getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;

    const query = `
      SELECT id, username, first_name, last_name, phone, role
      FROM users
      WHERE LOWER(role) = LOWER(?)
      ORDER BY username ASC
    `;

    const [results] = await db.query(query, [role]);
    res.json(results);
  } catch (error) {
    console.error('getUsersByRole error:', error);
    res.status(500).json({ message: error.message });
  }
};