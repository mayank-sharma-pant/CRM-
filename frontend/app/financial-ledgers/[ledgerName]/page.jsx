'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { financeService } from '../../../services/financeService';
import FinancialLedgerGrid from '../../../components/finance/FinancialLedgerGrid';

function slugFromParam(ledgerName) {
    if (!ledgerName || typeof ledgerName !== 'string') return '';
    return ledgerName.replace(/-/g, '_');
}

export default function FinancialLedgerPage() {
    const params = useParams();
    const router = useRouter();
    const ledgerNameParam = params?.ledgerName;
    const slug = slugFromParam(ledgerNameParam);

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        if (!slug) return;
        setLoading(true);
        setError(null);
        try {
            const res = await financeService.getLedgerData(slug);
            setData(res);
        } catch (err) {
            setError(err?.response?.status === 403 ? 'You do not have permission to view this ledger.' : (err?.message || 'Failed to load ledger.'));
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (!ledgerNameParam) {
        return (
            <div className="p-6 text-sm text-slate-600 dark:text-slate-400">
                Invalid ledger.
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[320px]">
                <p className="text-sm text-slate-500">Loading ledger...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="p-6 max-w-md mx-auto">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 text-center">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
                        {error || 'Ledger not found.'}
                    </p>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                        Go back
                    </button>
                </div>
            </div>
        );
    }

    if (data.can_view === false) {
        return (
            <div className="p-6 max-w-md mx-auto">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 text-center">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
                        You do not have permission to view this ledger.
                    </p>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                        Go back
                    </button>
                </div>
            </div>
        );
    }

    const columns = Array.isArray(data.columns) ? data.columns : [];
    const rows = Array.isArray(data.rows) ? data.rows : [];

    return (
        <div className="flex flex-col h-full overflow-hidden p-4">
            {/* Header */}
            <div className="shrink-0 mb-4">
                <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
                    {data.ledger_name || slug.replace(/_/g, ' ')}
                </h1>
                {data.ledger_name && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Financial ledger · {data.can_edit ? 'Edit' : 'View only'}
                    </p>
                )}
            </div>

            {/* Grid */}
            <div className="flex-1 min-h-0">
                <FinancialLedgerGrid
                    ledgerSlug={data.ledger}
                    ledgerName={data.ledger_name}
                    canView={data.can_view !== false}
                    canEdit={data.can_edit === true}
                    columns={columns}
                    rows={rows}
                    onRefresh={fetchData}
                />
            </div>
        </div>
    );
}
