const mysql = require('mysql2');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Exporter la promesse pour pouvoir utiliser async/await si besoin
const db = pool.promise();

pool.getConnection((err, connection) => {
    if (err) {
        console.error("Erreur de connexion MySQL :", err);
    } else {
        console.log("Connecté avec succès à la base de données MySQL 🚀");
        connection.release();
    }
});

module.exports = db;