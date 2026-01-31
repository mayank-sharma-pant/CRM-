'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { financeService } from '../../services/financeService';
import {
    FileText,
    ArrowRight,
    Calculator,
    CreditCard,
    DollarSign,
    TrendingDown,
    TrendingUp,
    Landmark,
    FileCheck,
    Lock,
    Edit2
} from 'lucide-react';

// Icon mapping based on ledger slug
const LEDGER_ICONS = {
    'stock_register': { icon: Calculator, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
    'payments_made': { icon: TrendingDown, color: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
    'payments_received': { icon: TrendingUp, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
    'daily_expenses': { icon: CreditCard, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
    'cash_bank_balance': { icon: Landmark, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' },
    'pdc_given': { icon: FileCheck, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' },
    'pdc_received': { icon: FileCheck, color: 'text-pink-500 bg-pink-50 dark:bg-pink-900/20' },
    'account_transfer_purchase': { icon: ArrowRight, color: 'text-slate-500 bg-slate-50 dark:bg-slate-800' },
    'account_transfer_sales': { icon: ArrowRight, color: 'text-slate-500 bg-slate-50 dark:bg-slate-800' }
};

// Description mapping for better UX
const LEDGER_DESCRIPTIONS = {
    'stock_register': 'Track inventory, product flow, and current stock levels.',
    'payments_made': 'Record of all payments made to vendors and parties.',
    'payments_received': 'Track incoming payments from clients and customers.',
    'daily_expenses': 'Log miscellaneous daily operational expenses.',
    'cash_bank_balance': 'Daily tracking of cash in hand and bank account balances.',
    'pdc_given': 'Track post-dated cheques issued to parties.',
    'pdc_received': 'Track post-dated cheques received from clients.',
    'account_transfer_purchase': 'Record internal stock transfers (Purchase side).',
    'account_transfer_sales': 'Record internal stock transfers (Sales side).'
};

export default function LedgersIndex() {
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
            <div className="flex items-center justify-center h-[calc(100vh-120px)]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-sm text-slate-500">Loading ledgers...</p>
                </div>
            </div>
        );
    }

    if (ledgers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] text-center p-8">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6">
                    <Lock className="w-8 h-8 text-slate-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No Ledgers Available</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm">
                    You do not have access to any financial ledgers.
                    Contact your administrator for access.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-56px)] bg-slate-50 dark:bg-slate-900 pb-12">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-8 mb-8">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <FileText size={24} />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                            Financial Ledgers
                        </h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 max-w-2xl ml-14">
                        Access and manage your authorized financial registers and expense reports.
                    </p>
                </div>
            </div>

            {/* Ledgers Grid - API Driven */}
            <div className="max-w-6xl mx-auto px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {ledgers.map((ledger) => {
                        const iconData = LEDGER_ICONS[ledger.slug] || { icon: FileText, color: 'text-slate-500 bg-slate-50' };
                        const Icon = iconData.icon;
                        const description = LEDGER_DESCRIPTIONS[ledger.slug] || 'Financial ledger.';

                        return (
                            <Link
                                key={ledger.slug}
                                href={`/finance/${ledger.slug}`}
                                className="group bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-md transition-all duration-200 flex flex-col"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-3 rounded-lg ${iconData.color}`}>
                                        <Icon size={24} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {ledger.can_edit ? (
                                            <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 rounded">
                                                <Edit2 size={10} /> Edit
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 rounded">
                                                <Lock size={10} /> View
                                            </span>
                                        )}
                                        <ArrowRight className="text-slate-300 group-hover:text-indigo-500 transition-colors" size={20} />
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {ledger.name}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                    {description}
                                </p>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
