'use client';

import PerformanceView from '../../../components/shared/PerformanceView';
import { MOCK_DATA } from '../../../services/mockData';

export default function PerformancePage() {
    // In a real app, this would be fetched via useEffect or SWR
    const data = MOCK_DATA['/performance/personal'];

    return <PerformanceView data={data} />;
}
