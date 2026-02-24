import api from '../api/api';

// ============================
// Follow-ups Adapter
// ============================

export async function getFollowUps({ status, leadId, skip = 0, limit = 100 } = {}) {
    const params = { skip, limit };
    if (status) params.status = status;
    if (leadId) params.lead_id = leadId;
    const res = await api.get('/api/follow-ups/', { params });
    return res.data;
}

export async function getTodaysFollowUps() {
    const res = await api.get('/api/follow-ups/today');
    return res.data;
}

export async function getOverdueFollowUps() {
    const res = await api.get('/api/follow-ups/overdue');
    return res.data;
}

export async function getFollowUp(id) {
    const res = await api.get(`/api/follow-ups/${id}`);
    return res.data;
}

export async function createFollowUp(followUpData) {
    const res = await api.post('/api/follow-ups/', followUpData);
    return res.data;
}

export async function updateFollowUp(id, followUpData) {
    const res = await api.put(`/api/follow-ups/${id}`, followUpData);
    return res.data;
}

export async function completeFollowUp(id, outcome) {
    const res = await api.post(`/api/follow-ups/${id}/complete`, { outcome });
    return res.data;
}

export async function rescheduleFollowUp(id, { newDate, newTime, reason }) {
    const res = await api.post(`/api/follow-ups/${id}/reschedule`, {
        new_date: newDate,
        new_time: newTime || null,
        reason: reason || null,
    });
    return res.data;
}

export async function deleteFollowUp(id) {
    const res = await api.delete(`/api/follow-ups/${id}`);
    return res.data;
}
