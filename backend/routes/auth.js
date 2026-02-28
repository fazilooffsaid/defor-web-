const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/register', async (req, res) => {
    try {
        const { phone, password } = req.body;
        
        const checkQuery = 'SELECT * FROM users WHERE phone = $1';
        const checkResult = await pool.query(checkQuery, [phone]);
        
        if (checkResult.rows.length > 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Этот номер уже зарегистрирован'
            });
        }
        
        const insertQuery = `
            INSERT INTO users (phone, password)
            VALUES ($1, $2)
            RETURNING id, phone, registered_at
        `;
        
        const result = await pool.query(insertQuery, [phone, password]);
        const user = result.rows[0];
        
        res.status(201).json({
            success: true,
            user: {
                id: user.id,
                phone: user.phone,
                registeredAt: user.registered_at
            }
        });
        
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { phone, password } = req.query;
        
        const query = 'SELECT * FROM users WHERE phone = $1 AND password = $2';
        const result = await pool.query(query, [phone, password]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Неверный номер или пароль'
            });
        }
        
        const user = result.rows[0];
        
        res.json({
            success: true,
            user: {
                id: user.id,
                phone: user.phone,
                registeredAt: user.registered_at
            }
        });
        
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

module.exports = router;
