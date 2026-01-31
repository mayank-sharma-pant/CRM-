'use client';

import { useState, useEffect } from 'react';
import LedgerPage from '@/components/ledgers/LedgerPage';

// Mock Data for Stock Register
const MOCK_DATA = [
    { id: 1, date: '2024-01-20', product: 'Laptop Stand Pro', category: 'Accessories', brand: 'ErgoTech', qty_in: 50, qty_out: 0, stock: 150, purchase_rate: 1200, sale_rate: 2500, remarks: 'New Batch' },
    { id: 2, date: '2024-01-21', product: 'Wireless Mouse', category: 'Peripherals', brand: 'LogiMega', qty_in: 0, qty_out: 12, stock: 88, purchase_rate: 450, sale_rate: 999, remarks: 'Sales' },
    { id: 3, date: '2024-01-22', product: 'HD Monitor 24"', category: 'Displays', brand: 'ViewSharp', qty_in: 0, qty_out: 5, stock: 45, purchase_rate: 8000, sale_rate: 12500, remarks: 'Corporate Order' },
];

export default function StockRegisterPage() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Column Definition
    const columns = [
        { key: 'date', label: 'Date', width: '120px', type: 'date' },
        { key: 'product', label: 'Product Name', width: '250px', autoFocus: true, className: 'font-medium text-slate-900 dark:text-white' },
        { key: 'category', label: 'Category', width: '150px' },
        { key: 'brand', label: 'Brand', width: '150px' },
        { key: 'qty_in', label: 'Qty In', width: '100px', type: 'number', className: 'text-green-600 font-medium' },
        { key: 'qty_out', label: 'Qty Out', width: '100px', type: 'number', className: 'text-red-500 font-medium' },
        { key: 'stock', label: 'Cur. Stock', width: '100px', readOnly: true, className: 'bg-slate-50 dark:bg-slate-800/50 font-bold' },
        { key: 'purchase_rate', label: 'Pur. Rate', width: '120px', type: 'number', format: (v) => `₹${v?.toLocaleString()}` },
        { key: 'sale_rate', label: 'Sale Rate', width: '120px', type: 'number', format: (v) => `₹${v?.toLocaleString()}` },
        { key: 'remarks', label: 'Remarks', width: '200px' },
    ];

    useEffect(() => {
        // Simulate API fetch
        setTimeout(() => {
            setData(MOCK_DATA);
            setLoading(false);
        }, 500);
    }, []);

    const handleAddRow = () => {
        const newRow = {
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            product: '',
            category: '',
            brand: '',
            qty_in: 0,
            qty_out: 0,
            stock: 0,
            purchase_rate: 0,
            sale_rate: 0,
            remarks: ''
        };
        setData([newRow, ...data]);
    };

    const handleSaveRow = (updatedRow) => {
        setData(prev => prev.map(row => row.id === updatedRow.id ? updatedRow : row));
    };

    const handleDeleteRow = (row) => {
        if (confirm('Are you sure you want to delete this entry?')) {
            setData(prev => prev.filter(r => r.id !== row.id));
        }
    };

    return (
        <LedgerPage
            title="Stock Register"
            subtitle="Track inventory movement and current stock levels"
            columns={columns}
            data={data}
            loading={loading}
            permissions={{ can_view: true, can_edit: true }} // Mock permissions
            onAddRow={handleAddRow}
            onSaveRow={handleSaveRow}
            onDeleteRow={handleDeleteRow}
        />
    );
}
