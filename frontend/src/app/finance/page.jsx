'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { financeService } from '../../services/financeService';
import { FileText, ArrowRight, Lock } from 'lucide-react';

export default function FinanceDashboard() {
    const [ledgers, setLedgers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLedgers() {
            try {
                const data = await financeService.getAuthorizedLedgers();
                setLedgers(data || []);
            } catch (err) {
                console.error("Failed to fetch authorized ledgers", err);
                setLedgers([]);
            } finally {
                setLoading(false);
            }
        }
        fetchLedgers();
    }, []);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-3 border-stone-200 border-t-stone-800 rounded-full animate-spin"></div>
                    <p className="text-sm text-stone-500 font-medium">Loading...</p>
                </div>
            </div>
        );
    }

    if (ledgers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-6">
                    <Lock className="w-8 h-8 text-stone-400" />
                </div>
                <h2 className="text-xl font-bold text-stone-800 mb-2">No Access</h2>
                <p className="text-stone-500 max-w-sm">
                    You do not have access to any financial ledgers.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-6">
                <FileText className="w-8 h-8 text-stone-400" />
            </div>
            <h2 className="text-xl font-bold text-stone-800 mb-2">Financial Ledgers</h2>
            <p className="text-stone-500 max-w-sm mb-6">
                Select a ledger from the sidebar to view records.
            </p>

            {/* Quick Links */}
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {ledgers.slice(0, 4).map((ledger) => (
                    <Link
                        key={ledger.slug}
                        href={`/finance/${ledger.slug}`}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:border-stone-400 hover:bg-stone-50 transition-colors"
                    >
                        {ledger.name}
                        <ArrowRight size={14} />
                    </Link>
                ))}
            </div>
        </div>
    );
}
