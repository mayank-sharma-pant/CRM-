'use client';

import DynamicLedger from '@/components/ledgers/DynamicLedger';

export default function PaymentsReceivedPage() {
    return (
        <DynamicLedger
            title="Payments Received"
            subtitle="Track incoming payments from clients"
            endpoint="/ledgers/payments-received"
        />
    );
}
