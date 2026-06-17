const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendWelcomeEmail,sendOtpEmail } = require('../config/mail');
const otpStore = {};

// --- INSCRIPTION ---
exports.register = async (req, res) => {
    const { lastName, firstName, username, phone, email, password } = req.body;

    if (!lastName || !firstName || !username || !phone || !email || !password) {
        return res.status(400).json({ message: "Veuillez remplir tous les champs." });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = `INSERT INTO users (last_name, first_name, username, phone, email, password, role) VALUES (?, ?, ?, ?, ?, ?, 'CLIENT')`;
        
        await db.query(sql, [lastName, firstName, username, phone, email, hashedPassword]);

        // Envoi asynchrone de l'email en arrière-plan
        sendWelcomeEmail(email, firstName, username)
            .then(() => console.log(`Email de bienvenue envoyé à ${email}`))
            .catch(err => console.error("Erreur d'envoi de l'email :", err));

        return res.status(201).json({ message: "Utilisateur créé avec succès ! Email envoyé." });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: "L'identifiant ou l'adresse email existe déjà." });
        }
        console.error(error);
        return res.status(500).json({ message: "Erreur lors de l'inscription." });
    }
};

// --- CONNEXION ---
exports.login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Champs requis." });
    }

    try {
        const sql = `SELECT * FROM users WHERE username = ?`;
        const [results] = await db.query(sql, [username]);

        if (results.length === 0) {
            return res.status(400).json({ message: "Identifiants incorrects." });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.status(400).json({ message: "Identifiants incorrects." });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        return res.status(200).json({
            message: "Connexion réussie !",
            token: token,
            user: {
                id: user.id,
                lastName: user.last_name,
                firstName: user.first_name,
                username: user.username,
                phoneNumber: user.phone,
                email: user.email,
                role: user.role,
                createdAt: user.created_at,
                updatedAt: user.updated_at,
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erreur serveur lors de la connexion." });
    }
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Veuillez saisir votre adresse email." });
    }

    try {
        const sql = `SELECT * FROM users WHERE email = ?`;
        const [results] = await db.query(sql, [email]);

        if (results.length === 0) {
            return res.status(404).json({ message: "Aucun compte trouvé avec cet email." });
        }

        const user = results[0];
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        otpStore[email] = {
            otp,
            userId: user.id,
            expiresAt: Date.now() + 10 * 60 * 1000
        };

        await sendOtpEmail(email, otp, user.first_name);

        return res.status(200).json({
            message: "Un code OTP a été envoyé à votre adresse email."
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erreur lors de l'envoi du code OTP." });
    }
};

exports.verifyOtp = async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ message: "Email et OTP requis." });
    }

    const record = otpStore[email];

    if (!record) {
        return res.status(400).json({ message: "Code OTP invalide ou expiré." });
    }

    if (record.expiresAt < Date.now()) {
        delete otpStore[email];
        return res.status(400).json({ message: "Code OTP expiré." });
    }

    if (record.otp !== otp) {
        return res.status(400).json({ message: "Code OTP incorrect." });
    }

    return res.status(200).json({
        message: "OTP validé avec succès.",
        email,
        userId: record.userId
    });
};

exports.resetPassword = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email et mot de passe requis." });
    }

    try {
        const [results] = await db.query(`SELECT * FROM users WHERE email = ?`, [email]);

        if (results.length === 0) {
            return res.status(404).json({ message: "Utilisateur introuvable." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.query(`UPDATE users SET password = ? WHERE email = ?`, [hashedPassword, email]);

        return res.status(200).json({ message: "Mot de passe réinitialisé avec succès." });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erreur lors de la réinitialisation." });
    }
};

