'use client';

import { useState } from 'react';
import api from '../../services/api';

export default function ClientGstinField({ clientId, gstin, canEdit, onSaved }) {
    const [value, setValue] = useState(gstin || '');
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            await api.put(`/clients/${clientId}`, { gstin: value.trim() || null });
            onSaved?.(value.trim().toUpperCase() || '');
        } catch (err) {
            const detail = err.response?.data?.detail;
            alert(typeof detail === 'object' ? JSON.stringify(detail) : detail || 'Could not save GSTIN');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">GSTIN</span>
            {canEdit ? (
                <div className="flex gap-2">
                    <input
                        value={value}
                        onChange={(e) => setValue(e.target.value.toUpperCase())}
                        maxLength={15}
                        placeholder="22AAAAA0000A1Z5"
                        aria-label="Buyer GSTIN"
                        className="flex-1 px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono"
                    />
                    <button
                        type="button"
                        onClick={save}
                        disabled={saving}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-md bg-slate-900 text-white disabled:opacity-50"
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            ) : (
                <p className="text-sm text-slate-700 dark:text-slate-300 font-mono">{gstin || '—'}</p>
            )}
        </div>
    );
}
