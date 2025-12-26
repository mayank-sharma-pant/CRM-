export const MOCK_DATA = {
    '/reports/dashboard': {
        totalLeads: 124,
        convertedLeads: 38,
        conversionRate: 30.6,
        recentLeads: 15
    },
    '/follow-ups/today': [
        { id: 1, lead_name: 'Sarah Miller', scheduled_time: '14:00', status: 'Pending' },
        { id: 2, lead_name: 'Mike Johnson', scheduled_time: '16:30', status: 'Pending' },
        { id: 3, lead_name: 'Tech Solutions Inc.', scheduled_time: '10:00', status: 'Completed' }
    ],
    '/follow-ups/overdue': [
        { id: 4, lead_name: 'David Wilson', scheduled_date: '2023-11-20', status: 'Pending' },
        { id: 5, lead_name: 'Green Gardens', scheduled_date: '2023-11-22', status: 'Pending' }
    ]
};
