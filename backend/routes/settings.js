import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';

const router = express.Router();

// Get business settings
router.get('/business', async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      'SELECT * FROM businesses WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get business settings error:', error);
    res.status(500).json({ error: 'Failed to fetch business settings' });
  }
});

// Update business settings
router.put(
  '/business',
  [
    body('name').optional().trim().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user.userId;
      const { name, phone, address } = req.body;

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(name);
      }
      if (phone !== undefined) {
        updates.push(`phone = $${paramCount++}`);
        values.push(phone);
      }
      if (address !== undefined) {
        updates.push(`address = $${paramCount++}`);
        values.push(address);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(userId);
      const query = `UPDATE businesses SET ${updates.join(', ')} 
                     WHERE user_id = $${paramCount++} 
                     RETURNING *`;

      const result = await pool.query(query, values);

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update business settings error:', error);
      res.status(500).json({ error: 'Failed to update business settings' });
    }
  }
);

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      'SELECT id, email, full_name, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put(
  '/profile',
  [
    body('fullName').optional().trim().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user.userId;
      const { fullName } = req.body;

      if (!fullName) {
        return res.status(400).json({ error: 'Full name is required' });
      }

      const result = await pool.query(
        'UPDATE users SET full_name = $1 WHERE id = $2 RETURNING id, email, full_name, created_at',
        [fullName, userId]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

// Change password
router.put(
  '/password',
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user.userId;
      const { currentPassword, newPassword } = req.body;

      // Get current password hash
      const userResult = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(
        currentPassword,
        userResult.rows[0].password_hash
      );

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
        newPasswordHash,
        userId,
      ]);

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
);

export default router;

