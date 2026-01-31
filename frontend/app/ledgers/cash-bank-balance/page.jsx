'use client';

import { useState, useEffect } from 'react';
import LedgerPage from '@/components/ledgers/LedgerPage';

const MOCK_DATA = [
    { id: 1, date: '2024-01-24', cash_opening: 5000, cash_in: 0, cash_out: 120, cash_closing: 4880, bank_opening: 150000, bank_in: 5400, bank_out: 0, bank_closing: 155400, remarks: '' },
    { id: 2, date: '2024-01-25', cash_opening: 4880, cash_in: 2000, cash_out: 450, cash_closing: 6430, bank_opening: 155400, bank_in: 125000, bank_out: 25000, bank_closing: 255400, remarks: 'Weekly Summary' },
];

export default function CashBankBalancePage() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    const columns = [
        { key: 'date', label: 'Date', width: '110px', type: 'date' },

        // Cash Section
        { key: 'cash_opening', label: 'Cash Open', width: '110px', type: 'number', className: 'text-slate-500' },
        { key: 'cash_in', label: 'Cash In', width: '100px', type: 'number', className: 'text-green-600' },
        { key: 'cash_out', label: 'Cash Out', width: '100px', type: 'number', className: 'text-red-500' },
        { key: 'cash_closing', label: 'Cash Close', width: '110px', type: 'number', readOnly: true, className: 'font-bold bg-slate-50 dark:bg-slate-800' },

        // Bank Section
        { key: 'bank_opening', label: 'Bank Open', width: '110px', type: 'number', className: 'text-slate-500 border-l border-slate-200 dark:border-slate-700 pl-4' },
        { key: 'bank_in', label: 'Bank In', width: '100px', type: 'number', className: 'text-green-600' },
        { key: 'bank_out', label: 'Bank Out', width: '100px', type: 'number', className: 'text-red-500' },
        { key: 'bank_closing', label: 'Bank Close', width: '110px', type: 'number', readOnly: true, className: 'font-bold bg-slate-50 dark:bg-slate-800' },

        { key: 'remarks', label: 'Remarks', width: '200px' },
    ];

    useEffect(() => {
        setTimeout(() => { setData(MOCK_DATA); setLoading(false); }, 300);
    }, []);

    const handleAddRow = () => {
        // Logic to fetch previous closing balance would happen here or backend
        const newRow = {
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            cash_opening: 0, cash_in: 0, cash_out: 0, cash_closing: 0,
            bank_opening: 0, bank_in: 0, bank_out: 0, bank_closing: 0,
            remarks: ''
        };
        setData([newRow, ...data]);
    };

    const handleSaveRow = (u) => setData(p => p.map(r => r.id === u.id ? u : r));
    // Delete usually disabled for balance sheets, but kept for consistency
    const handleDeleteRow = (r) => confirm('Delete?') && setData(p => p.filter(x => x.id !== r.id));

    return (
        <LedgerPage
            title="Cash & Bank Balance"
            subtitle="Daily register of liquid assets and bank movements"
            columns={columns}
            data={data}
            loading={loading}
            permissions={{ can_view: true, can_edit: true }}
            onAddRow={handleAddRow}
            onSaveRow={handleSaveRow}
            onDeleteRow={handleDeleteRow}
        />
    );
}
