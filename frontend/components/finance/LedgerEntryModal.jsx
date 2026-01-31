'use client';

import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LedgerEntryModal({
    isOpen,
    onClose,
    columns,
    initialData,
    onSave,
    isSaving
}) {
    const [formData, setFormData] = useState({});

    // Initialize form data when modal opens or initialData changes
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // Edit mode
                setFormData({ ...initialData });
            } else {
                // Add mode - Initialize empty fields
                const emptyData = {};
                columns.forEach(col => {
                    emptyData[col.key] = '';
                });
                // Default date to today if present
                if (columns.find(c => c.key === 'date')) {
                    emptyData['date'] = new Date().toISOString().split('T')[0];
                }
                setFormData(emptyData);
            }
        }
    }, [isOpen, initialData, columns]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const handleChange = (key, value) => {
        setFormData(prev => ({
            ...prev,
            [key]: value
        }));
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden"
                >
                    <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
                        <h2 className="text-lg font-bold text-stone-800">
                            {initialData ? 'Edit Entry' : 'Add New Entry'}
                        </h2>
                        <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div className="grid grid-cols-1 gap-4 max-h-[60vh] overflow-y-auto px-1">
                            {columns.map((col) => {
                                // Skip read-only/computed columns if needed (not implementing strictly here yet)
                                if (col.key === 'id') return null;

                                return (
                                    <div key={col.key} className="space-y-1">
                                        <label className="text-sm font-medium text-stone-700">
                                            {col.label}
                                        </label>
                                        <input
                                            type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                                            className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent text-sm"
                                            value={formData[col.key] || ''}
                                            onChange={(e) => handleChange(col.key, e.target.value)}
                                            step={col.type === 'number' ? "0.01" : undefined}
                                            required={col.required !== false} // Default to required unless specified
                                            autoFocus={col.autoFocus}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-stone-600 bg-stone-100 rounded-md hover:bg-stone-200"
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-stone-900 rounded-md hover:bg-stone-800 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {initialData ? 'Update Entry' : 'Save Entry'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
