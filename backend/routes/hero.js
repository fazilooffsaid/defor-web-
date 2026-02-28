const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT image_data, updated_at FROM hero_banner ORDER BY id DESC LIMIT 1');
        
        if (result.rows.length === 0) {
            return res.json({ imageData: null });
        }
        
        res.json({
            imageData: result.rows[0].image_data,
            updatedAt: result.rows[0].updated_at
        });
        
    } catch (error) {
        console.error('Error fetching hero banner:', error);
        res.status(500).json({ error: 'Failed to fetch hero banner' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { imageData } = req.body;
        
        await pool.query('DELETE FROM hero_banner');
        await pool.query('INSERT INTO hero_banner (image_data) VALUES ($1)', [imageData]);
        
        res.json({
            success: true,
            message: 'Hero banner updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating hero banner:', error);
        res.status(500).json({ error: 'Failed to update hero banner' });
    }
});

module.exports = router;
