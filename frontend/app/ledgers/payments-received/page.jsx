'use client';

import { useState, useEffect } from 'react';
import LedgerPage from '@/components/ledgers/LedgerPage';

const MOCK_DATA = [
    { id: 1, date: '2024-01-24', party_name: 'Client A Enterprises', mode: 'NEFT', reference: 'N8839221', amount: 125000, invoice_no: 'INV-2024-001', remarks: 'Full Settlement' },
    { id: 2, date: '2024-01-24', party_name: 'Retail Partner B', mode: 'UPI', reference: 'UPI/334211', amount: 5400, invoice_no: 'INV-2024-003', remarks: 'Advance' },
];

export default function PaymentsReceivedPage() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    const columns = [
        { key: 'date', label: 'Date', width: '120px', type: 'date' },
        { key: 'party_name', label: 'Received From', width: '250px', autoFocus: true, className: 'font-medium' },
        { key: 'mode', label: 'Mode', width: '120px' },
        { key: 'reference', label: 'Ref / Trans ID', width: '180px', className: 'font-mono text-xs' },
        { key: 'amount', label: 'Amount Received', width: '140px', type: 'number', className: 'font-bold text-green-600', format: (v) => `₹${v?.toLocaleString()}` },
        { key: 'invoice_no', label: 'Against Invoice', width: '150px', className: 'text-blue-600 hover:underline cursor-pointer' },
        { key: 'remarks', label: 'Remarks', width: '200px' },
    ];

    useEffect(() => {
        setTimeout(() => { setData(MOCK_DATA); setLoading(false); }, 400);
    }, []);

    const handleAddRow = () => {
        const newRow = { id: Date.now(), date: new Date().toISOString().split('T')[0], party_name: '', mode: 'Bank Transfer', reference: '', amount: 0, invoice_no: '', remarks: '' };
        setData([newRow, ...data]);
    };

    const handleSaveRow = (updatedRow) => setData(prev => prev.map(r => r.id === updatedRow.id ? updatedRow : r));
    const handleDeleteRow = (row) => confirm('Delete row?') && setData(prev => prev.filter(r => r.id !== row.id));

    return (
        <LedgerPage
            title="Payments Received"
            subtitle="Track incoming payments from clients and sales"
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
