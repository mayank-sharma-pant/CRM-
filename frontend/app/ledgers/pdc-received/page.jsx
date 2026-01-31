'use client';

import { useState, useEffect } from 'react';
import LedgerPage from '@/components/ledgers/LedgerPage';

const MOCK_DATA = [
    { id: 1, date: '2024-02-10', cheque_no: '992811', bank: 'SBI', party: 'Client A Enterprises', amount: 35000, status: 'In Hand', clearing_date: '2024-02-10', remarks: 'Advance Payment' },
];

export default function PDCReceivedPage() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    const columns = [
        { key: 'date', label: 'Cheque Date', width: '120px', type: 'date' },
        { key: 'cheque_no', label: 'Cheque Number', width: '150px', className: 'font-mono' },
        { key: 'bank', label: 'Drawn On (Bank)', width: '150px' },
        { key: 'party', label: 'Received From', width: '200px', autoFocus: true, className: 'font-medium' },
        { key: 'amount', label: 'Amount', width: '120px', type: 'number', className: 'font-bold text-green-600', format: (v) => `₹${v?.toLocaleString()}` },
        { key: 'status', label: 'Status', width: '120px' },
        { key: 'clearing_date', label: 'Deposit Date', width: '120px', type: 'date' },
        { key: 'remarks', label: 'Remarks', width: '200px' },
    ];

    useEffect(() => {
        setTimeout(() => { setData(MOCK_DATA); setLoading(false); }, 300);
    }, []);

    const handleAddRow = () => setData([{ id: Date.now(), date: '', cheque_no: '', bank: '', party: '', amount: 0, status: 'Received', clearing_date: '', remarks: '' }, ...data]);
    const handleSaveRow = (u) => setData(p => p.map(r => r.id === u.id ? u : r));
    const handleDeleteRow = (r) => confirm('Delete?') && setData(p => p.filter(x => x.id !== r.id));

    return (
        <LedgerPage
            title="PDC Cheque Received"
            subtitle="Track post-dated cheques received from clients"
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
