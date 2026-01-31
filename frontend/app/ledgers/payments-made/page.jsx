'use client';

import DynamicLedger from '@/components/ledgers/DynamicLedger';

export default function PaymentsMadePage() {
    return (
        <DynamicLedger
            title="Payments Made"
            subtitle="Record of payments to vendors and parties"
            endpoint="/ledgers/payments-made"
        />
    );
}
