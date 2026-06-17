const db = require('../config/db'); 

// Récupérer les messages de l'utilisateur connecté
exports.getMyNotifications = async (req, res) => {
    const userId = req.user.id;
    try {
        const sql = `
            SELECT n.*, u.first_name, u.last_name, u.role AS sender_role 
            FROM notifications n
            JOIN users u ON n.sender_id = u.id
            WHERE n.recipient_id = ?
            ORDER BY n.created_at DESC`;
        
        const [notifications] = await db.query(sql, [userId]);
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération des messages." });
    }
};

// Envoyer un message à tous les utilisateurs (Broadcast)
exports.sendBroadcast = async (req, res) => {
    const { subject, message } = req.body;
    const sender_id = req.user.id;

    try {
        // Sélectionner tous les IDs d'utilisateurs
        const [users] = await db.query('SELECT id FROM users');
        
        // Créer une requête d'insertion multiple
        const values = users.map(u => [sender_id, u.id, subject, message]);
        const sql = 'INSERT INTO notifications (sender_id, recipient_id, subject, message) VALUES ?';
        
        await db.query(sql, [values]);
        res.status(201).json({ message: "Broadcast envoyé avec succès !" });
    } catch (error) {
        res.status(500).json({ message: "Erreur lors du broadcast." });
    }
};

// Envoyer un nouveau message
exports.sendMessage = async (req, res) => {
    const { recipient_id, subject, message } = req.body;
    const sender_id = req.user.id;

    try {
        const sql = `INSERT INTO notifications (sender_id, recipient_id, subject, message) VALUES (?, ?, ?, ?)`;
        await db.query(sql, [sender_id, recipient_id, subject, message]);
        res.status(201).json({ message: "Message envoyé avec succès !" });
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de l'envoi du message." });
    }
};

// Supprimer un message
exports.deleteNotification = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        // On s'assure que l'utilisateur est bien le destinataire avant de supprimer
        const sql = `DELETE FROM notifications WHERE id = ? AND recipient_id = ?`;
        await db.query(sql, [id, userId]);
        res.status(200).json({ message: "Message supprimé." });
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la suppression." });
    }
};

exports.markAsRead = async (req, res) => {
    const { id } = req.params; // Récupère l'ID depuis l'URL
    const userId = req.user.id; // ID de l'utilisateur connecté

    try {
        // Mise à jour de la colonne is_read dans la table
        const [result] = await db.query(
            'UPDATE notifications SET is_read = 1 WHERE id = ? AND recipient_id = ?',
            [id, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Notification non trouvée ou non autorisée." });
        }

        res.status(200).json({ message: "Notification marquée comme lue." });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur lors de la mise à jour." });
    }
};