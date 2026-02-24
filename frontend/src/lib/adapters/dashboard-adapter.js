import api from '../api/api';

// ============================
// Dashboard Adapter
// ============================

export async function getDashboardData() {
    const res = await api.get('/api/leads/dashboard');
    return res.data;
}

export async function getDashboardMetrics() {
    const res = await api.get('/api/leads/dashboard');
    return res.data.metrics;
}

export async function getPriorityTasks() {
    const res = await api.get('/api/tasks/priority');
    return res.data;
}
