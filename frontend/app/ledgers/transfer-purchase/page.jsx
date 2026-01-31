'use client';

import { useState, useEffect } from 'react';
import LedgerPage from '@/components/ledgers/LedgerPage';

const MOCK_DATA = [
    { id: 1, date: '2024-01-26', party: 'TechDistro Inc', product: 'Laptops Batch A', invoice: 'INV-992', amount: 450000, bank: 'HDFC Bank', utr: 'HD882910029', remarks: 'Full Payment' },
];

export default function TransferPurchasePage() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    const columns = [
        { key: 'date', label: 'Date', width: '120px', type: 'date' },
        { key: 'party', label: 'Vendor Name', width: '200px', autoFocus: true, className: 'font-medium' },
        { key: 'product', label: 'Product/Service', width: '200px' },
        { key: 'invoice', label: 'Bill No.', width: '150px' },
        { key: 'amount', label: 'Amount', width: '140px', type: 'number', className: 'font-bold', format: (v) => `₹${v?.toLocaleString()}` },
        { key: 'bank', label: 'Paid From', width: '150px' },
        { key: 'utr', label: 'UTR / Ref Algo', width: '180px', className: 'font-mono text-xs' },
        { key: 'remarks', label: 'Remarks', width: '200px' },
    ];

    useEffect(() => {
        setTimeout(() => { setData(MOCK_DATA); setLoading(false); }, 300);
    }, []);

    const handleAddRow = () => setData([{ id: Date.now(), date: '', party: '', product: '', invoice: '', amount: 0, bank: '', utr: '', remarks: '' }, ...data]);
    const handleSaveRow = (u) => setData(p => p.map(r => r.id === u.id ? u : r));
    const handleDeleteRow = (r) => confirm('Delete?') && setData(p => p.filter(x => x.id !== r.id));

    return (
        <LedgerPage
            title="Account Transfer (Purchase)"
            subtitle="Direct bank transfers for purchases"
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
