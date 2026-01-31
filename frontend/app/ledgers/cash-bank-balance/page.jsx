'use client';

import DynamicLedger from '@/components/ledgers/DynamicLedger';

export default function CashBankBalancePage() {
    return (
        <DynamicLedger
            title="Cash & Bank Balance"
            subtitle="Daily position of cash and bank accounts"
            endpoint="/ledgers/cash-bank-balance"
        />
    );
}
