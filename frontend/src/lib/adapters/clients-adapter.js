import api from '../api/api';

// ============================
// Clients Adapter
// ============================

export async function getClients({ search, skip = 0, limit = 100 } = {}) {
    const params = { skip, limit };
    if (search) params.search = search;
    const res = await api.get('/api/clients/', { params });
    return res.data;
}

export async function getClient(id) {
    const res = await api.get(`/api/clients/${id}`);
    return res.data;
}

export async function createClient(clientData) {
    const res = await api.post('/api/clients/', clientData);
    return res.data;
}

export async function updateClient(id, clientData) {
    const res = await api.put(`/api/clients/${id}`, clientData);
    return res.data;
}

export async function deleteClient(id) {
    const res = await api.delete(`/api/clients/${id}`);
    return res.data;
}

export async function getClientInvoices(clientId) {
    const res = await api.get(`/api/clients/${clientId}/invoices`);
    return res.data;
}
