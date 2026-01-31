'use client';

import DynamicLedger from '@/components/ledgers/DynamicLedger';

export default function PdcReceivedPage() {
    return (
        <DynamicLedger
            title="PDC Received"
            subtitle="Post-dated cheques received from clients"
            endpoint="/ledgers/pdc-received"
        />
    );
}
