export const MOCK_DATA = {
    '/reports/dashboard': {
        totalLeads: 124,
        convertedLeads: 38,
        conversionRate: 30.6,
        lostLeads: 12,
        recentLeads: 15,
        leadsByStatus: [
            { status: 'New', count: 45 },
            { status: 'Contacted', count: 32 },
            { status: 'Follow-up', count: 28 },
            { status: 'Converted', count: 38 },
            { status: 'Lost', count: 12 }
        ],
        leadsBySource: [
            { source: 'Website', count: 65 },
            { source: 'Referral', count: 30 },
            { source: 'Social Media', count: 20 },
            { source: 'Cold Call', count: 9 }
        ]
    },
    '/reports/overview': {
        leadsCreated: [
            { date: '2023-12-01', count: 5 },
            { date: '2023-12-02', count: 8 },
            { date: '2023-12-03', count: 12 },
            { date: '2023-12-04', count: 7 },
            { date: '2023-12-05', count: 15 },
            { date: '2023-12-06', count: 10 },
            { date: '2023-12-07', count: 18 }
        ],
        conversions: [
            { date: '2023-12-01', count: 1 },
            { date: '2023-12-02', count: 2 },
            { date: '2023-12-03', count: 4 },
            { date: '2023-12-04', count: 1 },
            { date: '2023-12-05', count: 6 },
            { date: '2023-12-06', count: 3 },
            { date: '2023-12-07', count: 5 }
        ]
    },
    '/follow-ups/today': [
        { id: 1, lead_name: 'Sarah Miller', scheduled_time: '14:00', status: 'Pending' },
        { id: 2, lead_name: 'Mike Johnson', scheduled_time: '16:30', status: 'Pending' },
        { id: 3, lead_name: 'Tech Solutions Inc.', scheduled_time: '10:00', status: 'Completed' }
    ],
    '/follow-ups/overdue': [
        { id: 4, lead_name: 'David Wilson', scheduled_date: '2023-11-20', status: 'Pending' },
        { id: 5, lead_name: 'Green Gardens', scheduled_date: '2023-11-22', status: 'Pending' }
    ],
    // Mock data for Lead Detail (Lead ID: 1)
    '/leads/1': {
        id: 1,
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1 (555) 123-4567',
        service_type: 'Premium Consulting',
        source: 'Website Referral',
        status: 'New',
        created_at: '2023-12-01T10:00:00Z',
        updated_at: '2023-12-05T14:30:00Z'
    },
    '/notes/lead/1': [
        { id: 101, content: 'Initial contact made. Client is very interested in the premium package.', created_at: '2023-12-01T10:30:00Z' },
        { id: 102, content: 'Sent the brochure and pricing list.', created_at: '2023-12-02T09:15:00Z' }
    ],
    '/follow-ups': [
        { id: 201, lead_id: '1', scheduled_date: '2023-12-10', scheduled_time: '10:00', status: 'Pending', notes: 'Discuss proposal' }
    ]
};
