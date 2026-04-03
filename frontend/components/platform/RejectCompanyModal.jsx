'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Optional reason; Cancel calls onClose without onConfirm.
 * Confirm calls onConfirm(reason) where reason is string or null if empty.
 */
export default function RejectCompanyModal({ open, title, onClose, onConfirm }) {
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (open) setReason('');
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600"
                    aria-label="Close"
                >
                    <X size={20} />
                </button>
                <h2 className="text-lg font-bold text-slate-900 pr-8 mb-2">{title || 'Reject company'}</h2>
                <p className="text-sm text-slate-600 mb-4">Reason is optional and stored in the audit log.</p>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason (optional)"
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
                <div className="flex justify-end gap-2 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => onConfirm(reason.trim() || null)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                    >
                        Reject
                    </button>
                </div>
            </div>
        </div>
    );
}
