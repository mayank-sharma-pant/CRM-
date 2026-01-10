'use client';

/**
 * MANAGER REPORTS PAGE
 * 
 * Reuses the Sales Reports Page strictly.
 * Data scope (Team vs Personal) is handled by the API layer based on the route context.
 */

import Reports from '../../sales/reports/page.jsx';

export default function ManagerReports() {
    return (
        <Reports
            dashboardEndpoint="/reports/team-dashboard"
            overviewEndpoint="/reports/team-overview"
        />
    );
}
