'use client';

import DynamicLedger from '@/components/ledgers/DynamicLedger';

export default function DailyExpensesPage() {
    return (
        <DynamicLedger
            title="Daily Expenses"
            subtitle="Log miscellaneous daily operational expenses"
            endpoint="/ledgers/daily-expenses"
        />
    );
}
