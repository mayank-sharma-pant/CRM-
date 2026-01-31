'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { financeService } from '../../../services/financeService';
import LedgerView from '../../../components/finance/LedgerView';
import { AlertTriangle } from 'lucide-react';

export default function LedgerPage({ params }) {
    // Next.js 15+ async params unwrap
    const { ledger } = use(params);
    const router = useRouter();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const ledgerData = await financeService.getLedgerData(ledger);
                setData(ledgerData);
                setError(null);
            } catch (err) {
                console.error("Ledger fetch error:", err);
                if (err.response && err.response.status === 403) {
                    setError("You are not authorized to view this ledger.");
                } else if (err.response && err.response.status === 404) {
                    setError("Ledger not found.");
                } else {
                    setError("Failed to load ledger data.");
                }
            } finally {
                setLoading(false);
            }
        }

        if (ledger) {
            fetchData();
        }
    }, [ledger]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-3 border-stone-200 border-t-stone-800 rounded-full animate-spin"></div>
                    <p className="text-sm text-stone-500 font-medium">Loading ledger...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-sm border border-red-100">
                    <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={24} />
                    </div>
                    <h2 className="text-lg font-bold text-stone-900 mb-2">Access Denied</h2>
                    <p className="text-stone-500 mb-6">{error}</p>
                    <button
                        onClick={() => router.back()}
                        className="btn btn-secondary text-sm"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <LedgerView data={data} />
    );
}
