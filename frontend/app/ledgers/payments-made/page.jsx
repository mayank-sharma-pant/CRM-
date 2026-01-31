'use client';

import { useState, useEffect } from 'react';
import LedgerPage from '@/components/ledgers/LedgerPage';

const MOCK_DATA = [
    { id: 1, date: '2024-01-22', party_name: 'TechDistro Inc', mode: 'Bank Transfer', reference: 'UTR8839202', amount: 45000, purpose: 'Inventory Purchase', remarks: 'Invoice #9921' },
    { id: 2, date: '2024-01-23', party_name: 'City Office Rentals', mode: 'Cheque', reference: 'CHQ-4451', amount: 25000, purpose: 'Office Rent', remarks: 'January 2024' },
];

export default function PaymentsMadePage() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    const columns = [
        { key: 'date', label: 'Date', width: '120px', type: 'date' },
        { key: 'party_name', label: 'Party Name', width: '250px', autoFocus: true, className: 'font-medium' },
        { key: 'mode', label: 'Mode', width: '150px' }, // Could be select dropdown in future
        { key: 'reference', label: 'Ref / Cheque #', width: '180px', className: 'font-mono text-xs' },
        { key: 'amount', label: 'Amount', width: '140px', type: 'number', className: 'font-bold text-slate-900 dark:text-white', format: (v) => `₹${v?.toLocaleString()}` },
        { key: 'purpose', label: 'Purpose', width: '200px' },
        { key: 'remarks', label: 'Remarks', width: '200px' },
    ];

    useEffect(() => {
        setTimeout(() => {
            setData(MOCK_DATA);
            setLoading(false);
        }, 400);
    }, []);

    const handleAddRow = () => {
        const newRow = {
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            party_name: '',
            mode: 'Bank Transfer',
            reference: '',
            amount: 0,
            purpose: '',
            remarks: ''
        };
        setData([newRow, ...data]);
    };

    const handleSaveRow = (updatedRow) => setData(prev => prev.map(r => r.id === updatedRow.id ? updatedRow : r));
    const handleDeleteRow = (row) => confirm('Delete row?') && setData(prev => prev.filter(r => r.id !== row.id));

    return (
        <LedgerPage
            title="Payments Made"
            subtitle="Record of all outgoing payments to vendors and expenses"
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
