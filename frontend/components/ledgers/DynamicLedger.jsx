'use client';

import { useState, useEffect } from 'react';
import api from '../../services/api';
import LedgerPage from './LedgerPage';

export default function DynamicLedger({
    endpoint,
    title,
    subtitle
}) {
    const [config, setConfig] = useState(null);
    const [data, setData] = useState([]);
    const [permissions, setPermissions] = useState({ can_view: false, can_edit: false });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLedgerData();
    }, [endpoint]);

    const fetchLedgerData = async () => {
        setLoading(true);
        try {
            const response = await api.get(endpoint);
            const { columns, rows, can_view, can_edit } = response.data || {};

            // If API returns a config object wrapper, use it. Otherwise adapt.
            // Based on Mock Data structure: { can_view, can_edit, columns, rows }

            setConfig({ columns: columns || [] });
            setData(rows || []);
            setPermissions({
                can_view: can_view ?? false,
                can_edit: can_edit ?? false
            });

        } catch (error) {
            console.error(`Failed to fetch ledger ${endpoint}`, error);
            // Default to denied access on error if not a 404 handled specifically
            setPermissions({ can_view: false, can_edit: false });
        } finally {
            setLoading(false);
        }
    };

    const handleAddRow = async () => {
        // Optimistic update or wait for API
        // For MVP, we'll create a blank row and let the user edit it, OR better:
        // The LedgerTable might handle "new row" UI, but here we just need to add a skeleton.
        // Actually, typically the user fills a form or a blank row. 
        // Let's simply add a local temporary row with ID 'new-...' and let generic edit handle it.
        const newRow = { id: `new-${Date.now()}` };
        // In a real app, we might POST immediately or wait for first save.
        // We'll add it to state so it appears in the grid for editing.
        setData([newRow, ...data]);
    };

    const handleSaveRow = async (row) => {
        // Distinguish Create vs Update
        const isNew = String(row.id).startsWith('new-');

        try {
            if (isNew) {
                // Remove temporary ID before sending if backend assigns ID
                const { id, ...payload } = row;
                const res = await api.post(endpoint, payload);
                // Update local state with real ID from backend
                const savedRow = res.data;
                setData(prev => prev.map(r => r.id === row.id ? savedRow : r));
            } else {
                await api.put(`${endpoint}/${row.id}`, row);
                setData(prev => prev.map(r => r.id === row.id ? row : r));
            }
        } catch (error) {
            console.error('Failed to save row', error);
            alert('Failed to save. Check console.');
        }
    };

    const handleDeleteRow = async (row) => {
        if (!confirm('Are you sure you want to delete this record?')) return;

        try {
            await api.delete(`${endpoint}/${row.id}`);
            setData(prev => prev.filter(r => r.id !== row.id));
        } catch (error) {
            console.error('Failed to delete row', error);
            alert('Failed to delete. Check console.');
        }
    };

    const handleSearch = (query) => {
        // Server side search preferred, but checking standard
        // If API supports ?q=...
        // For now, client side filtering or ignore
        console.log('Search:', query);
    };

    return (
        <LedgerPage
            title={title}
            subtitle={subtitle}
            columns={config?.columns || []}
            data={data}
            permissions={permissions}
            loading={loading}
            onAddRow={handleAddRow}
            onSaveRow={handleSaveRow}
            onDeleteRow={handleDeleteRow}
            onSearch={handleSearch}
        />
    );
}
