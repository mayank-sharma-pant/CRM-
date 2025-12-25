import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import leadsRoutes from './routes/leads.js';
import followUpsRoutes from './routes/followUps.js';
import notesRoutes from './routes/notes.js';
import reportsRoutes from './routes/reports.js';
import settingsRoutes from './routes/settings.js';
import { authenticateToken } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CRM API is running' });
});

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/leads', authenticateToken, leadsRoutes);
app.use('/api/follow-ups', authenticateToken, followUpsRoutes);
app.use('/api/notes', authenticateToken, notesRoutes);
app.use('/api/reports', authenticateToken, reportsRoutes);
app.use('/api/settings', authenticateToken, settingsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

