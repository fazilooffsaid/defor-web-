// app.js - DEFOR
// ВАЖНО: переводы управляются только через lang-switcher.js
// Здесь только утилиты: корзина, toast, hero

const API_URL = "https://defor-web.onrender.com"; // URL твоего Render backend

// ========================
// Корзина и Toast
// ========================
function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('#cart-count, .cart-count').forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'block' : 'none';
    });
}

function showToast(productName, colorName) {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;
    const info = document.getElementById('toast-product-info');
    if (info) info.textContent = `${productName}${colorName ? ` (${colorName})` : ''}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ========================
// Загрузка товаров с backend
// ========================
async function fetchProducts() {
    try {
        const res = await fetch(`${API_URL}/api/products`);
        const products = await res.json();
        renderProducts(products);
    } catch (err) {
        console.error("Ошибка при загрузке товаров:", err);
    }
}

// ========================
// Рендер товаров на страницу
// ========================
function renderProducts(products) {
    const container = document.getElementById('products-container');
    if (!container) return;

    container.innerHTML = ''; // очищаем перед загрузкой

    products.forEach(product => {
        const div = document.createElement('div');
        div.className = 'product-card';
        div.innerHTML = `
            <img src="${product.image}" alt="${product.title}">
            <h3>${product.title}</h3>
            <p>${formatPrice(product.price)} ₽</p>
            <button onclick="addToCart(${product.id}, 1)">${product.buttonText || 'В корзину'}</button>
        `;
        container.appendChild(div);
    });
}

// ========================
// Hero Banner
// ========================
function loadHeroBanner() {
    const savedHero = localStorage.getItem('defor_hero');
    const heroBanner = document.getElementById('hero-banner');
    if (savedHero && heroBanner) {
        heroBanner.style.backgroundImage = `linear-gradient(135deg, rgba(26,35,50,0.8), rgba(45,62,80,0.9)), url(${savedHero})`;
        heroBanner.style.backgroundSize = 'cover';
        heroBanner.style.backgroundPosition = 'center';
    }
}

// ========================
// Форматирование цены
// ========================
function formatPrice(price) {
    return Number(price).toLocaleString('ru-RU');
}

// ========================
// Обёртка addToCart
// ========================
document.addEventListener('DOMContentLoaded', () => {
    // Оборачиваем addToCart чтобы показывать toast
    if (typeof addToCart === 'function' && !window._addToCartWrapped) {
        const original = addToCart;
        window.addToCart = function(productId, quantity = 1, selectedColor = null) {
            original(productId, quantity, selectedColor);

            // Найти продукт по id для toast
            const productCard = document.querySelector(`.product-card button[onclick*="${productId}"]`);
            const productName = productCard ? productCard.closest('.product-card').querySelector('h3').textContent : 'Товар';
            showToast(productName, selectedColor);
            updateCartCount();
        };
        window._addToCartWrapped = true;
    }

    updateCartCount();
    loadHeroBanner();
    fetchProducts(); // загружаем товары с backend
});