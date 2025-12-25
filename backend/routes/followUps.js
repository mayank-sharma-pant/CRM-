import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';

const router = express.Router();

// Get all follow-ups for user's business
router.get('/', async (req, res) => {
  try {
    const { date, status } = req.query;
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

    let query = `
      SELECT f.*, l.name as lead_name, l.email as lead_email, l.phone as lead_phone
      FROM follow_ups f
      JOIN leads l ON f.lead_id = l.id
      WHERE l.business_id = $1
    `;
    const params = [businessId];

    if (date) {
      query += ' AND f.scheduled_date = $2';
      params.push(date);
    }

    if (status) {
      query += date ? ' AND f.status = $3' : ' AND f.status = $2';
      params.push(status);
    }

    query += ' ORDER BY f.scheduled_date ASC, f.scheduled_time ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get follow-ups error:', error);
    res.status(500).json({ error: 'Failed to fetch follow-ups' });
  }
});

// Get today's follow-ups
router.get('/today', async (req, res) => {
  try {
    const userId = req.user.userId;

    const businessResult = await pool.query(
      'SELECT id FROM businesses WHERE user_id = $1',
      [userId]
    );

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessId = businessResult.rows[0].id;

    const today = new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT f.*, l.name as lead_name, l.email as lead_email, l.phone as lead_phone
       FROM follow_ups f
       JOIN leads l ON f.lead_id = l.id
       WHERE l.business_id = $1 AND f.scheduled_date = $2 AND f.status = 'Pending'
       ORDER BY f.scheduled_time ASC`,
      [businessId, today]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get today follow-ups error:', error);
    res.status(500).json({ error: 'Failed to fetch today\'s follow-ups' });
  }
});

// Get overdue follow-ups
router.get('/overdue', async (req, res) => {
  try {
    const userId = req.user.userId;

    const businessResult = await pool.query(
      'SELECT id FROM businesses WHERE user_id = $1',
      [userId]
    );

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessId = businessResult.rows[0].id;

    const today = new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT f.*, l.name as lead_name, l.email as lead_email, l.phone as lead_phone
       FROM follow_ups f
       JOIN leads l ON f.lead_id = l.id
       WHERE l.business_id = $1 AND f.scheduled_date < $2 AND f.status = 'Pending'
       ORDER BY f.scheduled_date ASC, f.scheduled_time ASC`,
      [businessId, today]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get overdue follow-ups error:', error);
    res.status(500).json({ error: 'Failed to fetch overdue follow-ups' });
  }
});

// Create follow-up
router.post(
  '/',
  [
    body('leadId').isUUID(),
    body('scheduledDate').isISO8601().toDate(),
    body('status').optional().isIn(['Pending', 'Completed', 'Missed']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user.userId;
      const { leadId, scheduledDate, scheduledTime, notes, status = 'Pending' } = req.body;

      // Verify lead belongs to user's business
      const businessResult = await pool.query(
        'SELECT id FROM businesses WHERE user_id = $1',
        [userId]
      );

      if (businessResult.rows.length === 0) {
        return res.status(404).json({ error: 'Business not found' });
      }

      const businessId = businessResult.rows[0].id;

      const leadCheck = await pool.query(
        'SELECT id FROM leads WHERE id = $1 AND business_id = $2',
        [leadId, businessId]
      );

      if (leadCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      const result = await pool.query(
        `INSERT INTO follow_ups (lead_id, scheduled_date, scheduled_time, notes, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [leadId, scheduledDate, scheduledTime || null, notes || null, status]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Create follow-up error:', error);
      res.status(500).json({ error: 'Failed to create follow-up' });
    }
  }
);

// Update follow-up
router.put(
  '/:id',
  [
    body('status').optional().isIn(['Pending', 'Completed', 'Missed']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const userId = req.user.userId;
      const { scheduledDate, scheduledTime, notes, status } = req.body;

      // Verify ownership
      const businessResult = await pool.query(
        'SELECT id FROM businesses WHERE user_id = $1',
        [userId]
      );

      if (businessResult.rows.length === 0) {
        return res.status(404).json({ error: 'Business not found' });
      }

      const businessId = businessResult.rows[0].id;

      // Verify follow-up belongs to user's business
      const followUpCheck = await pool.query(
        `SELECT f.id FROM follow_ups f
         JOIN leads l ON f.lead_id = l.id
         WHERE f.id = $1 AND l.business_id = $2`,
        [id, businessId]
      );

      if (followUpCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Follow-up not found' });
      }

      // Build update query
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (scheduledDate !== undefined) {
        updates.push(`scheduled_date = $${paramCount++}`);
        values.push(scheduledDate);
      }
      if (scheduledTime !== undefined) {
        updates.push(`scheduled_time = $${paramCount++}`);
        values.push(scheduledTime);
      }
      if (notes !== undefined) {
        updates.push(`notes = $${paramCount++}`);
        values.push(notes);
      }
      if (status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(status);
        if (status === 'Completed') {
          updates.push(`completed_at = CURRENT_TIMESTAMP`);
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(id);
      const query = `UPDATE follow_ups SET ${updates.join(', ')} 
                     WHERE id = $${paramCount++} 
                     RETURNING *`;

      const result = await pool.query(query, values);

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update follow-up error:', error);
      res.status(500).json({ error: 'Failed to update follow-up' });
    }
  }
);

// Delete follow-up
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify ownership
    const businessResult = await pool.query(
      'SELECT id FROM businesses WHERE user_id = $1',
      [userId]
    );

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessId = businessResult.rows[0].id;

    const followUpCheck = await pool.query(
      `SELECT f.id FROM follow_ups f
       JOIN leads l ON f.lead_id = l.id
       WHERE f.id = $1 AND l.business_id = $2`,
      [id, businessId]
    );

    if (followUpCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }

    await pool.query('DELETE FROM follow_ups WHERE id = $1', [id]);

    res.json({ message: 'Follow-up deleted successfully' });
  } catch (error) {
    console.error('Delete follow-up error:', error);
    res.status(500).json({ error: 'Failed to delete follow-up' });
  }
});

export default router;

