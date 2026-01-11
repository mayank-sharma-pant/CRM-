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
    // Manager Scope: Team Reports
    '/reports/team-dashboard': {
        totalLeads: 542, // "Team Leads Volume"
        convertedLeads: 78,
        conversionRate: 14.3,
        lostLeads: 45,
        recentLeads: 120,
        leadsByStatus: [
            { status: 'New', count: 156 },
            { status: 'Contacted', count: 112 },
            { status: 'Follow-up', count: 89 },
            { status: 'Negotiation', count: 62 },
            { status: 'Converted', count: 78 },
            { status: 'Lost', count: 45 }
        ],
        leadsBySource: [
            { source: 'Website', count: 215 },
            { source: 'Partners / Referrals', count: 140 },
            { source: 'Outbound Campaigns', count: 120 },
            { source: 'Events', count: 67 }
        ]
    },
    '/reports/team-overview': {
        leadsCreated: [ // "Pipeline Movement"
            { date: '2023-12-01', count: 25 },
            { date: '2023-12-02', count: 32 },
            { date: '2023-12-03', count: 45 },
            { date: '2023-12-04', count: 28 },
            { date: '2023-12-05', count: 55 },
            { date: '2023-12-06', count: 42 },
            { date: '2023-12-07', count: 60 }
        ],
        conversions: [
            { date: '2023-12-01', count: 5 },
            { date: '2023-12-02', count: 8 },
            { date: '2023-12-03', count: 12 },
            { date: '2023-12-04', count: 6 },
            { date: '2023-12-05', count: 15 },
            { date: '2023-12-06', count: 9 },
            { date: '2023-12-07', count: 14 }
        ]
    },
    '/tasks/list': [
        { id: 1, title: 'Follow up on proposal', dueDate: 'Today, 2:00 PM', entityType: 'Lead', entity: 'TechFlow Inc.', assignedBy: 'self', isChild: false },
        { id: 2, title: 'Prepare contract draft', dueDate: 'Tomorrow, 10:00 AM', entityType: 'Client', entity: 'BigBank', assignedBy: 'manager', isChild: false },
        { id: 3, title: 'Schedule demo', dueDate: 'Yesterday', entityType: 'Lead', entity: 'CloudSystems', assignedBy: 'self', isChild: false },
        { id: 4, title: 'Update requirements', dueDate: 'Today, 4:00 PM', entityType: 'Client', entity: 'Global Corp', assignedBy: 'self', isChild: true }
    ],
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
    '/leads': [
        // NEW
        { id: 101, name: 'Sarah Miller', company: 'TechFlow Inc.', status: 'New', created_at: new Date().toISOString() },
        { id: 102, name: 'David Chen', company: 'CloudSystems', status: 'New', created_at: new Date().toISOString() },

        // CONTACTED
        { id: 201, name: 'Michael Ross', company: 'Alpha Group', status: 'Contacted', last_contacted_at: new Date(Date.now() - 86400000 * 2).toISOString(), last_response_at: null },
        { id: 202, name: 'Emily White', company: 'Design Co.', status: 'Contacted', last_contacted_at: new Date(Date.now() - 86400000 * 5).toISOString(), last_response_at: new Date(Date.now() - 86400000 * 1).toISOString() },

        // QUALIFIED / FOLLOW-UP
        { id: 301, name: 'James Wilson', company: 'Enterprise Ltd', status: 'Qualified', last_contacted_at: new Date(Date.now() - 86400000 * 2).toISOString(), next_task: new Date().toISOString() },
        { id: 302, name: 'Linda Martinez', company: 'Global Corp', status: 'Qualified', last_contacted_at: new Date(Date.now() - 86400000 * 10).toISOString(), next_task: new Date(Date.now() - 86400000 * 3).toISOString() },

        // CONVERTED
        { id: 401, name: 'Robert Taylor', company: 'BigBank', status: 'Converted', last_contacted_at: new Date(Date.now() - 86400000 * 20).toISOString() },

        // LOST
        { id: 501, name: 'Angela Martin', company: 'SmallStart', status: 'Lost', last_contacted_at: new Date(Date.now() - 86400000 * 30).toISOString() }
    ],
    '/notes/lead/1': [
        { id: 101, content: 'Initial contact made. Client is very interested in the premium package.', created_at: '2023-12-01T10:30:00Z' },
        { id: 102, content: 'Sent the brochure and pricing list.', created_at: '2023-12-02T09:15:00Z' }
    ],
    '/follow-ups': [
        { id: 201, lead_id: '1', scheduled_date: '2023-12-10', scheduled_time: '10:00', status: 'Pending', notes: 'Discuss proposal' }
    ],
    '/performance/personal': {
        header: {
            title: 'My Performance',
            subtitle: 'Your personal work summary'
        },
        leadsMetrics: [
            { label: 'Total Leads Handled', value: '124', color: 'slate', icon: 'Target' },
            { label: 'Leads Converted', value: '18', color: 'emerald', icon: 'CheckCircle2' },
            { label: 'Conversion Rate', value: '14.5%', color: 'blue', icon: 'TrendingUp' }
        ],
        taskStatus: {
            title: 'Task Completion Status',
            completed: 42,
            inProgress: 8,
            overdue: 3
        },
        activity: {
            title: 'Activity Breakdown',
            section1: {
                title: 'This Week',
                items: [
                    { label: 'Tasks Completed', value: '12' },
                    { label: 'New Leads Contacted', value: '5' }
                ]
            },
            section2: {
                title: 'This Month',
                items: [
                    { label: 'Total Tasks Resolved', value: '86' },
                    { label: 'Leads Converted', value: '3' }
                ]
            }
        },
        footer: {
            text: 'Last updated: Just now • Data reflects your personal activity only'
        }
    },
    '/performance/team': {
        header: {
            title: 'Team Execution Health',
            subtitle: 'Aggregated team summary & execution trends'
        },
        leadsMetrics: [
            { label: 'Team Leads Volume', value: '542', color: 'slate', icon: 'Users' },
            { label: 'Team Conversions', value: '78', color: 'emerald', icon: 'CheckCircle2' },
            { label: 'Group Conversion Rate', value: '14.3%', color: 'blue', icon: 'TrendingUp' }
        ],
        taskStatus: {
            title: 'Team Task Throughput',
            completed: 186,
            inProgress: 42,
            overdue: 12
        },
        activity: {
            title: 'Execution Velocity',
            section1: {
                title: 'Current Sprint',
                items: [
                    { label: 'Tasks Resolved', value: '89' },
                    { label: 'Active Leads', value: '120' }
                ]
            },
            section2: {
                title: 'Monthly Aggregate',
                items: [
                    { label: 'Total Pipeline', value: '420' },
                    { label: 'Closed Won', value: '45' }
                ]
            }
        },
        footer: {
            text: 'View Mode: Manager • Aggregated Data • Read Only'
        }
    },
    '/invoices': [
        { id: 'INV-2024-001', client: 'BigBank International', amount: '$12,500.00', status: 'Paid', dueDate: '2023-12-15', date: '2023-11-15' },
        { id: 'INV-2024-002', client: 'TechFlow Inc.', amount: '$4,250.00', status: 'Overdue', dueDate: '2023-12-20', date: '2023-11-20' },
        { id: 'INV-2024-003', client: 'Solaris Systems', amount: '$8,000.00', status: 'Pending', dueDate: '2024-01-15', date: '2023-12-15' },
        { id: 'INV-2024-004', client: 'Future Net', amount: '$2,100.00', status: 'Paid', dueDate: '2023-12-01', date: '2023-11-01' }
    ],
    '/invoices/team': [
        { id: 'INV-2024-001', client: 'BigBank International', amount: '$12,500.00', status: 'Paid', dueDate: '2023-12-15', date: '2023-11-15', owner: 'Alex Johnson' },
        { id: 'INV-2024-002', client: 'TechFlow Inc.', amount: '$4,250.00', status: 'Overdue', dueDate: '2023-12-20', date: '2023-11-20', owner: 'Alex Johnson' },
        { id: 'INV-2024-003', client: 'Solaris Systems', amount: '$8,000.00', status: 'Pending', dueDate: '2024-01-15', date: '2023-12-15', owner: 'Alex Johnson' },
        { id: 'INV-2024-005', client: 'Global Corp', amount: '$15,000.00', status: 'Pending', dueDate: '2024-01-20', date: '2023-12-20', owner: 'Sarah Smith' },
        { id: 'INV-2024-006', client: 'Alpha Group', amount: '$5,500.00', status: 'Overdue', dueDate: '2023-12-25', date: '2023-11-25', owner: 'Mike Brown' },
        { id: 'INV-2024-007', client: 'Design Co.', amount: '$3,200.00', status: 'Paid', dueDate: '2023-12-10', date: '2023-11-10', owner: 'Sarah Smith' }
    ],
    '/navigation': {
        sales: [
            { name: 'Dashboard', href: '/sales/dashboard', icon: 'LayoutDashboard' },
            { name: 'Tasks', href: '/sales/tasks', icon: 'CheckSquare' },
            { name: 'Leads', href: '/sales/leads', icon: 'Users' },
            { name: 'Clients', href: '/sales/clients', icon: 'Briefcase' },
            { name: 'My Performance', href: '/sales/performance', icon: 'BarChart3' },
            { name: 'Invoices', href: '/sales/invoices', icon: 'Receipt' },
            { name: 'Settings', href: '/sales/settings', icon: 'Settings' }
        ],
        manager: [
            { name: 'Team Dashboard', href: '/manager/dashboard', icon: 'LayoutDashboard' },
            { name: 'Monitoring', href: '/manager/monitoring', icon: 'Activity' },
            { name: 'Team Tasks', href: '/manager/tasks', icon: 'CheckSquare' },
            { name: 'Leads', href: '/manager/leads', icon: 'Users' },
            { name: 'Clients', href: '/manager/clients', icon: 'Briefcase' },
            { name: 'Reports', href: '/manager/reports', icon: 'BarChart3' },
            { name: 'Invoices', href: '/manager/invoices', icon: 'Receipt' },
            { name: 'Settings', href: '/manager/settings', icon: 'Settings' }
        ],
        md: [
            { name: 'Dashboard', href: '/md/dashboard', icon: 'LayoutDashboard' },
            { name: 'Revenue', href: '/md/revenue', icon: 'DollarSign' },
            { name: 'Monitoring', href: '/md/monitoring', icon: 'Activity' },
            { name: 'Sales', href: '/md/sales', icon: 'BarChart' },
            { name: 'Invoices', href: '/md/invoices', icon: 'Receipt' },
            { name: 'Points', href: '/md/points', icon: 'Award' },
            { name: 'Leads', href: '/md/leads', icon: 'Users' },
            { name: 'Clients', href: '/md/clients', icon: 'Briefcase' },
            { name: 'AI Assistant', href: '/md/ai-assistant', icon: 'BrainCircuit' }
        ]
    },
    // Managing Director Mock Data
    '/md/dashboard': {
        kpis: [
            { id: 1, label: 'Leads', value: '1,248', change: '+12%', trend: 'up', route: '/md/leads' },
            { id: 2, label: 'Clients', value: '342', change: '+5%', trend: 'up', route: '/md/clients' },
            { id: 3, label: 'Sales', value: '$842k', change: '+18%', trend: 'up', route: '/md/sales' },
            { id: 4, label: 'Invoices', value: '$125k', subValue: '85% Paid', change: '-2%', trend: 'down', route: '/md/invoices' },
            { id: 5, label: 'Revenue', value: '$1.2M', change: '+15%', trend: 'up', route: '/md/revenue' },
            { id: 6, label: 'Pts Dist.', value: '45.2k', change: '+8%', trend: 'up', route: '/md/points' },
            { id: 7, label: 'Alerts', value: '12', subValue: '2 High', change: 'Stable', trend: 'neutral', route: '/md/monitoring' },
            { id: 8, label: 'Conv. Rate', value: '22%', change: '+1.5%', trend: 'up', route: '/md/sales' }
        ],
        revenueTrend: [
            { date: 'Mon', value: 12000 }, { date: 'Tue', value: 15400 }, { date: 'Wed', value: 11200 },
            { date: 'Thu', value: 18900 }, { date: 'Fri', value: 16500 }, { date: 'Sat', value: 8400 }, { date: 'Sun', value: 5600 }
        ],
        pipelineSummary: {
            stageDistribution: [
                { stage: 'New', count: 120 }, { stage: 'Contacted', count: 85 },
                { stage: 'Qualified', count: 60 }, { stage: 'Negotiation', count: 45 }, { stage: 'Closed', count: 30 }
            ],
            topStage: 'New Leads (35%)',
            stalledStage: 'Negotiation (Avg 14d)',
            dropOff: 'Contact -> Qual (15%)'
        },
        financeSnapshot: {
            invoiceHealth: [
                { name: 'Paid', value: 75, color: '#10b981' },
                { name: 'Unpaid', value: 20, color: '#f59e0b' },
                { name: 'Overdue', value: 5, color: '#ef4444' }
            ],
            counts: { paid: 145, outstanding: 24, overdue: 8 },
            revenueMix: [
                { name: 'Consulting', value: 55 }, { name: 'Licenses', value: 30 }, { name: 'Support', value: 15 }
            ]
        },
        riskFeed: [
            { id: 1, title: 'Invoice Overdue Spike', severity: 'High', metric: 'Finance', delta: '+15%', time: '2h ago' },
            { id: 2, title: 'Conversion Dip', severity: 'Medium', metric: 'Sales', delta: '-3%', time: '5h ago' },
            { id: 3, title: 'Engagement Drop', severity: 'Medium', metric: 'Clients', delta: '-8%', time: '1d ago' },
            { id: 4, title: 'Pipeline Stalled', severity: 'Low', metric: 'Leads', delta: '4 Deals', time: '1d ago' },
            { id: 5, title: 'Abnormal Pts Dist', severity: 'Low', metric: 'Points', delta: 'Skewed', time: '2d ago' }
        ],
        trendWatchlist: [
            { name: 'Lead Inflow', trend: 'up', delta: '+12%' },
            { name: 'Conversion', trend: 'down', delta: '-1.2%' },
            { name: 'Overdue Inv', trend: 'down', delta: '-5%' },
            { name: 'Revenue', trend: 'up', delta: '+8%' },
            { name: 'Pts Skew', trend: 'neutral', delta: '0%' }
        ],
        pointsSnapshot: {
            distribution: [
                { name: 'Sales A', value: 4500 }, { name: 'Sales B', value: 3200 }, { name: 'Support', value: 1500 }, { name: 'Mktg', value: 1200 }
            ],
            events: [
                { type: 'Deal Closed', total: 5000, freq: 12, trend: 'up' },
                { type: 'Lead Qual', total: 3200, freq: 45, trend: 'up' },
                { type: 'Client Ret', total: 1500, freq: 5, trend: 'stable' }
            ]
        },
        aiBrief: [
            { id: 1, title: 'Q3 Forecast Exceeded', summary: 'Based on current pipeline velocity, Q3 revenue will exceed targets by 12%.', metric: 'Rev +12%', confidence: 92, link: '/md/revenue' },
            { id: 2, title: 'Client Churn Signal', summary: 'Engagement drop detected in 3 key accounts (TechFlow, BigBank).', metric: 'Risk High', confidence: 85, link: '/md/clients' },
            { id: 3, title: 'Incentive Skew', summary: 'Top 5% of performers earning 60% of points. Consider clearer tiering.', metric: 'Gini 0.6', confidence: 78, link: '/md/points' }
        ]
    },
    '/md/revenue': {
        totalRevenue: '$842,500',
        growth: '+18.5%',
        avgDealSize: '$12,400',
        revenuePerClient: '$4,100',
        trend: [
            { month: 'Jan', revenue: 65000 }, { month: 'Feb', revenue: 72000 }, { month: 'Mar', revenue: 85000 },
            { month: 'Apr', revenue: 68000 }, { month: 'May', revenue: 92000 }, { month: 'Jun', revenue: 105000 }
        ],
        byProduct: [
            { name: 'Consulting', value: 45 }, { name: 'Licenses', value: 35 }, { name: 'Support', value: 20 }
        ]
    },
    '/md/monitoring': {
        riskScore: 88, // out of 100, higher is better/safer? or risk index? Prompt says "Risk Score / Alerts count". Let's assume Risk Index (Low/Med/High).
        activeAlerts: 12,
        topRisks: [
            { category: 'Liquidity', severity: 'High', message: 'Cashflow projection below threshold' },
            { category: 'Retention', severity: 'Medium', message: 'Client churn risk detected in Ent. sector' }
        ]
    },
    '/md/sales': {
        totalSales: 154,
        conversionRate: '22.4%',
        salesGrowth: '+8.2%',
        funnel: [
            { stage: 'Leads', count: 1200 },
            { stage: 'Qualified', count: 450 },
            { stage: 'Proposals', count: 210 },
            { stage: 'Closed Won', count: 154 }
        ],
        teamPerformance: [
            { team: 'Enterprise', sales: 65, revenue: '$450k' },
            { team: 'SMB', sales: 89, revenue: '$220k' }
        ]
    },
    '/md/invoices': {
        totalInvoiced: '$1.2M',
        collected: '$980k',
        outstanding: '$220k',
        overdue: '$45k',
        statusDistribution: [
            { status: 'Paid', value: 75 },
            { status: 'Outstanding', value: 20 },
            { status: 'Overdue', value: 5 }
        ]
    },
    '/md/points': {
        totalDistributed: '45,200',
        eventsCount: 1240,
        distributionByTeam: [
            { team: 'Sales Alpha', points: 15000 },
            { team: 'Sales Bravo', points: 12500 },
            { team: 'Support', points: 8000 }
        ]
    },
    '/md/ai-assistant': {
        insights: [
            { id: 1, type: 'Revenue', title: 'Q3 Forecast Exceeded', summary: 'Based on current pipeline velocity, Q3 revenue will exceed targets by 12%.', confidence: 92 },
            { id: 2, type: 'Risk', title: 'Client Churn Signal', summary: 'Engagement drop detected in 3 key accounts (TechFlow, BigBank).', confidence: 85 },
            { id: 3, type: 'Points', title: 'Incentive Skew', summary: 'Top 5% of performers earning 60% of points. Consider clearer tiering.', confidence: 78 }
        ]
    }
};
