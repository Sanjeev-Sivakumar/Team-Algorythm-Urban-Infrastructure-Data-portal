const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRouter');
const assetRoutes = require('./routes/assetRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const slaRoutes = require('./routes/slaRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const exportRoutes = require('./routes/exportRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const advancedRoutes = require('./routes/advancedRoutes');
const authMiddleware = require('./middleware/auth');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/assets', authMiddleware, assetRoutes);
app.use('/api/maintenance', authMiddleware, maintenanceRoutes);
app.use('/api/sla', authMiddleware, slaRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/export', authMiddleware, exportRoutes);
app.use('/api/complaints', authMiddleware, complaintRoutes);
app.use('/api/advanced', authMiddleware, advancedRoutes);

app.get('/', (req, res) => {
    res.send('🏙️ Urban Infrastructure Portal Backend is running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});