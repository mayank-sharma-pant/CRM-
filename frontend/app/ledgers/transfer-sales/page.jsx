'use client';

import DynamicLedger from '@/components/ledgers/DynamicLedger';

export default function TransferSalesPage() {
    return (
        <DynamicLedger
            title="Internal Transfer (Sales)"
            subtitle="Stock transfers to sales side"
            endpoint="/ledgers/transfer-sales"
        />
    );
}
