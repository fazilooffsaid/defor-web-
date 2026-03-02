const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT slot_index, image_data FROM showcase_photos ORDER BY slot_index');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch showcase' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { slotIndex, imageData } = req.body;
        await pool.query('DELETE FROM showcase_photos WHERE slot_index = $1', [slotIndex]);
        await pool.query('INSERT INTO showcase_photos (slot_index, image_data) VALUES ($1, $2)', [slotIndex, imageData]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update showcase' });
    }
});

router.delete('/:slot', async (req, res) => {
    try {
        await pool.query('DELETE FROM showcase_photos WHERE slot_index = $1', [req.params.slot]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete showcase photo' });
    }
});

module.exports = router;
