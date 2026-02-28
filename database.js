// ============================================================
// database.js — DEFOR
// Все товары и заказы → PostgreSQL через API
// Корзина → localStorage (сессионные данные)
// ============================================================

// ✅ Автоматически определяем URL в зависимости от окружения
const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api'
    : '/api';

// ── Кэш товаров (чтобы getDB() работал синхронно после первой загрузки) ──
let _cache = JSON.parse(localStorage.getItem('defor_db')) || [];

// ── ТОВАРЫ ────────────────────────────────────────────────────────────────

async function getDBAsync() {
    try {
        const res = await fetch(`${API}/products`);
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        _cache = data;
        localStorage.setItem('defor_db', JSON.stringify(data));
        return data;
    } catch (e) {
        console.warn('⚠ API недоступен, используем кэш:', e.message);
        return _cache;
    }
}

function getDB() {
    getDBAsync().catch(() => {});
    return _cache;
}

async function addProduct(product) {
    try {
        const res = await fetch(`${API}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Ошибка сервера: ${res.status}`);
        }
        const saved = await res.json();
        _cache.push(saved);
        localStorage.setItem('defor_db', JSON.stringify(_cache));
        return saved;
    } catch (e) {
        console.error('❌ addProduct:', e);
        throw e;
    }
}

async function deleteProduct(productId) {
    try {
        const res = await fetch(`${API}/products/${productId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        _cache = _cache.filter(p => p.id !== productId);
        localStorage.setItem('defor_db', JSON.stringify(_cache));
    } catch (e) {
        console.error('❌ deleteProduct:', e);
        throw e;
    }
}

async function getProductByIdAsync(productId) {
    try {
        const res = await fetch(`${API}/products/${productId}`);
        if (!res.ok) throw new Error('Not found');
        return await res.json();
    } catch (e) {
        return _cache.find(p => p.id === productId) || null;
    }
}

function getProductById(productId) {
    return _cache.find(p => p.id === productId) || null;
}

// ── ЗАКАЗЫ ────────────────────────────────────────────────────────────────

async function saveOrder(order) {
    try {
        const res = await fetch(`${API}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        });
        if (!res.ok) throw new Error('Order save failed');
        return await res.json();
    } catch (e) {
        console.warn('⚠ Заказ fallback localStorage:', e.message);
        const orders = JSON.parse(localStorage.getItem('defor_orders')) || [];
        orders.push({ ...order, id: 'ORDER-' + Date.now(), date: new Date().toISOString() });
        localStorage.setItem('defor_orders', JSON.stringify(orders));
    }
}

async function getOrders() {
    try {
        const res = await fetch(`${API}/orders`);
        if (!res.ok) throw new Error('Orders fetch failed');
        return await res.json();
    } catch (e) {
        return JSON.parse(localStorage.getItem('defor_orders')) || [];
    }
}

// ── КОРЗИНА (только localStorage) ────────────────────────────────────────

function getCart() {
    return JSON.parse(localStorage.getItem('defor_cart')) || [];
}

function saveCart(cart) {
    localStorage.setItem('defor_cart', JSON.stringify(cart));
}

function addToCart(product, quantity = 1, selectedColor = null) {
    const cart = getCart();
    const existing = cart.find(i => i.id === product.id && i.selectedColor === selectedColor);
    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({ ...product, quantity, selectedColor });
    }
    saveCart(cart);
}

function removeFromCart(productId, selectedColor = null) {
    saveCart(getCart().filter(i => !(i.id === productId && i.selectedColor === selectedColor)));
}

function updateCartQuantity(productId, quantity, selectedColor = null) {
    const cart = getCart();
    const item = cart.find(i => i.id === productId && i.selectedColor === selectedColor);
    if (item) {
        if (quantity <= 0) removeFromCart(productId, selectedColor);
        else { item.quantity = quantity; saveCart(cart); }
    }
}

function clearCart() {
    localStorage.removeItem('defor_cart');
}

function getCartTotal() {
    return getCart().reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
}

// Совместимость
function saveDB(data) {
    _cache = data;
    localStorage.setItem('defor_db', JSON.stringify(data));
}