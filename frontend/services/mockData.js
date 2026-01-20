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
            { name: 'Employee Lookup', href: '/md/employee-lookup', icon: 'UserSearch' },
            { name: 'AI Assistant', href: '/md/ai-assistant', icon: 'BrainCircuit' }
        ],
        purchase: [
            { name: 'Dashboard', href: '/purchase/dashboard', icon: 'LayoutDashboard' },
            { name: 'Sales Review', href: '/purchase/sales', icon: 'ShoppingCart' },
            { name: 'Invoices', href: '/purchase/invoices', icon: 'Receipt' },
            { name: 'Monitoring', href: '/purchase/monitoring', icon: 'Activity' },
            { name: 'AI Assistant', href: '/purchase/ai-assistant', icon: 'BrainCircuit' }
        ],
        admin: [
            { name: 'Dashboard', href: '/admin/dashboard', icon: 'LayoutDashboard' },
            { name: 'Users', href: '/admin/users', icon: 'Users' },
            { name: 'Teams & Hierarchy', href: '/admin/teams-hierarchy', icon: 'GitBranch' },
            { name: 'Settings', href: '/admin/settings', icon: 'Settings' },
            { name: 'Audit Logs', href: '/admin/audit', icon: 'FileText' }
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
        salesMomentum: {
            trend: [
                { date: 'W1', sales: 45, revenue: 15000 }, { date: 'W2', sales: 52, revenue: 18000 },
                { date: 'W3', sales: 48, revenue: 16500 }, { date: 'W4', sales: 61, revenue: 22000 }
            ],
            outcomes: [
                { stage: 'Won', count: 120, color: '#10b981' },
                { stage: 'Lost', count: 45, color: '#ef4444' }
            ]
        },
        clientSnapshot: {
            growth: [
                { date: 'Q1', count: 310 }, { date: 'Q2', count: 325 }, { date: 'Q3', count: 342 }
            ],
            status: { active: 315, risk: 27 }
        },
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
        kpis: [
            { id: 1, label: 'Total Revenue', value: '$2.4M', change: '+12.5%', trend: 'up', code: 'total' },
            { id: 2, label: 'Growth', value: '18.2%', change: '+2.1%', trend: 'up', code: 'growth' },
            { id: 3, label: 'Outstanding', value: '$342k', change: '-5.4%', trend: 'down', code: 'outstanding' }, // 'down' is good for outstanding? Context implies trend direction. Color usually handled by generic component. Let's assume green is good.
            { id: 4, label: 'Run Rate', value: '$12.5k', change: '+1.2%', trend: 'up', code: 'run_rate' }
        ],
        revenueTrend: [
            { date: 'Mon', value: 12500, avg: 11000 }, { date: 'Tue', value: 14200, avg: 11200 }, { date: 'Wed', value: 10800, avg: 11400 },
            { date: 'Thu', value: 21500, avg: 11600 }, { date: 'Fri', value: 18900, avg: 11800 }, { date: 'Sat', value: 9200, avg: 12000 }, { date: 'Sun', value: 6500, avg: 12200 },
            { date: 'Mon', value: 13800, avg: 12400 }, { date: 'Tue', value: 15600, avg: 12600 }, { date: 'Wed', value: 11500, avg: 12800 },
            { date: 'Thu', value: 23100, avg: 13000 }, { date: 'Fri', value: 19500, avg: 13200 }, { date: 'Sat', value: 10500, avg: 13400 }, { date: 'Sun', value: 7200, avg: 13600 }
        ],
        trendInsight: "Revenue peaked on Thu ($23.1k); softening observed across weekend (-45%).",
        breakdown: {
            byPeriod: [
                { name: 'Q1', value: 450000, fill: '#6366f1' }, { name: 'Q2', value: 520000, fill: '#8b5cf6' },
                { name: 'Q3', value: 680000, fill: '#ec4899' }, { name: 'Q4 (Proj)', value: 750000, fill: '#f43f5e' }
            ],
            byStatus: [
                { name: 'Collected', value: 1850000 }, { name: 'Invoiced', value: 2100000 }
            ]
        },
        variance: {
            bestPeriod: { label: 'Nov 2023', value: '$850k', growth: '+15%' },
            worstPeriod: { label: 'Aug 2023', value: '$420k', growth: '-8%' },
            stability: { status: 'Stable', score: 8.5 },
            momentum: [10, 12, 11, 13, 15, 14, 16, 18, 17, 19],
            comparison: [
                { period: 'This Month', revenue: '$245k', change: '+12%' },
                { period: 'Last Month', revenue: '$218k', change: '+5%' },
                { period: 'Last Year', revenue: '$180k', change: '+36%' }
            ]
        },
        risks: [
            { id: 1, signal: 'Liquidity Gap', severity: 'High', metric: 'Cashflow', delta: '-15%', detected: '2h ago' },
            { id: 2, signal: 'Recurring Churn', severity: 'Medium', metric: 'Retention', delta: '-2.5%', detected: '1d ago' },
            { id: 3, signal: 'Projected Miss', severity: 'Medium', metric: 'Forecast', delta: '-5%', detected: '3d ago' },
            { id: 4, signal: 'Late Invoices', severity: 'Low', metric: 'Aging', delta: '+8%', detected: '4d ago' }
        ],
        summaryTable: [
            { id: 1, period: 'Week 48', revenue: '$85,400', delta: '+12%', notes: '' },
            { id: 2, period: 'Week 47', revenue: '$76,200', delta: '-5%', notes: 'Holiday dip' },
            { id: 3, period: 'Week 46', revenue: '$80,100', delta: '+2%', notes: '' },
            { id: 4, period: 'Week 45', revenue: '$78,500', delta: '+8%', notes: '' },
            { id: 5, period: 'Week 44', revenue: '$72,300', delta: '0%', notes: '' },
        ]
    },
    '/md/monitoring': {
        summary: {
            riskIndex: 88,
            activeAlerts: 12,
            highSeverity: 3,
            trendDirection: 'stable' // 'improving', 'worsening', 'stable'
        },
        riskTrend: [
            { date: 'Mon', value: 82 }, { date: 'Tue', value: 85 }, { date: 'Wed', value: 92 },
            { date: 'Thu', value: 88 }, { date: 'Fri', value: 88 }, { date: 'Sat', value: 89 }, { date: 'Sun', value: 88 }
        ],
        trendSummary: "Alert volume increased mid-week (Wed peak); stabilized over weekend.",
        categories: [
            { id: 'pipeline', name: 'Pipeline Risk', total: 5, high: 1, medium: 2, low: 2, trend: [2, 3, 5, 4, 5] },
            { id: 'invoice', name: 'Invoice Risk', total: 4, high: 2, medium: 1, low: 1, trend: [1, 2, 2, 4, 4] },
            { id: 'conversion', name: 'Conversion Risk', total: 3, high: 0, medium: 2, low: 1, trend: [3, 3, 2, 3, 3] }
        ],
        alerts: [
            {
                id: 1, severity: 'High', title: 'Liquidity Gap Projected', category: 'Invoice Risk', metric: 'Cashflow', delta: '-15%',
                detected: '2h ago',
                description: ' projected cashflow falls below safety threshold for end of month.',
                evidence: ['Outstanding: $220k', 'Overdue: $45k'],
                relatedLink: '/md/invoices',
                trend: 'down'
            },
            {
                id: 2, severity: 'High', title: 'Major Account Churn Signal', category: 'Pipeline Risk', metric: 'Retention', delta: 'BigBank',
                detected: '5h ago',
                description: 'Engagement score for BigBank dropped by 40% in last 7 days.',
                evidence: ['Login: -50%', 'Tickets: +2'],
                relatedLink: '/md/clients',
                trend: 'down'
            },
            {
                id: 3, severity: 'Medium', title: 'Conversion Rate Dip', category: 'Conversion Risk', metric: 'Sales', delta: '-3.2%',
                detected: '1d ago',
                description: 'Team A conversion rate dropping below Q3 baseline.',
                evidence: ['Avg: 22%', 'Curr: 18%'],
                relatedLink: '/md/sales',
                trend: 'down'
            },
            {
                id: 4, severity: 'Medium', title: 'Stalled Deals in Negotiation', category: 'Pipeline Risk', metric: 'Velocity', delta: '14 Days',
                detected: '1d ago',
                description: 'Average time in Negotiation stage exceeds 14 day warning limit.',
                evidence: ['Stalled: 5 Deals'],
                relatedLink: '/md/leads',
                trend: 'flat'
            },
            {
                id: 5, severity: 'Low', title: 'Abnormal Discounting', category: 'Invoice Risk', metric: 'Margin', delta: '-2%',
                detected: '2d ago',
                description: 'Higher than average discounts applied on recent SMB contracts.',
                evidence: ['Avg Disc: 12%'],
                relatedLink: '/md/invoices',
                trend: 'down'
            },
            {
                id: 6, severity: 'Low', title: 'Lead Inflow Spike', category: 'Pipeline Risk', metric: 'Volume', delta: '+25%',
                detected: '3d ago',
                description: 'Unusual spike in new leads from organic search. Resource check recommended.',
                evidence: ['New: 45/day'],
                relatedLink: '/md/leads',
                trend: 'up' // up can be risk if resource constrained
            }
        ],
        watchlist: [
            { name: 'Lead Inflow', delta: '+12%', trend: [10, 12, 11, 14, 13, 15, 18], link: '/md/leads' },
            { name: 'Conversion', delta: '-1.2%', trend: [22, 21, 21, 20, 19, 19, 20], link: '/md/sales' },
            { name: 'Overdue Inv', delta: '-5%', trend: [15, 14, 12, 12, 10, 8, 8], link: '/md/invoices' },
            { name: 'Rev Momentum', delta: '+8%', trend: [100, 102, 105, 104, 108, 110, 112], link: '/md/revenue' },
            { name: 'Points Skew', delta: '0%', trend: [50, 50, 52, 48, 50, 50, 50], link: '/md/points' }
        ],
        aiInterpretation: [
            { type: 'FINANCE', title: 'Cashflow risk is temporary', evidence: ['Pending Inv $80k'], link: '/md/invoices' },
            { type: 'SALES', title: 'Conversion dip localized to SMB team', evidence: ['Ent: Stable'], link: '/md/sales' },
            { type: 'RISK', title: 'Churn risk requires executive call', evidence: ['BigBank'], link: '/md/clients' }
        ]
    },
    '/md/sales': {
        kpis: [
            { id: 1, label: 'Total Sales', value: '1,248', change: '+12.5%', trend: 'up' },
            { id: 2, label: 'Sales Revenue', value: '$842.5k', change: '+18.2%', trend: 'up' },
            { id: 3, label: 'Conversion Rate', value: '22.4%', change: '+1.5%', trend: 'up' },
            { id: 4, label: 'Momentum', value: '+14%', change: 'Stable', trend: 'neutral' }
        ],
        salesTrend: [
            { date: 'Week 1', count: 145, revenue: 98000 },
            { date: 'Week 2', count: 162, revenue: 112000 },
            { date: 'Week 3', count: 138, revenue: 95000 },
            { date: 'Week 4', count: 185, revenue: 145000 },
            { date: 'Week 5', count: 172, revenue: 132000 },
            { date: 'Week 6', count: 210, revenue: 168000 },
            { date: 'Week 7', count: 195, revenue: 155000 },
            { date: 'Week 8', count: 230, revenue: 185000 }
        ],
        trendObservation: "Sales count and revenue showing strong correlation; Peak in Week 8 driven by Enterprise closings.",
        funnel: {
            stages: [
                { name: 'Leads', value: 5400, color: '#94a3b8' },
                { name: 'Qualified', value: 2100, color: '#6366f1' },
                { name: 'Proposals', value: 850, color: '#8b5cf6' },
                { name: 'Closed Won', value: 1248, color: '#10b981' }
            ],
            signals: [
                { label: 'Largest Drop', value: 'Leads → Qual', metric: '61% Drop', status: 'bad' },
                { label: 'Most Improved', value: 'Prop → Closed', metric: '+5% Conv', status: 'good' },
                { label: 'Overall', value: 'Healthy', metric: 'Top 10%', status: 'neutral' }
            ]
        },
        teamComparison: [
            { team: 'Enterprise', sales: 420, revenue: 450000, conversion: 28 },
            { team: 'SMB', sales: 650, revenue: 220000, conversion: 18 },
            { team: 'Mid-Market', sales: 178, revenue: 172500, conversion: 24 }
        ],
        salesSummary: [
            { id: 1, period: 'Oct 2023', sales: 380, revenue: '$280,000', conversion: '21.5%', notes: '' },
            { id: 2, period: 'Nov 2023', sales: 412, revenue: '$295,000', conversion: '22.1%', notes: 'Black Friday push' },
            { id: 3, period: 'Dec 2023', sales: 456, revenue: '$267,500', conversion: '23.8%', notes: 'End of year' }
        ],
        aiInsights: [
            { tag: 'SALES', title: 'Enterprise team driving 55% of revenue growth', evidence: ['Ent: +22%'], link: '/md/revenue' },
            { tag: 'CONV', title: 'Proposal to Close conversion improved by 5%', evidence: ['Curr: 68%', 'Prev: 63%'], link: '/md/sales' },
            { tag: 'PIPELINE', title: 'Mid-Market pipeline velocity slowed down', evidence: ['Avg: 45d', 'Curr: 52d'], link: '/md/leads' }
        ]
    },
    '/md/leads': {
        kpis: [
            { id: 1, label: 'Total Leads', value: '1,248', change: '+12%', trend: 'up' },
            { id: 2, label: 'Conversion Rate', value: '22%', change: '+1.5%', trend: 'up' },
            { id: 3, label: 'Avg Velocity', value: '14 Days', change: '-2 Days', trend: 'up' }
        ],
        funnel: [
            { name: 'New', value: 500 },
            { name: 'Contacted', value: 350 },
            { name: 'Qualified', value: 250 },
            { name: 'Converted', value: 148 }
        ],
        sourceBreakdown: [
            { name: 'Inbound', value: 60, color: '#6366f1' },
            { name: 'Outbound', value: 30, color: '#8b5cf6' },
            { name: 'Events', value: 10, color: '#ec4899' }
        ],
        teamPerformance: [
            { team: 'Enterprise', new: 120, converted: 30 },
            { team: 'SMB', new: 250, converted: 80 }
        ]
    },
    '/md/clients': {
        kpis: [
            { id: 1, label: 'Total Clients', value: '342', change: '+5%', trend: 'up' },
            { id: 2, label: 'Retention Rate', value: '94%', change: 'Stable', trend: 'neutral' },
            { id: 3, label: 'Avg LTV', value: '$45k', change: '+8%', trend: 'up' }
        ],
        growthTrend: [
            { date: 'Jan', value: 300 }, { date: 'Feb', value: 310 }, { date: 'Mar', value: 315 },
            { date: 'Apr', value: 325 }, { date: 'May', value: 335 }, { date: 'Jun', value: 342 }
        ],
        healthDistribution: [
            { name: 'Healthy', value: 280, color: '#10b981' },
            { name: 'At Risk', value: 45, color: '#f59e0b' },
            { name: 'Churned', value: 17, color: '#ef4444' }
        ]
    },
    '/md/ai-assistant': {
        messages: [
            { id: 1, role: 'system', content: 'Hello! I am your Executive Strategy Assistant. How can I help you analyze the company performance today?' },
            { id: 2, role: 'user', content: 'Show me the top revenue risks.' },
            { id: 3, role: 'system', content: 'Based on the latest monitoring data, the primary risk is a 15% projected liquidity gap due to delayed Enterprise invoices. I recommend reviewing the "Invoice Risk" section in Monitoring.' }
        ],
        suggestedPrompts: [
            'Analyze Q3 Sales Trends',
            'Identify Client Churn Risks',
            'Summarize Team Performance',
            'Explain Revenue Drop'
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
        kpis: [
            { id: 1, code: 'total', label: 'Total Points Distributed', value: '45,200', change: '+8%', trend: 'up' },
            { id: 2, code: 'events', label: 'Points Events', value: '1,240', change: '+12%', trend: 'up' },
            { id: 3, code: 'skew', label: 'Distribution Skew', value: '0.72', change: '-3%', trend: 'down' }
        ],
        distributionByTeam: [
            { team: 'Sales Alpha', points: 15000, share: 33, fill: '#6366f1' },
            { team: 'Sales Bravo', points: 12500, share: 28, fill: '#8b5cf6' },
            { team: 'Support', points: 8000, share: 18, fill: '#a855f7' },
            { team: 'Ops', points: 5200, share: 11, fill: '#c084fc' },
            { team: 'Marketing', points: 2800, share: 6, fill: '#d8b4fe' },
            { team: 'Others', points: 1700, share: 4, fill: '#94a3b8' }
        ],
        summary: {
            topReceiver: 'Sales Alpha',
            topShare: '33%',
            biggestChange: '+22% (Ops)',
            outlierWarning: 'High concentration in Sales Alpha'
        },
        eventDrivers: [
            { id: 1, eventType: 'Deal Closed', totalPoints: 18500, frequency: 245, avgPerEvent: 75, trend: 'up', delta: '+14%' },
            { id: 2, eventType: 'Lead Converted', totalPoints: 8200, frequency: 410, avgPerEvent: 20, trend: 'up', delta: '+8%' },
            { id: 3, eventType: 'Client Upsell', totalPoints: 6800, frequency: 85, avgPerEvent: 80, trend: 'down', delta: '-5%' },
            { id: 4, eventType: 'Support Resolution', totalPoints: 4200, frequency: 280, avgPerEvent: 15, trend: 'flat', delta: '0%' },
            { id: 5, eventType: 'Referral Bonus', totalPoints: 3500, frequency: 70, avgPerEvent: 50, trend: 'up', delta: '+32%' },
            { id: 6, eventType: 'Training Complete', totalPoints: 2100, frequency: 105, avgPerEvent: 20, trend: 'flat', delta: '-1%' },
            { id: 7, eventType: 'QA Pass', totalPoints: 1900, frequency: 45, avgPerEvent: 42, trend: 'down', delta: '-12%' }
        ],
        incentiveSignals: [
            { id: 1, severity: 'High', title: 'Concentration Risk', description: 'Top 10% earning 58% of points.', evidence: ['Conc: 58%', 'Δ +14%'], detected: '1d ago', trend: 'up' },
            { id: 2, severity: 'Medium', title: 'Referral Spike', description: 'Referral bonus frequency 2.4x normal rate.', evidence: ['Spike: 2.4×', 'Freq +32%'], detected: '2d ago', trend: 'up' },
            { id: 3, severity: 'Medium', title: 'Event Frequency Drop', description: 'Client Upsell events declining vs last period.', evidence: ['Upsell: -18%'], detected: '3d ago', trend: 'down' },
            { id: 4, severity: 'Low', title: 'Training Plateau', description: 'Training completion stagnant for 3 weeks.', evidence: ['Flat: 3wk'], detected: '5d ago', trend: 'flat' }
        ],
        distributionTrend: [
            { date: 'Mon', value: 6200 },
            { date: 'Tue', value: 7100 },
            { date: 'Wed', value: 6800 },
            { date: 'Thu', value: 7500 },
            { date: 'Fri', value: 8200 },
            { date: 'Sat', value: 4800 },
            { date: 'Sun', value: 4600 }
        ]
    },
    '/md/ai-assistant': {
        executiveBrief: [
            { id: 1, tag: 'REVENUE', headline: 'Revenue momentum slowing vs last week', explanation: 'Weekly revenue growth decelerated from +12% to +4%. Primary driver appears to be delayed invoice settlements rather than demand contraction.', evidence: ['Revenue: +4% WoW', 'Prior: +12%', 'Invoices: -8%'], link: '/md/revenue' },
            { id: 2, tag: 'RISK', headline: 'Concentration risk in Sales Alpha team', explanation: 'Sales Alpha now represents 42% of total pipeline, up from 35% last month. Dependency on single team performance has increased.', evidence: ['Concentration: 42%', 'Delta: +7pp'], link: '/md/monitoring' },
            { id: 3, tag: 'FINANCE', headline: 'Overdue invoices trending up', explanation: 'Overdue amount increased 22% this period. Three accounts represent 65% of overdue balance.', evidence: ['Overdue: +22%', 'Accounts: 3'], link: '/md/invoices' },
            { id: 4, tag: 'SALES', headline: 'Conversion rate stable despite lead spike', explanation: 'Lead volume increased 18% but conversion held at 22%, indicating sales capacity is absorbing the increase effectively.', evidence: ['Leads: +18%', 'Conv: 22%'], link: '/md/sales' },
            { id: 5, tag: 'RISK', headline: 'Two high-severity alerts require attention', explanation: 'Liquidity gap projection and major account churn signal remain unresolved from previous period.', evidence: ['High Alerts: 2', 'Unresolved'], link: '/md/monitoring' }
        ],
        whatChanged: [
            { metric: 'Total Revenue', previous: '$842k', current: '$876k', delta: '+4%', trend: 'up', link: '/md/revenue' },
            { metric: 'Overdue Invoices', previous: '$37k', current: '$45k', delta: '+22%', trend: 'up', link: '/md/invoices' },
            { metric: 'Conversion Rate', previous: '21%', current: '22%', delta: '+1pp', trend: 'up', link: '/md/sales' },
            { metric: 'Active Alerts', previous: '10', current: '12', delta: '+2', trend: 'up', link: '/md/monitoring' },
            { metric: 'Lead Inflow', previous: '185', current: '218', delta: '+18%', trend: 'up', link: '/md/leads' },
            { metric: 'Client Health Score', previous: '88%', current: '86%', delta: '-2pp', trend: 'down', link: '/md/clients' }
        ],
        interpretations: [
            { id: 1, text: 'Revenue declined 6% week-over-week, primarily driven by a 14% increase in overdue invoices. Sales volume remained stable, suggesting a collection bottleneck rather than demand contraction.', evidence: ['Revenue: -6%', 'Overdue: +14%', 'Sales: Stable'], links: ['/md/revenue', '/md/invoices'] },
            { id: 2, text: 'Lead inflow spiked 18% this period without corresponding increase in sales headcount. Current conversion rate is holding, but sustained volume at this level may require capacity review.', evidence: ['Leads: +18%', 'Conv: 22%', 'Headcount: Same'], links: ['/md/leads', '/md/sales'] },
            { id: 3, text: 'Two high-severity monitoring alerts have persisted for over 48 hours. Both relate to cash flow projections and key account engagement. These represent elevated but manageable risk given current mitigation visibility.', evidence: ['Alerts: 2 High', 'Duration: 48h+'], links: ['/md/monitoring'] }
        ]
    },
    '/teams/my-team': {
        id: 'team-alpha',
        name: 'Sales Team Alpha',
        manager: { id: 101, name: 'Alex Johnson', role: 'Team Manager' },
        tier: 'Tier 1 - Enterprise',
        members: [
            { id: 201, name: 'Sarah Miller', role: 'Senior Executive', performance: 'Top Performer', joined: '2022-03-15' },
            { id: 202, name: 'David Chen', role: 'Sales Executive', performance: 'Consistent', joined: '2023-01-10' },
            { id: 203, name: 'Michael Ross', role: 'Sales Executive', performance: 'Needs Improvement', joined: '2023-06-20' },
            { id: 204, name: 'Emily White', role: 'Junior Executive', performance: 'Ramping Up', joined: '2023-11-01' }
        ],
        hierarchy: {
            'Manager': ['Senior Executive', 'Sales Executive', 'Junior Executive']
        },
        openRoles: 1
    },
    '/team-requests/list': [
        { id: 1, type: 'ADD_MEMBER', target: 'John Doe (Candidate)', status: 'Pending', date: '2024-01-15', notes: 'Replacement for Bob' },
        { id: 2, type: 'ROLE_CHANGE', target: 'Sarah Miller', status: 'Approved', date: '2024-01-10', notes: 'Promote to Team Lead', adminResponse: 'Approved. Effective Feb 1.' },
        { id: 3, type: 'remove_MEMBER', target: 'Michael Ross', status: 'Rejected', date: '2023-12-20', notes: 'Performance issues', adminResponse: 'PIP required first.' }
    ]
};
