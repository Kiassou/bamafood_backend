const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Définition du chemin de stockage public
const uploadDir = path.join(__dirname, '../public/uploads/dishes');

// Création récursive du dossier de stockage s'il n'existe pas encore
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuration de la stratégie de stockage de Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Renommage sécurisé pour éviter les collisions de fichiers (ex: dish-1716912000000.png)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        cb(null, 'dish-' + uniqueSuffix + fileExtension);
    }
});

// Filtres de sécurité pour rejeter tout fichier qui n'est pas une image
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Le format du fichier est invalide. Seuls les fichiers JPG, JPEG, PNG et WEBP sont acceptés."), false);
    }
};

// Limite de taille fixée à 5 Mo par image
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = upload;