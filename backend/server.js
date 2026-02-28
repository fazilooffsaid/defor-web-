const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Раздаём статические файлы из папки backend (если есть)
app.use(express.static(path.join(__dirname)));

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://127.0.0.1:5500',
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Логирование
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/hero', require('./routes/hero'));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'DEFOR API is running' });
});

// 👇 ИСПРАВЛЕНО: отдаём index.html из КОРНЕВОЙ папки
app.use((req, res, next) => {
    // Если запрос начинается с /api — пропускаем на 404
    if (req.path.startsWith('/api')) {
        return next();
    }
    // Поднимаемся на уровень выше из /backend в корень и отдаём index.html
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// 404 handler (только для /api)
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 DEFOR Backend API running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;