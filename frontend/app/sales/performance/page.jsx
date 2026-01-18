'use client';

import PerformanceView from '../../../components/shared/PerformanceView';
import { MOCK_DATA } from '../../../services/mockData';

export default function PerformancePage() {
    const data = MOCK_DATA['/performance/personal'];

    return <PerformanceView data={data} />;
}
