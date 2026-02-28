const express = require('express');
const router = express.Router();
const pool = require('../db');
const fetch = require('node-fetch');

// POST /api/orders
router.post('/', async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { name, city, phone, items, total } = req.body;
        
        await client.query('BEGIN');
        
        const orderQuery = `
            INSERT INTO orders (customer_name, customer_city, customer_phone, total_amount, status)
            VALUES ($1, $2, $3, $4, 'pending')
            RETURNING *
        `;
        
        const orderResult = await client.query(orderQuery, [name, city, phone, total]);
        const order = orderResult.rows[0];
        
        for (const item of items) {
            await client.query(
                `INSERT INTO order_items (order_id, product_id, product_title, product_collection, color, quantity, price)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [order.id, item.id, item.title, item.collection || '', item.selectedColor || item.color, item.quantity, item.price]
            );
        }
        
        await client.query('COMMIT');
        
        try {
            await sendToTelegram(order, items, total);
        } catch (telegramError) {
            console.error('Telegram error:', telegramError);
        }
        
        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            orderNumber: order.order_number
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Failed to create order' });
    } finally {
        client.release();
    }
});

// GET /api/orders
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT o.*,
                   COALESCE(json_agg(
                       json_build_object(
                           'productId', oi.product_id,
                           'title', oi.product_title,
                           'collection', oi.product_collection,
                           'color', oi.color,
                           'quantity', oi.quantity,
                           'price', oi.price
                       )
                   ) FILTER (WHERE oi.id IS NOT NULL), '[]'::json) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `;
        
        const result = await pool.query(query);
        
        const orders = result.rows.map(row => ({
            id: row.id,
            orderNumber: row.order_number,
            customer: {
                name: row.customer_name,
                city: row.customer_city,
                phone: row.customer_phone
            },
            items: row.items,
            total: parseFloat(row.total_amount),
            status: row.status,
            date: row.created_at
        }));
        
        res.json(orders);
        
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

async function sendToTelegram(order, items, total) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!botToken || !chatId) {
        console.warn('⚠️ Telegram credentials not configured');
        return;
    }
    
    let message = `🛍 <b>НОВЫЙ ЗАКАЗ!</b>\n\n`;
    message += `📋 Номер: <code>${order.order_number}</code>\n`;
    message += `📅 Дата: ${new Date(order.created_at).toLocaleString('ru-RU')}\n\n`;
    message += `👤 <b>Клиент:</b>\n`;
    message += `  Имя: ${order.customer_name}\n`;
    message += `  Город: ${order.customer_city}\n`;
    message += `  Телефон: ${order.customer_phone}\n\n`;
    message += `📦 <b>Товары:</b>\n`;
    
    items.forEach((item, idx) => {
        message += `\n${idx + 1}. <b>${item.title}</b>\n`;
        if (item.collection) message += `   ID: ${item.collection}\n`;
        message += `   Цвет: ${item.selectedColor || item.color}\n`;
        message += `   Количество: ${item.quantity}\n`;
        message += `   Цена: ${(item.price * item.quantity).toLocaleString()} UZS\n`;
    });
    
    message += `\n💰 <b>ИТОГО: ${total.toLocaleString()} UZS</b>`;
    
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML'
        })
    });
    
    const data = await response.json();
    
    if (!data.ok) {
        throw new Error('Telegram API error');
    }
    
    console.log('✅ Order sent to Telegram');
}

module.exports = router;
