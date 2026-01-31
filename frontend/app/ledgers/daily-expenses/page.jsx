'use client';

import { useState, useEffect } from 'react';
import LedgerPage from '@/components/ledgers/LedgerPage';

const MOCK_DATA = [
    { id: 1, date: '2024-01-25', expense_type: 'Travel', paid_to: 'Uber', mode: 'Credit Card', amount: 450, remarks: 'Client Visit - Sector 62' },
    { id: 2, date: '2024-01-25', expense_type: 'Pantry', paid_to: 'Local Mart', mode: 'Cash', amount: 120, remarks: 'Tea/Coffee Supplies' },
];

export default function DailyExpensesPage() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    const columns = [
        { key: 'date', label: 'Date', width: '120px', type: 'date' },
        { key: 'expense_type', label: 'Expense Type', width: '180px', autoFocus: true, className: 'font-medium' },
        { key: 'paid_to', label: 'Paid To', width: '200px' },
        { key: 'mode', label: 'Payment Mode', width: '150px' },
        { key: 'amount', label: 'Amount', width: '120px', type: 'number', className: 'font-bold', format: (v) => `₹${v?.toLocaleString()}` },
        { key: 'remarks', label: 'Description', width: '300px' },
    ];

    useEffect(() => {
        setTimeout(() => { setData(MOCK_DATA); setLoading(false); }, 300);
    }, []);

    const handleAddRow = () => {
        setData([{ id: Date.now(), date: new Date().toISOString().split('T')[0], expense_type: '', paid_to: '', mode: 'Cash', amount: 0, remarks: '' }, ...data]);
    };

    const handleSaveRow = (u) => setData(p => p.map(r => r.id === u.id ? u : r));
    const handleDeleteRow = (r) => confirm('Delete?') && setData(p => p.filter(x => x.id !== r.id));

    return (
        <LedgerPage
            title="Daily Expenses"
            subtitle="Log petty cash and operational expenses"
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
