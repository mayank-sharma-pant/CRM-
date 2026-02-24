import api from '../lib/api/api';

export const financeService = {
    // Get list of authorized ledgers for navigation (sidebar). Throws on error so UI can show error + retry.
    getAuthorizedLedgers: async () => {
        const response = await api.get('/ledgers/');
        return response.data;
    },

    // Get specific ledger data with permissions
    getLedgerData: async (slug) => {
        const response = await api.get(`/ledgers/${slug}`);
        return response.data;
    },

    // Add new entry
    addEntry: async (slug, data) => {
        const response = await api.post(`/ledgers/${slug}`, { data });
        return response.data;
    },

    // Update entry
    updateEntry: async (slug, id, data) => {
        const response = await api.put(`/ledgers/${slug}/${id}`, { data });
        return response.data;
    },

    // Delete entry
    deleteEntry: async (slug, id) => {
        await api.delete(`/ledgers/${slug}/${id}`);
    }
};
