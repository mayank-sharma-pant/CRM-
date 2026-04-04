'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MDPerformancePage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/md/teams');
    }, [router]);
    return null;
}
