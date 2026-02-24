'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { financeService } from '../../services/financeService';
import LedgerView from './LedgerView';
import { AlertTriangle } from 'lucide-react';

export default function SharedLedgerPage({ params }) {
    const { ledger } = use(params);
    const router = useRouter();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        if (!ledger) return;
        setLoading(true);
        setError(null);
        try {
            const ledgerData = await financeService.getLedgerData(ledger);
            setData(ledgerData);
        } catch (err) {
            setData(null);
            setError(err?.response?.data?.detail || err?.message || 'Failed to load ledger');
        } finally {
            setLoading(false);
        }
    }, [ledger]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center p-12">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-sm text-slate-500 font-medium">Loading ledger data...</p>
                </div>
            </div>
        );
    }

    if (data && data.can_view === false) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <div className="text-center max-w-md p-8 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8">You do not have permission to view this ledger.</p>
                    <button
                        onClick={() => router.back()}
                        className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-lg"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <div className="text-center max-w-md p-8 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        {error.includes("permission") || error.includes("authorized") ? "Access Denied" : "Error"}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8">{error}</p>
                    <div className="flex gap-2 justify-center">
                        <button
                            onClick={() => fetchData()}
                            className="py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
                        >
                            Retry
                        </button>
                        <button
                            onClick={() => router.back()}
                            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-lg transition-colors"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <LedgerView data={data} />
    );
}
