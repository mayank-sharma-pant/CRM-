import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';

const router = express.Router();

// Get all leads for user's business
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    const userId = req.user.userId;

    // Get business_id
    const businessResult = await pool.query(
      'SELECT id FROM businesses WHERE user_id = $1',
      [userId]
    );

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessId = businessResult.rows[0].id;

    let query = 'SELECT * FROM leads WHERE business_id = $1';
    const params = [businessId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    if (search) {
      const searchParam = `%${search}%`;
      query += status
        ? ' AND (name ILIKE $3 OR email ILIKE $3 OR phone ILIKE $3)'
        : ' AND (name ILIKE $2 OR email ILIKE $2 OR phone ILIKE $2)';
      params.push(searchParam);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Get single lead
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify business ownership
    const businessResult = await pool.query(
      'SELECT id FROM businesses WHERE user_id = $1',
      [userId]
    );

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessId = businessResult.rows[0].id;

    const result = await pool.query(
      'SELECT * FROM leads WHERE id = $1 AND business_id = $2',
      [id, businessId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// Create lead
router.post(
  '/',
  [
    body('name').trim().notEmpty(),
    body('status').optional().isIn(['New', 'Contacted', 'Follow-up', 'Converted', 'Lost']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user.userId;
      const { name, email, phone, serviceType, source, status = 'New' } = req.body;

      // Get business_id
      const businessResult = await pool.query(
        'SELECT id FROM businesses WHERE user_id = $1',
        [userId]
      );

      if (businessResult.rows.length === 0) {
        return res.status(404).json({ error: 'Business not found' });
      }

      const businessId = businessResult.rows[0].id;

      const result = await pool.query(
        `INSERT INTO leads (business_id, name, email, phone, service_type, source, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [businessId, name, email || null, phone || null, serviceType || null, source || null, status]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Create lead error:', error);
      res.status(500).json({ error: 'Failed to create lead' });
    }
  }
);

// Update lead
router.put(
  '/:id',
  [
    body('status').optional().isIn(['New', 'Contacted', 'Follow-up', 'Converted', 'Lost']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const userId = req.user.userId;
      const { name, email, phone, serviceType, source, status } = req.body;

      // Verify business ownership
      const businessResult = await pool.query(
        'SELECT id FROM businesses WHERE user_id = $1',
        [userId]
      );

      if (businessResult.rows.length === 0) {
        return res.status(404).json({ error: 'Business not found' });
      }

      const businessId = businessResult.rows[0].id;

      // Build update query dynamically
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(name);
      }
      if (email !== undefined) {
        updates.push(`email = $${paramCount++}`);
        values.push(email);
      }
      if (phone !== undefined) {
        updates.push(`phone = $${paramCount++}`);
        values.push(phone);
      }
      if (serviceType !== undefined) {
        updates.push(`service_type = $${paramCount++}`);
        values.push(serviceType);
      }
      if (source !== undefined) {
        updates.push(`source = $${paramCount++}`);
        values.push(source);
      }
      if (status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(status);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(id, businessId);
      const query = `UPDATE leads SET ${updates.join(', ')} 
                     WHERE id = $${paramCount++} AND business_id = $${paramCount++} 
                     RETURNING *`;

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update lead error:', error);
      res.status(500).json({ error: 'Failed to update lead' });
    }
  }
);

// Delete lead
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify business ownership
    const businessResult = await pool.query(
      'SELECT id FROM businesses WHERE user_id = $1',
      [userId]
    );

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessId = businessResult.rows[0].id;

    const result = await pool.query(
      'DELETE FROM leads WHERE id = $1 AND business_id = $2 RETURNING id',
      [id, businessId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

export default router;

