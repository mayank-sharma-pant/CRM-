'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export default function FinancialLedgersIndexPage() {
    return (
        <div className="p-6 max-w-lg mx-auto">
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 text-center">
                <BookOpen className="mx-auto text-slate-400 mb-3" size={32} />
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-2">
                    Financial Ledgers
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Select a ledger from the sidebar to view or edit.
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                    Stock Register, Payments Made, Payments Received, Daily Expenses, Cash & Bank Balance, PDC Cheque Given, PDC Cheque Received, Account Transfer Purchase, Account Transfer Sales
                </p>
            </div>
        </div>
    );
}
