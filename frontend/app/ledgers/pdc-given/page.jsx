'use client';

import DynamicLedger from '@/components/ledgers/DynamicLedger';

export default function PdcGivenPage() {
    return (
        <DynamicLedger
            title="PDC Issued"
            subtitle="Post-dated cheques issued to parties"
            endpoint="/ledgers/pdc-given"
        />
    );
}
