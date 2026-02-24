import api from '../api/api';

// ============================
// Performance Adapter
// ============================

export async function getPerformanceData() {
    // Fetch dashboard data which contains performance metrics
    const res = await api.get('/api/leads/dashboard');
    return res.data;
}

export async function getPerformanceMetrics() {
    const res = await api.get('/api/leads/dashboard');
    return res.data.metrics;
}
