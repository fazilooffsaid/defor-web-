const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ КОРЕНЬ ПРОЕКТА — поднимаемся на уровень выше /backend
const ROOT = path.join(__dirname, '..');

// ✅ Статические файлы из КОРНЯ (style.css, app.js, все .html, картинки)
app.use(express.static(ROOT));

// ✅ CORS — разрешаем всё
app.use(cors({ origin: '*', credentials: true }));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ===== API ROUTES =====
app.use('/api/products', require('./routes/products'));
app.use('/api/orders',   require('./routes/orders'));
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/hero',     require('./routes/hero'));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', root: ROOT });
});

// ===== HTML страницы из корня =====
app.get('/', (req, res) => {
    res.sendFile(path.join(ROOT, 'index.html'));
});

app.get('/:page.html', (req, res) => {
    const filePath = path.join(ROOT, `${req.params.page}.html`);
    res.sendFile(filePath, err => {
        if (err) res.sendFile(path.join(ROOT, 'index.html'));
    });
});

// ===== Всё остальное → index.html =====
app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(ROOT, 'index.html'));
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`DEFOR running on http://localhost:${PORT}`);
    console.log(`Serving files from: ${ROOT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
