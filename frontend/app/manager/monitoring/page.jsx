'use client';

import PerformanceView from '../../../components/shared/PerformanceView';
import { MOCK_DATA } from '../../../services/mockData';

export default function MonitoringPage() {
    // In a real app, this would be fetched via useEffect or SWR
    // The backend determines the scope (team) based on the endpoint or user role
    const data = MOCK_DATA['/performance/team'];

    return <PerformanceView data={data} />;
}
