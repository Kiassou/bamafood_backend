const db = require('../config/db');
const path = require('path');
const fs = require('fs');
const { logActivity } = require('../services/activityService');


// --- AJOUTER UN NOUVEAU PLAT ---
exports.createDish = async (req, res) => {
  const { name, price, category, description, isActive } = req.body;

  if (!name || !price || !category) {
    return res.status(400).json({ message: "Veuillez remplir tous les champs obligatoires (Nom, Prix, Catégorie)." });
  }

  if (!req.file) {
    return res.status(400).json({ message: "L'image du plat est requise pour la création." });
  }

  try {
    const imageUrl = `uploads/dishes/${req.file.filename}`;
    const isActiveVal = (isActive === 'true' || isActive === true || isActive === 1) ? 1 : 0;

    const sql = `INSERT INTO dishes (name, price, category, description, image_url, is_active) VALUES (?, ?, ?, ?, ?, ?)`;
    const [result] = await db.query(sql, [name, price, category, description || null, imageUrl, isActiveVal]);

    await logActivity({
      userId: req.user?.id || null,
      user: req.user?.username || 'Manager',
      type: 'STOCK',
      severity: 'medium',
      description: `Le plat "${name}" a été ajouté au menu.`
    });

    return res.status(201).json({
      message: "Plat créé avec succès !",
      dishId: result.insertId,
      dish: {
        id: result.insertId,
        name,
        price: parseInt(price),
        category,
        description,
        imageUrl,
        isActive: isActiveVal === 1
      }
    });
  } catch (error) {
    console.error("Erreur lors de la création du plat :", error);
    if (req.file) {
      const filePath = path.join(__dirname, '../public/uploads/dishes', req.file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    return res.status(500).json({ message: "Erreur serveur lors de la création du plat." });
  }
};

// --- RÉCUPÉRER LE CATALOGUE DU GÉRANT (Lister TOUT le catalogue y compris les désactivés) ---
exports.getManagerCatalog = async (req, res) => {
    try {
        // 1. Récupération de tous les plats
        const sqlAll = `SELECT id, name, price, category, description, image_url AS imageUrl, is_active AS isActive, order_count AS orderCount FROM dishes ORDER BY created_at DESC`;
        const [allDishes] = await db.query(sqlAll);

        // Ajustement des types booléens
        const formattedDishes = allDishes.map(dish => ({
            ...dish,
            isActive: dish.isActive === 1
        }));

        return res.status(200).json(formattedDishes);

    } catch (error) {
        console.error("Erreur lors de la récupération du catalogue :", error);
        return res.status(500).json({ message: "Erreur lors du chargement des données." });
    }
};

// --- RÉCUPÉRER LE CATALOGUE DU CLIENT (Seuls les plats actifs sont visibles !) ---
exports.getClientCatalog = async (req, res) => {
    try {
        const sql = `SELECT id, name, price, category, description, image_url AS imageUrl FROM dishes WHERE is_active = 1 ORDER BY category, name`;
        const [dishes] = await db.query(sql);

        return res.status(200).json(dishes);
    } catch (error) {
        console.error("Erreur catalogue client :", error);
        return res.status(500).json({ message: "Erreur lors de la récupération du menu." });
    }
};


// --- ACTIVER / DÉSACTIVER UN PLAT (Mise à jour rapide depuis le Switch) ---
exports.toggleDishStatus = async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (isActive === undefined) {
    return res.status(400).json({ message: "Le nouveau statut isActive est obligatoire." });
  }

  try {
    const statusValue = isActive ? 1 : 0;
    const sql = `UPDATE dishes SET is_active = ? WHERE id = ?`;
    const [result] = await db.query(sql, [statusValue, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Plat introuvable." });
    }

    await logActivity({
      userId: req.user?.id || null,
      user: req.user?.username || 'Manager',
      type: 'STOCK',
      severity: 'low',
      description: `Le plat #${id} a été ${isActive ? 'mis en ligne' : 'mis hors ligne'}.`
    });

    return res.status(200).json({ message: `Le plat a été ${isActive ? 'mis en ligne' : 'mis hors ligne'} avec succès !` });
  } catch (error) {
    console.error("Erreur lors de la modification de l'état du plat :", error);
    return res.status(500).json({ message: "Erreur serveur lors de la mise à jour." });
  }
};


// --- MODIFIER LES DÉTAILS D'UN PLAT (Avec ou sans mise à jour d'image) ---
exports.updateDishDetails = async (req, res) => {
  const { id } = req.params;
  const { name, price, category, description } = req.body;

  if (!name || !price || !category) {
    return res.status(400).json({ message: "Veuillez renseigner le Nom, le Prix et la Catégorie." });
  }

  try {
    const [currentResult] = await db.query(`SELECT image_url FROM dishes WHERE id = ?`, [id]);
    if (currentResult.length === 0) {
      return res.status(404).json({ message: "Plat non trouvé." });
    }

    let imageUrl = currentResult[0].image_url;

    if (req.file) {
      const oldImagePath = path.join(__dirname, '../public', imageUrl);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
      imageUrl = `uploads/dishes/${req.file.filename}`;
    }

    const sqlUpdate = `UPDATE dishes SET name = ?, price = ?, category = ?, description = ?, image_url = ? WHERE id = ?`;
    await db.query(sqlUpdate, [name, price, category, description || null, imageUrl, id]);

    await logActivity({
      userId: req.user?.id || null,
      user: req.user?.username || 'Manager',
      type: 'STOCK',
      severity: 'medium',
      description: `Le plat #${id} a été modifié.`
    });

    return res.status(200).json({
      message: "Plat mis à jour avec succès !",
      dish: { id, name, price, category, description, imageUrl }
    });
  } catch (error) {
    console.error("Erreur de modification du plat :", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

exports.getClientDishes = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        id,
        name,
        price,
        category,
        description,
        image_url AS imageUrl,
        is_active AS isActive,
        order_count AS orderCount
      FROM dishes
      WHERE is_active = 1
    `);

    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors du chargement des plats." });
  }
};