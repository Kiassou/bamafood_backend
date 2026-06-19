require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const dishRoutes = require('./routes/dishRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const userRoutes = require('./routes/userRoutes');
const managerRoutes = require('./routes/managerroutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const favoritesRoutes = require('./routes/favoritesRoutes');
const activityRoutes = require('./routes/activityRoutes');

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/dishes', dishRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/activities', activityRoutes);

app.get('/', (req, res) => {
  res.send('Le serveur BamaFood tourne à plein régime ! 🍔🏎️');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur Node.js démarré sur : http://localhost:${PORT}`);
});
