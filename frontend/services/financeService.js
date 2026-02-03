import api from './api';

export const financeService = {
    // Get list of authorized ledgers for navigation
    getAuthorizedLedgers: async () => {
        try {
            const response = await api.get('/ledgers/');
            return response.data;
        } catch (error) {
            console.warn("Failed to fetch authorized ledgers - silencing overlay", error);
            return [];
        }
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
