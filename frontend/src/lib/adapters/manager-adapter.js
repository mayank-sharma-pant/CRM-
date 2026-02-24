import api from '../api/api';

// ============================
// Manager Adapter
// ============================

// --- Dashboard ---
export async function getManagerDashboard() {
    const res = await api.get('/api/manager/dashboard');
    return res.data;
}

// --- Team Monitoring ---
export async function getTeamMonitoring() {
    const res = await api.get('/api/manager/monitoring');
    return res.data;
}

export async function getTeamMemberDetail(userId) {
    const res = await api.get(`/api/manager/monitoring/${userId}`);
    return res.data;
}

// --- Team Leads ---
export async function getTeamLeads({ status, memberId, skip = 0, limit = 100 } = {}) {
    const params = { skip, limit };
    if (status) params.status = status;
    if (memberId) params.member_id = memberId;
    const res = await api.get('/api/manager/leads', { params });
    return res.data;
}

export async function reassignLead(leadId, newAssigneeId) {
    const res = await api.post(`/api/manager/leads/${leadId}/reassign`, null, {
        params: { new_assignee_id: newAssigneeId },
    });
    return res.data;
}

// --- Team Tasks ---
export async function getTeamTasks({ status, memberId, skip = 0, limit = 100 } = {}) {
    const params = { skip, limit };
    if (status) params.status = status;
    if (memberId) params.member_id = memberId;
    const res = await api.get('/api/manager/tasks', { params });
    return res.data;
}

export async function createTeamTask({ title, assigneeId, dueDate, priority = 'medium' }) {
    const res = await api.post('/api/manager/tasks', null, {
        params: { title, assignee_id: assigneeId, due_date: dueDate, priority },
    });
    return res.data;
}

// --- Performance Reports ---
export async function getTeamPerformance({ period = 'month' } = {}) {
    const res = await api.get('/api/manager/performance', { params: { period } });
    return res.data;
}

// --- Invoices ---
export async function getTeamInvoices({ status, skip = 0, limit = 100 } = {}) {
    const params = { skip, limit };
    if (status) params.status = status;
    const res = await api.get('/api/manager/invoices', { params });
    return res.data;
}

export async function approveInvoice(invoiceId) {
    const res = await api.post(`/api/manager/invoices/${invoiceId}/approve`);
    return res.data;
}
