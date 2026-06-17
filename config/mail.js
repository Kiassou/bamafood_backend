const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Fonction pour envoyer le superbe email de bienvenue premium
 */
const sendWelcomeEmail = (email, firstName) => {
    const mailOptions = {
        from: `"BamaFood 🍔" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Bienvenue chez BamaFood ! 👋✨',
        html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    background: #0a0a0a;
                    font-family: Arial, Helvetica, sans-serif;
                }
                .container {
                    width: 100%;
                    padding: 40px 20px;
                    background: #0a0a0a;
                    box-sizing: border-box;
                }
                .card {
                    max-width: 600px;
                    margin: auto;
                    background: #111111;
                    border-radius: 24px;
                    overflow: hidden;
                    border: 1px solid rgba(255, 184, 0, 0.2);
                    box-shadow: 0 0 20px rgba(255, 184, 0, 0.15);
                }
                .header {
                    background: linear-gradient(135deg, #ffb800, #ff8c00);
                    padding: 35px;
                    text-align: center;
                }
                .header h1 {
                    margin: 0;
                    color: black;
                    font-size: 40px;
                    font-weight: 900;
                }
                .body {
                    padding: 40px;
                    color: white;
                }
                .body h2 {
                    color: #ffb800;
                    margin-top: 0;
                    margin-bottom: 20px;
                }
                .body p {
                    color: #d6d6d6;
                    line-height: 1.8;
                    font-size: 16px;
                }
                .button {
                    display: inline-block;
                    margin-top: 30px;
                    padding: 14px 30px;
                    background: linear-gradient(135deg, #ffb800, #ff8c00);
                    color: black !important;
                    text-decoration: none;
                    border-radius: 12px;
                    font-weight: bold;
                }
                .footer {
                    padding: 25px;
                    text-align: center;
                    color: #777777;
                    font-size: 14px;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="card">
                    <div class="header">
                        <h1>BamaFood</h1>
                    </div>
                    <div class="body">
                        <h2>Bienvenue ${firstName} 👋</h2>
                        <p>
                            Votre compte BamaFood a été créé avec succès.
                            Préparez-vous à découvrir une nouvelle expérience
                            de commande en ligne rapide, moderne et premium.
                        </p>
                        <p>
                            Commandez vos plats favoris,
                            suivez vos livraisons en temps réel
                            et profitez de l’univers BamaFood.
                        </p>
                        <a href="http://localhost:4200/login" class="button">
                            Commencer maintenant
                        </a>
                    </div>
                    <div class="footer">
                        © 2026 BamaFood — Tous droits réservés
                    </div>
                </div>
            </div>
        </body>
        </html>
        `
    };

    return transporter.sendMail(mailOptions);
};

const sendOtpEmail = (email, otp, firstName) => {
    const mailOptions = {
        from: `"BamaFood 🍔" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Votre code OTP BamaFood 🔐',
        html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    background: #0a0a0a;
                    font-family: Arial, Helvetica, sans-serif;
                }
                .container {
                    width: 100%;
                    padding: 40px 20px;
                    background: #0a0a0a;
                    box-sizing: border-box;
                }
                .card {
                    max-width: 600px;
                    margin: auto;
                    background: #111111;
                    border-radius: 24px;
                    overflow: hidden;
                    border: 1px solid rgba(255, 184, 0, 0.2);
                    box-shadow: 0 0 20px rgba(255, 184, 0, 0.15);
                }
                .header {
                    background: linear-gradient(135deg, #ffb800, #ff8c00);
                    padding: 35px;
                    text-align: center;
                }
                .header h1 {
                    margin: 0;
                    color: black;
                    font-size: 34px;
                    font-weight: 900;
                }
                .body {
                    padding: 40px;
                    color: white;
                }
                .body h2 {
                    color: #ffb800;
                    margin-top: 0;
                    margin-bottom: 20px;
                }
                .otp-box {
                    display: inline-block;
                    margin: 20px 0;
                    padding: 16px 28px;
                    font-size: 30px;
                    font-weight: 900;
                    letter-spacing: 6px;
                    color: #000;
                    background: linear-gradient(135deg, #ffb800, #ff8c00);
                    border-radius: 14px;
                }
                .body p {
                    color: #d6d6d6;
                    line-height: 1.8;
                    font-size: 16px;
                }
                .footer {
                    padding: 25px;
                    text-align: center;
                    color: #777777;
                    font-size: 14px;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="card">
                    <div class="header">
                        <h1>BamaFood</h1>
                    </div>
                    <div class="body">
                        <h2>Bonjour ${firstName || ''}</h2>
                        <p>Voici votre code OTP pour réinitialiser votre mot de passe :</p>
                        <div class="otp-box">${otp}</div>
                        <p>Ce code est valide pour une courte durée. Si vous n’êtes pas à l’origine de cette demande, ignorez simplement cet email.</p>
                    </div>
                    <div class="footer">
                        © 2026 BamaFood — Tous droits réservés
                    </div>
                </div>
            </div>
        </body>
        </html>
        `
    };
    return transporter.sendMail(mailOptions);
};

module.exports = { sendWelcomeEmail, sendOtpEmail };