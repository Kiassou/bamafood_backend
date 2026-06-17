const db = require('../config/db');
const { logActivity } = require('../services/activityService');



// --- CRÉER UNE COMMANDE (Pour le client - Transaction sécurisée) ---
exports.createOrder = async (req, res) => {
  const { items, totalPrice } = req.body; // items: [{ dishId, quantity, price }]
  const userId = req.user.id;

  if (!items || items.length === 0 || !totalPrice) {
    return res.status(400).json({ message: "La commande est vide." });
  }

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const sqlOrder = `INSERT INTO orders (user_id, total_price, status) VALUES (?, ?, 'en_attente')`;
    const [orderResult] = await connection.query(sqlOrder, [userId, totalPrice]);
    const orderId = orderResult.insertId;

    const sqlItem = `INSERT INTO order_items (order_id, dish_id, quantity, price) VALUES (?, ?, ?, ?)`;
    for (const item of items) {
      await connection.query(sqlItem, [orderId, item.dishId, item.quantity, item.price]);
      await connection.query(
        `UPDATE dishes SET order_count = order_count + ? WHERE id = ?`,
        [item.quantity, item.dishId]
      );
    }

    await connection.commit();

    await logActivity({
      userId: req.user?.id || null,
      user: req.user?.username || 'Client',
      type: 'ORDER',
      severity: 'medium',
      description: `Le client a passé une nouvelle commande #${orderId} d'un total de ${totalPrice}.`
    });

    return res.status(201).json({ message: "Commande passée avec succès !", orderId });
  } catch (error) {
    await connection.rollback();
    console.error("Erreur transaction commande :", error);
    return res.status(500).json({ message: "Erreur serveur lors de la validation de votre commande." });
  } finally {
    connection.release();
  }
};

// --- RÉCUPÉRER TOUTES LES COMMANDES (Pour le gérant) ---
exports.getManagerOrders = async (req, res) => {
    try {
        // Récupération de toutes les commandes ordonnées de la plus récente à la plus ancienne
        const sqlOrders = `
            SELECT o.id, o.total_price AS total_price, o.status, o.created_at, u.first_name, u.last_name, u.phone
            FROM orders o
            JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC`;
        
        const [orders] = await db.query(sqlOrders);

        // Pour chaque commande, on récupère ses plats associés
        const formattedOrders = [];
        for (const order of orders) {
            const sqlItems = `
                SELECT oi.quantity, oi.price, d.name AS dish_name
                FROM order_items oi
                JOIN dishes d ON oi.dish_id = d.id
                WHERE oi.order_id = ?`;
            const [items] = await db.query(sqlItems, [order.id]);

            formattedOrders.push({
                id: order.id,
                clientName: `${order.first_name} ${order.last_name}`,
                phone: order.phone,
                total_price: order.total_price,
                status: order.status,
                created_at: order.created_at,
                items: items.map(i => ({
                    quantity: i.quantity,
                    food: { name: i.dish_name }
                }))
            });
        }

        return res.status(200).json(formattedOrders);

    } catch (error) {
        console.error("Erreur listing commandes gérant :", error);
        return res.status(500).json({ message: "Erreur lors du chargement des commandes." });
    }
};

// --- RÉCUPÉRER MES COMMANDES (Pour le client connecté) ---
exports.getClientOrders = async (req, res) => {
    const userId = req.user.id;

    try {
        const sqlOrders = `SELECT id, total_price, status, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC`;
        const [orders] = await db.query(sqlOrders, [userId]);

        const formattedOrders = [];
        for (const order of orders) {
            const sqlItems = `
                SELECT oi.quantity, d.name AS dish_name
                FROM order_items oi
                JOIN dishes d ON oi.dish_id = d.id
                WHERE oi.order_id = ?`;
            const [items] = await db.query(sqlItems, [order.id]);

            formattedOrders.push({
                id: order.id,
                status: order.status,
                total_price: order.total_price,
                created_at: order.created_at,
                items: items.map(i => ({
                    quantity: i.quantity,
                    food: { name: i.dish_name }
                }))
            });
        }

        return res.status(200).json(formattedOrders);

    } catch (error) {
        console.error("Erreur listing client :", error);
        return res.status(500).json({ message: "Erreur lors du suivi de vos commandes." });
    }
};


