import api from '../api/api';

// ============================
// Reports Adapter
// ============================

export async function getReportsData({ period = 'month' } = {}) {
    // Aggregate data from leads and tasks for reporting
    const [leadsRes, tasksRes] = await Promise.all([
        api.get('/api/leads/', { params: { limit: 500 } }),
        api.get('/api/tasks/', { params: { limit: 500 } }),
    ]);
    return {
        leads: leadsRes.data,
        tasks: tasksRes.data,
    };
}

export async function getLeadsByStatus() {
    const res = await api.get('/api/leads/', { params: { limit: 500 } });
    const items = res.data.items || [];
    const statusCounts = {};
    items.forEach((lead) => {
        const s = lead.status || 'unknown';
        statusCounts[s] = (statusCounts[s] || 0) + 1;
    });
    return statusCounts;
}

export async function getConversionMetrics() {
    const res = await api.get('/api/leads/dashboard');
    return res.data.metrics;
}
