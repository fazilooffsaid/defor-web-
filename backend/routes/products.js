const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/products
router.get('/', async (req, res) => {
    try {
        const { category, is_new } = req.query;
        
        let query = `
            SELECT p.*, 
                   COALESCE(json_agg(
                       json_build_object(
                           'id', pc.id,
                           'name', pc.color_name,
                           'available', pc.available,
                           'images', (
                               SELECT COALESCE(json_agg(pi.image_data ORDER BY pi.image_order), '[]'::json)
                               FROM product_images pi
                               WHERE pi.product_color_id = pc.id
                           )
                       )
                   ) FILTER (WHERE pc.id IS NOT NULL), '[]'::json) as colors
            FROM products p
            LEFT JOIN product_colors pc ON p.id = pc.product_id
        `;
        
        const conditions = [];
        const params = [];
        
        if (category) {
            conditions.push(`p.category = $${params.length + 1}`);
            params.push(category);
        }
        
        if (is_new !== undefined) {
            conditions.push(`p.is_new = $${params.length + 1}`);
            params.push(is_new === 'true');
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' GROUP BY p.id ORDER BY p.created_at DESC';
        
        const result = await pool.query(query, params);
        
        const products = result.rows.map(row => ({
            id: row.id,
            title: row.title,
            collection: row.collection,
            price: parseFloat(row.price),
            category: row.category,
            description: row.description,
            isNew: row.is_new,
            colors: row.colors,
            images: row.colors && row.colors[0] && row.colors[0].images ? row.colors[0].images : [],
            createdAt: row.created_at
        }));
        
        res.json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT p.*, 
                   COALESCE(json_agg(
                       json_build_object(
                           'id', pc.id,
                           'name', pc.color_name,
                           'available', pc.available,
                           'images', (
                               SELECT COALESCE(json_agg(pi.image_data ORDER BY pi.image_order), '[]'::json)
                               FROM product_images pi
                               WHERE pi.product_color_id = pc.id
                           )
                       )
                   ) FILTER (WHERE pc.id IS NOT NULL), '[]'::json) as colors
            FROM products p
            LEFT JOIN product_colors pc ON p.id = pc.product_id
            WHERE p.id = $1
            GROUP BY p.id
        `;
        
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        const row = result.rows[0];
        const product = {
            id: row.id,
            title: row.title,
            collection: row.collection,
            price: parseFloat(row.price),
            category: row.category,
            description: row.description,
            isNew: row.is_new,
            colors: row.colors,
            images: row.colors && row.colors[0] && row.colors[0].images ? row.colors[0].images : [],
            createdAt: row.created_at
        };
        
        res.json(product);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// POST /api/products
router.post('/', async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { id, title, collection, price, category, description, colors, isNew } = req.body;
        
        await client.query('BEGIN');
        
        const productQuery = `
            INSERT INTO products (id, title, collection, price, category, description, is_new)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        
        const productResult = await client.query(productQuery, [
            id,
            title,
            collection,
            price,
            category,
            description || null,
            isNew || false
        ]);
        
        const product = productResult.rows[0];
        
        if (colors && colors.length > 0) {
            for (const color of colors) {
                const colorQuery = `
                    INSERT INTO product_colors (product_id, color_name, available)
                    VALUES ($1, $2, $3)
                    RETURNING id
                `;
                
                const colorResult = await client.query(colorQuery, [
                    product.id,
                    color.name,
                    color.available !== false
                ]);
                
                const colorId = colorResult.rows[0].id;
                
                if (color.images && color.images.length > 0) {
                    for (let i = 0; i < color.images.length; i++) {
                        await client.query(
                            `INSERT INTO product_images (product_color_id, image_data, image_order)
                             VALUES ($1, $2, $3)`,
                            [colorId, color.images[i], i]
                        );
                    }
                }
            }
        }
        
        await client.query('COMMIT');
        
        res.status(201).json({ 
            success: true,
            message: 'Product created successfully',
            productId: product.id
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Failed to create product' });
    } finally {
        client.release();
    }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json({ 
            success: true,
            message: 'Product deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

module.exports = router;
