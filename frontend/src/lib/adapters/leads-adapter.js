import api from '../api/api';

// ============================
// Leads Adapter
// ============================

export async function getLeads({ status, search, skip = 0, limit = 100 } = {}) {
    const params = { skip, limit };
    if (status) params.status = status;
    if (search) params.search = search;
    const res = await api.get('/api/leads/', { params });
    return res.data;
}

export async function getLead(id) {
    const res = await api.get(`/api/leads/${id}`);
    return res.data;
}

export async function createLead(leadData) {
    const res = await api.post('/api/leads/', leadData);
    return res.data;
}

export async function updateLead(id, leadData) {
    const res = await api.put(`/api/leads/${id}`, leadData);
    return res.data;
}

export async function deleteLead(id) {
    const res = await api.delete(`/api/leads/${id}`);
    return res.data;
}

export async function getLeadNotes(leadId) {
    const res = await api.get(`/api/leads/${leadId}/notes`);
    return res.data;
}

export async function addLeadNote(leadId, content) {
    const res = await api.post(`/api/leads/${leadId}/notes`, null, {
        params: { content },
    });
    return res.data;
}

export async function convertLead(leadId) {
    const res = await api.post(`/api/leads/${leadId}/convert`);
    return res.data;
}
