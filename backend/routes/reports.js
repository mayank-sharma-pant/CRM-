import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Get dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
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

    // Total leads
    const totalLeadsResult = await pool.query(
      'SELECT COUNT(*) as count FROM leads WHERE business_id = $1',
      [businessId]
    );
    const totalLeads = parseInt(totalLeadsResult.rows[0].count);

    // Converted leads
    const convertedLeadsResult = await pool.query(
      'SELECT COUNT(*) as count FROM leads WHERE business_id = $1 AND status = $2',
      [businessId, 'Converted']
    );
    const convertedLeads = parseInt(convertedLeadsResult.rows[0].count);

    // Lost leads
    const lostLeadsResult = await pool.query(
      'SELECT COUNT(*) as count FROM leads WHERE business_id = $1 AND status = $2',
      [businessId, 'Lost']
    );
    const lostLeads = parseInt(lostLeadsResult.rows[0].count);

    // Conversion rate
    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(2) : 0;

    // Leads by status
    const leadsByStatusResult = await pool.query(
      `SELECT status, COUNT(*) as count 
       FROM leads 
       WHERE business_id = $1 
       GROUP BY status`,
      [businessId]
    );

    // Leads by source
    const leadsBySourceResult = await pool.query(
      `SELECT source, COUNT(*) as count 
       FROM leads 
       WHERE business_id = $1 AND source IS NOT NULL
       GROUP BY source 
       ORDER BY count DESC`,
      [businessId]
    );

    // Recent leads (last 7 days)
    const recentLeadsResult = await pool.query(
      `SELECT COUNT(*) as count 
       FROM leads 
       WHERE business_id = $1 
       AND created_at >= CURRENT_DATE - INTERVAL '7 days'`,
      [businessId]
    );
    const recentLeads = parseInt(recentLeadsResult.rows[0].count);

    res.json({
      totalLeads,
      convertedLeads,
      lostLeads,
      conversionRate: parseFloat(conversionRate),
      recentLeads,
      leadsByStatus: leadsByStatusResult.rows,
      leadsBySource: leadsBySourceResult.rows,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Get weekly/monthly overview
router.get('/overview', async (req, res) => {
  try {
    const { period = 'month' } = req.query; // 'week' or 'month'
    const userId = req.user.userId;

    const businessResult = await pool.query(
      'SELECT id FROM businesses WHERE user_id = $1',
      [userId]
    );

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessId = businessResult.rows[0].id;

    const interval = period === 'week' ? '7 days' : '30 days';

    // Leads created in period
    const leadsCreatedResult = await pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM leads
       WHERE business_id = $1 
       AND created_at >= CURRENT_DATE - INTERVAL '${interval}'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [businessId]
    );

    // Conversions in period
    const conversionsResult = await pool.query(
      `SELECT DATE(updated_at) as date, COUNT(*) as count
       FROM leads
       WHERE business_id = $1 
       AND status = 'Converted'
       AND updated_at >= CURRENT_DATE - INTERVAL '${interval}'
       GROUP BY DATE(updated_at)
       ORDER BY date ASC`,
      [businessId]
    );

    res.json({
      period,
      leadsCreated: leadsCreatedResult.rows,
      conversions: conversionsResult.rows,
    });
  } catch (error) {
    console.error('Get overview error:', error);
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
});

export default router;

