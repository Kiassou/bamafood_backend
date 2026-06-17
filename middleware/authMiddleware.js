const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // Récupération du token depuis le header 'Authorization'
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <TOKEN>"

    if (!token) {
        return res.status(401).json({ message: "Accès refusé. Aucun token fourni." });
    }

    try {
        // Vérification et décodage du token JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // On injecte les infos décodées (id, username, role) dans la requête
        req.user = decoded; 
        
        next(); // On passe au contrôleur suivant (getProfile ou updateProfile)
    } catch (error) {
        return res.status(403).json({ message: "Token invalide ou expiré." });
    }
};