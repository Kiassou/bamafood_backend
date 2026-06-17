const db = require('../config/db');
const { logActivity } = require('../services/activityService');


exports.getAllDeliveries = async (req, res) => {
  try {
    const query = `
      SELECT 
        d.id,
        d.order_id,
        d.deliverer_id,
        d.status,
        d.delivery_address,
        d.created_at,
        o.id AS orderId,
        u.username AS clientName,
        l.username AS delivererName
      FROM deliveries d
      JOIN orders o ON d.order_id = o.id
      JOIN users u ON o.user_id = u.id
      LEFT JOIN users l ON d.deliverer_id = l.id
      ORDER BY d.id DESC
    `;

    const [results] = await db.query(query);
    res.json(results);
  } catch (error) {
    console.error('getAllDeliveries error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getDeliveriesByDeliverer = async (req, res) => {
  try {
    const { delivererId } = req.params;

    const query = `
      SELECT 
        d.id,
        d.order_id,
        d.deliverer_id,
        d.status,
        d.delivery_address,
        d.created_at,
        o.id AS orderId,
        u.username AS clientName,
        l.username AS delivererName
      FROM deliveries d
      JOIN orders o ON d.order_id = o.id
      JOIN users u ON o.user_id = u.id
      LEFT JOIN users l ON d.deliverer_id = l.id
      WHERE d.deliverer_id = ?
      ORDER BY d.id DESC
    `;

    const [results] = await db.query(query, [delivererId]);
    res.json(results);
  } catch (error) {
    console.error('getDeliveriesByDeliverer error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await db.query('UPDATE deliveries SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: 'Statut mis à jour' });
  } catch (error) {
    console.error('updateStatus error:', error);
    res.status(500).json({ message: error.message });
  }
};


exports.assignLivreur = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliverer_id } = req.body;

    if (!deliverer_id) {
      return res.status(400).json({ message: "Le livreur est requis." });
    }

    const [result] = await db.query(
      "UPDATE deliveries SET deliverer_id = ?, status = 'en_cours' WHERE id = ?",
      [deliverer_id, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Livraison introuvable." });
    }

    await logActivity({
      userId: req.user?.id || null,
      user: req.user?.username || 'Manager',
      type: 'DELIVERY',
      severity: 'medium',
      description: `La livraison #${id} a été assignée au livreur ID ${deliverer_id}.`
    });

    res.json({ message: 'Livreur assigné' });
  } catch (error) {
    console.error('assignLivreur error:', error);
    res.status(500).json({ message: error.message });
  }
};