const db = require('../config/db');

// --- VERIFICATION SECURISEE DU CODE PIN D'UN GERANT ---
// Cet endpoint valide le code PIN à 6 chiffres pour les gérants afin d'accéder au panneau d'administration
exports.verifyPin = async (req, res) => {
    const { pin } = req.body;
    const userId = req.user.id; // Récupéré depuis le middleware de token JWT 'verifyToken'

    if (!pin || pin.length !== 6) {
        return res.status(400).json({ message: "Le code PIN doit comporter exactement 6 chiffres." });
    }

    try {
        // Recherche de l'utilisateur connecté dans MySQL
        const [users] = await db.query('SELECT role, pin_code FROM users WHERE id = ?', [userId]);

        if (users.length === 0) {
            return res.status(404).json({ message: "Utilisateur gérant introuvable." });
        }

        const user = users[0];

        // Sécurité supplémentaire : s'assurer que c'est bien un Gérant qui tente de taper son PIN
        if (user.role !== 'GERANT') {
            return res.status(403).json({ message: "Accès interdit. Seul un Gérant peut utiliser un Code PIN." });
        }

        // Vérification de la correspondance du code PIN
        if (user.pin_code !== pin) {
            return res.status(401).json({ message: "Code PIN de sécurité incorrect." });
        }

        // Succès de l'authentification PIN
        return res.status(200).json({
            success: true,
            message: "Authentification PIN réussie ! Bienvenue dans l'espace d'administration."
        });

    } catch (error) {
        console.error("Erreur serveur lors de la vérification du code PIN :", error);
        return res.status(500).json({ message: "Une erreur interne est survenue lors de la validation." });
    }
};