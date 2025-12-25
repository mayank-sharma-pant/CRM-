import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';

const router = express.Router();

// Register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('fullName').trim().notEmpty(),
    body('businessName').trim().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, fullName, businessName, phone, address } = req.body;

      // Check if user exists
      const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (userCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user and business in transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Insert user
        const userResult = await client.query(
          'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name',
          [email, passwordHash, fullName]
        );
        const userId = userResult.rows[0].id;

        // Insert business
        await client.query(
          'INSERT INTO businesses (user_id, name, phone, address) VALUES ($1, $2, $3, $4)',
          [userId, businessName, phone || null, address || null]
        );

        await client.query('COMMIT');

        // Generate JWT
        const token = jwt.sign(
          { userId, email },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        res.status(201).json({
          message: 'User registered successfully',
          token,
          user: {
            id: userId,
            email: userResult.rows[0].email,
            fullName: userResult.rows[0].full_name,
          },
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user
      const userResult = await pool.query(
        'SELECT id, email, password_hash, full_name FROM users WHERE email = $1',
        [email]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const user = userResult.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userResult = await pool.query(
      'SELECT id, email, full_name, created_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const businessResult = await pool.query(
      'SELECT id, name, phone, address FROM businesses WHERE user_id = $1',
      [decoded.userId]
    );

    res.json({
      user: userResult.rows[0],
      business: businessResult.rows[0] || null,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;

