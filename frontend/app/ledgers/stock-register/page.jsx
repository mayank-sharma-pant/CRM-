'use client';

import DynamicLedger from '@/components/ledgers/DynamicLedger';

export default function StockRegisterPage() {
    return (
        <DynamicLedger
            title="Stock Register"
            subtitle="Track inventory movement and stock levels"
            endpoint="/ledgers/stock-register"
        />
    );
}
