'use client';

import Link from 'next/link';
import {
    FileText,
    ArrowRight,
    Calculator,
    CreditCard,
    DollarSign,
    TrendingDown,
    TrendingUp,
    Landmark,
    FileCheck
} from 'lucide-react';

const LEDGERS = [
    {
        name: 'Stock Register',
        description: 'Track inventory, product flow, and current stock levels.',
        icon: Calculator,
        href: '/ledgers/stock-register',
        color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20'
    },
    {
        name: 'Payments Made',
        description: 'Record of all payments made to vendors and parties.',
        icon: TrendingDown,
        href: '/ledgers/payments-made',
        color: 'text-red-500 bg-red-50 dark:bg-red-900/20'
    },
    {
        name: 'Payments Received',
        description: 'Track incoming payments from clients and customers.',
        icon: TrendingUp,
        href: '/ledgers/payments-received',
        color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
    },
    {
        name: 'Daily Expenses',
        description: 'Log miscellaneous daily operational expenses.',
        icon: CreditCard,
        href: '/ledgers/daily-expenses',
        color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20'
    },
    {
        name: 'Cash & Bank Balance',
        description: 'Daily tracking of cash in hand and bank account balances.',
        icon: Landmark,
        href: '/ledgers/cash-bank-balance',
        color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
    },
    {
        name: 'PDC Given',
        description: 'Track post-dated cheques issued to parties.',
        icon: FileCheck,
        href: '/ledgers/pdc-given',
        color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20'
    },
    {
        name: 'PDC Received',
        description: 'Track post-dated cheques received from clients.',
        icon: FileCheck,
        href: '/ledgers/pdc-received',
        color: 'text-pink-500 bg-pink-50 dark:bg-pink-900/20'
    },
    {
        name: 'Transfer Purchase',
        description: 'Record internal stock transfers (Purchase side).',
        icon: arrowRightIcon, // Using function below
        href: '/ledgers/transfer-purchase',
        color: 'text-slate-500 bg-slate-50 dark:bg-slate-800'
    },
    {
        name: 'Transfer Sales',
        description: 'Record internal stock transfers (Sales side).',
        icon: arrowRightIcon,
        href: '/ledgers/transfer-sales',
        color: 'text-slate-500 bg-slate-50 dark:bg-slate-800'
    }
];

function arrowRightIcon(props) {
    return <ArrowRight {...props} />;
}

export default function LedgersIndex() {
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
                        Access and manage all financial registers, stock logs, and daily expense reports.
                    </p>
                </div>
            </div>

            {/* Categories Grid */}
            <div className="max-w-6xl mx-auto px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {LEDGERS.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="group bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-md transition-all duration-200 flex flex-col"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-3 rounded-lg ${item.color}`}>
                                        <Icon size={24} />
                                    </div>
                                    <ArrowRight className="text-slate-300 group-hover:text-indigo-500 transition-colors" size={20} />
                                </div>

                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {item.name}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                    {item.description}
                                </p>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
