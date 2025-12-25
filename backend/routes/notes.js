import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';

const router = express.Router();

// Get all notes for a lead
router.get('/lead/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    const userId = req.user.userId;

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
      'SELECT * FROM notes WHERE lead_id = $1 ORDER BY created_at DESC',
      [leadId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Create note
router.post(
  '/',
  [
    body('leadId').isUUID(),
    body('content').trim().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user.userId;
      const { leadId, content } = req.body;

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
        'INSERT INTO notes (lead_id, content) VALUES ($1, $2) RETURNING *',
        [leadId, content]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Create note error:', error);
      res.status(500).json({ error: 'Failed to create note' });
    }
  }
);

// Update note
router.put(
  '/:id',
  [
    body('content').trim().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const userId = req.user.userId;
      const { content } = req.body;

      // Verify ownership
      const businessResult = await pool.query(
        'SELECT id FROM businesses WHERE user_id = $1',
        [userId]
      );

      if (businessResult.rows.length === 0) {
        return res.status(404).json({ error: 'Business not found' });
      }

      const businessId = businessResult.rows[0].id;

      // Verify note belongs to user's business
      const noteCheck = await pool.query(
        `SELECT n.id FROM notes n
         JOIN leads l ON n.lead_id = l.id
         WHERE n.id = $1 AND l.business_id = $2`,
        [id, businessId]
      );

      if (noteCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Note not found' });
      }

      const result = await pool.query(
        'UPDATE notes SET content = $1 WHERE id = $2 RETURNING *',
        [content, id]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update note error:', error);
      res.status(500).json({ error: 'Failed to update note' });
    }
  }
);

// Delete note
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

    const noteCheck = await pool.query(
      `SELECT n.id FROM notes n
       JOIN leads l ON n.lead_id = l.id
       WHERE n.id = $1 AND l.business_id = $2`,
      [id, businessId]
    );

    if (noteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    await pool.query('DELETE FROM notes WHERE id = $1', [id]);

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;

