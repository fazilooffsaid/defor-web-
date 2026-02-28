// app.js - DEFOR
// ВАЖНО: переводы управляются только через lang-switcher.js
// Здесь только утилиты: корзина, toast, hero

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

// Оборачиваем addToCart чтобы показывать toast
document.addEventListener('DOMContentLoaded', () => {
    if (typeof addToCart === 'function' && !window._addToCartWrapped) {
        const original = addToCart;
        window.addToCart = function(product, quantity = 1, selectedColor = null) {
            original(product, quantity, selectedColor);
            showToast(product.title, selectedColor);
            updateCartCount();
        };
        window._addToCartWrapped = true;
    }
    updateCartCount();
    loadHeroBanner();
});

function loadHeroBanner() {
    const savedHero = localStorage.getItem('defor_hero');
    const heroBanner = document.getElementById('hero-banner');
    if (savedHero && heroBanner) {
        heroBanner.style.backgroundImage = `linear-gradient(135deg, rgba(26,35,50,0.8), rgba(45,62,80,0.9)), url(${savedHero})`;
        heroBanner.style.backgroundSize = 'cover';
        heroBanner.style.backgroundPosition = 'center';
    }
}

function formatPrice(price) {
    return Number(price).toLocaleString('ru-RU');
}