// --- MODIFIER LE STATUT D'UNE COMMANDE (Pour le gérant) ---
exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'en_attente', 'preparation', 'livraison', 'livree', 'annulee'

  if (!status) {
    return res.status(400).json({ message: "Le nouveau statut est requis." });
  }

  try {
    const sql = `UPDATE orders SET status = ? WHERE id = ?`;
    const [result] = await db.query(sql, [status, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Commande introuvable." });
    }

    await logActivity({
      userId: req.user?.id || null,
      user: req.user?.username || 'Gérant',
      type: 'ORDER',
      severity: 'medium',
      description: `Le statut de la commande #${id} a été modifié en "${status}".`
    });

    return res.status(200).json({ message: "Statut de la commande mis à jour !", status });
  } catch (error) {
    console.error("Erreur mise à jour commande :", error);
    return res.status(500).json({ message: "Erreur serveur de modification." });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(`
      SELECT
        o.id AS orderId,
        o.user_id,
        o.total_price,
        o.status,
        o.created_at,
        oi.id AS orderItemId,
        oi.quantity,
        oi.price AS itemPrice,
        d.name AS dishName
      FROM orders o
      INNER JOIN order_items oi ON o.id = oi.order_id
      INNER JOIN dishes d ON oi.dish_id = d.id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC, o.id DESC
    `, [userId]);

    const grouped = {};
    rows.forEach(row => {
      if (!grouped[row.orderId]) {
        grouped[row.orderId] = {
          id: row.orderId,
          user_id: row.user_id,
          total_price: row.total_price,
          status: row.status,
          created_at: row.created_at,
          items: []
        };
      }

      grouped[row.orderId].items.push({
        quantity: row.quantity,
        food: { name: row.dishName },
        price: row.itemPrice
      });
    });

    return res.json(Object.values(grouped));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Erreur lors du chargement des commandes.' });
  }
};

exports.createOrder = async (req, res) => {
  const connection = await db.getConnection();

  try {
    console.log('createOrder atteint');
    console.log('user:', req.user);
    console.log('body:', req.body);

    const userId = req.user?.id;
    const { total_price, items } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non identifié.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Panier vide.' });
    }

    if (!total_price || total_price <= 0) {
      return res.status(400).json({ message: 'Montant invalide.' });
    }

    await connection.beginTransaction();

    const [orderResult] = await connection.execute(
      `INSERT INTO orders (user_id, total_price, status) VALUES (?, ?, ?)`,
      [userId, total_price, 'en_attente']
    );

    const orderId = orderResult.insertId;

    for (const item of items) {
      if (!item.id || !item.quantity || !item.price) {
        throw new Error('Item invalide dans le panier.');
      }

      await connection.execute(
        `INSERT INTO order_items (order_id, dish_id, quantity, price) VALUES (?, ?, ?, ?)`,
        [orderId, item.id, item.quantity, item.price]
      );
    }

    await connection.commit();

    return res.status(201).json({
      message: 'Commande enregistrée avec succès.',
      orderId,
      itemsCount: items.reduce((sum, item) => sum + Number(item.quantity), 0),
      total_price
    });
  } catch (error) {
    await connection.rollback();
    console.error('Erreur createOrder:', error);
    return res.status(500).json({
      message: 'Erreur lors de la création de la commande.'
    });
  } finally {
    connection.release();
  }
};

exports.getReceipt = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);

    // Récupération commande + client
    const [orderRows] = await db.query(`
      SELECT o.id, o.total_price, o.status, o.created_at, u.first_name, u.last_name, u.phone
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `, [orderId]);

    if (orderRows.length === 0) {
      return res.status(404).json({ message: 'Commande introuvable.' });
    }

    const order = orderRows[0];

    // Récupération des plats
    const [itemsRows] = await db.query(`
      SELECT oi.quantity, oi.price, d.name AS dish_name, d.description
      FROM order_items oi
      JOIN dishes d ON oi.dish_id = d.id
      WHERE oi.order_id = ?
    `, [orderId]);

return res.json({
  id: order.id,
  createdAt: order.created_at,
  total: order.total_price,
  status: order.status,
  clientName: `${order.first_name} ${order.last_name}`,
  phoneNumber: order.phone,
  items: itemsRows.map(item => ({
    quantity: item.quantity,
    price: item.price,
    food: {
      name: item.dish_name,
      description: item.description
    }
  })),
  itemsCount: itemsRows.length
});

  } catch (error) {
    console.error('Erreur reçu:', error);
    return res.status(500).json({ message: 'Erreur serveur de reçu.' });
  }
};

exports.callRider = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);

    const [orderRows] = await db.query(
      `SELECT id, status, user_id FROM orders WHERE id = ?`,
      [orderId]
    );

    if (orderRows.length === 0) {
      return res.status(404).json({ message: 'Commande introuvable.' });
    }

    const order = orderRows[0];

    if (order.status === 'livree' || order.status === 'annulee') {
      return res.status(400).json({
        message: 'Impossible d’appeler le livreur pour une commande déjà finalisée.'
      });
    }

    const [deliveryResult] = await db.execute(
      `INSERT INTO deliveries (order_id, status, created_at) VALUES (?, 'en_cours', NOW())`,
      [orderId]
    );

    await db.execute(
      `UPDATE orders SET status = 'livraison' WHERE id = ?`,
      [orderId]
    );

    return res.json({
      message: 'Livreur notifié et livraison créée.',
      deliveryId: deliveryResult.insertId
    });
  } catch (error) {
    console.error('Erreur appel livreur:', error);
    return res.status(500).json({ message: 'Erreur lors de l\'appel du livreur.' });
  }
};