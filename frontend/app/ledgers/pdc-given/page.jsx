'use client';

import { useState, useEffect } from 'react';
import LedgerPage from '@/components/ledgers/LedgerPage';

const MOCK_DATA = [
    { id: 1, date: '2024-02-15', cheque_no: '005421', bank: 'HDFC Bank', party: 'Landlord - Office Rent', amount: 50000, status: 'Uncleared', clearing_date: '2024-02-15', remarks: 'Post dated for Feb' },
    { id: 2, date: '2024-03-01', cheque_no: '005422', bank: 'HDFC Bank', party: 'TechDistro Inc', amount: 120000, status: 'Issued', clearing_date: '2024-03-01', remarks: 'Q1 Settlement' },
];

export default function PDCGivenPage() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    const columns = [
        { key: 'date', label: 'Cheque Date', width: '120px', type: 'date' },
        { key: 'cheque_no', label: 'Cheque Number', width: '150px', className: 'font-mono' },
        { key: 'bank', label: 'Bank Name', width: '150px' },
        { key: 'party', label: 'Issued To', width: '200px', autoFocus: true, className: 'font-medium' },
        { key: 'amount', label: 'Amount', width: '120px', type: 'number', className: 'font-bold', format: (v) => `₹${v?.toLocaleString()}` },
        { key: 'status', label: 'Status', width: '120px', className: (val) => val === 'Cleared' ? 'text-green-600' : 'text-amber-600' },
        { key: 'clearing_date', label: 'Clearing Date', width: '120px', type: 'date' },
        { key: 'remarks', label: 'Remarks', width: '200px' },
    ];

    useEffect(() => {
        setTimeout(() => { setData(MOCK_DATA); setLoading(false); }, 300);
    }, []);

    const handleAddRow = () => setData([{ id: Date.now(), date: '', cheque_no: '', bank: '', party: '', amount: 0, status: 'Issued', clearing_date: '', remarks: '' }, ...data]);
    const handleSaveRow = (u) => setData(p => p.map(r => r.id === u.id ? u : r));
    const handleDeleteRow = (r) => confirm('Delete?') && setData(p => p.filter(x => x.id !== r.id));

    return (
        <LedgerPage
            title="PDC Cheque Given"
            subtitle="Track post-dated cheques issued to vendors"
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
