'use client';

import DynamicLedger from '@/components/ledgers/DynamicLedger';

export default function TransferPurchasePage() {
    return (
        <DynamicLedger
            title="Internal Transfer (Purchase)"
            subtitle="Stock transfers from purchase side"
            endpoint="/ledgers/transfer-purchase"
        />
    );
}
