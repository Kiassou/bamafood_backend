const db = require('../config/db');
const { logActivity } = require('../services/activityService');


// --- RÉCUPÉRER TOUS LES UTILISATEURS (Gérants, Livreurs, Clients) ---
exports.getAllUsers = async (req, res) => {
    try {
        console.log("Tentative de récupération...");
        // On enlève le WHERE pour être sûr que ça n'est pas lui qui bloque
        const sql = `SELECT * FROM users`; 
        const [users] = await db.query(sql);
        
        console.log("Nombre d'utilisateurs trouvés :", users.length); // Regarde dans ton terminal Node.js
        return res.status(200).json(users);
    } catch (error) {
        console.error("Erreur :", error);
        return res.status(500).json({ message: "Erreur serveur" });
    }
};


// --- MODIFIER LE RÔLE D'UN UTILISATEUR ---
exports.updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  const allowedRoles = ['CLIENT', 'LIVREUR', 'GERANT'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: "Rôle invalide." });
  }

  try {
    const sql = `UPDATE users SET role = ? WHERE id = ?`;
    const [result] = await db.query(sql, [role, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    await logActivity({
      userId: req.user?.id || null,
      user: req.user?.username || 'Admin',
      type: 'USER',
      severity: 'medium',
      description: `Le rôle de l'utilisateur #${id} a été modifié en "${role}".`
    });

    return res.status(200).json({ message: "Le rôle de l'utilisateur a été mis à jour avec succès !" });
  } catch (error) {
    console.error("Erreur lors du changement de rôle :", error);
    return res.status(500).json({ message: "Erreur serveur lors de la mise à jour." });
  }
};


// --- BLOQUER OU DÉBLOQUER UN UTILISATEUR (SWITCH) ---
exports.toggleUserBlock = async (req, res) => {
  const { id } = req.params;
  const { isBlocked } = req.body;

  if (isBlocked === undefined) {
    return res.status(400).json({ message: "L'état de blocage (isBlocked) est requis." });
  }

  try {
    const blockValue = isBlocked ? 1 : 0;
    const sql = `UPDATE users SET is_blocked = ? WHERE id = ?`;
    const [result] = await db.query(sql, [blockValue, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    await logActivity({
      userId: req.user?.id || null,
      user: req.user?.username || 'Admin',
      type: 'SECURITY',
      severity: 'high',
      description: `Le compte utilisateur #${id} a été ${isBlocked ? 'bloqué' : 'débloqué'}.`
    });

    return res.status(200).json({
      message: `Le compte de l'utilisateur a été ${isBlocked ? 'bloqué' : 'débloqué'} avec succès !`
    });
  } catch (error) {
    console.error("Erreur de blocage :", error);
    return res.status(500).json({ message: "Erreur serveur lors de l'application de l'état." });
  }
};