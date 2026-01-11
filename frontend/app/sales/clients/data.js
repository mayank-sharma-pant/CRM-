import {
    History,
    CheckSquare,
    FileText,
    User,
    Mail,
    Phone,
    MapPin,
    Building,
    Calendar,
    ArrowLeft,
    MoreHorizontal,
    Plus,
    ChevronDown,
    ChevronRight,
    Briefcase
} from 'lucide-react';

export const CLIENTS_DATA = [
    {
        id: 101,
        name: 'Robert Taylor',
        title: 'Operations Director',
        company: 'BigBank International',
        status: 'Active',
        email: 'robert.taylor@bigbank.com',
        phone: '+1 (555) 0123-4567',
        address: '1200 Financial District Blvd, New York, NY',
        industry: 'Banking & Finance',
        source: 'Converted from Lead (Q4 Campaign)',
        internal_id: 'BB-2024-001',
        since: 'Dec 12, 2024',
        owner: 'Alex Johnson (You)',
        last_activity: 'Quarterly review scheduled for next week.',
        last_interaction_at: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago

        // MOCK PERMISSIONS (Sales View Default)
        permissions: {
            canEdit: true,
            canAddNote: true,
            canCreateTask: true
        },

        timeline: [
            { id: 1, type: 'status', label: 'Client is now Active', timestamp: '2 days ago', icon: History },
            { id: 2, type: 'task', label: 'Completed: Initial Onboarding Call', timestamp: '3 days ago', icon: CheckSquare },
            { id: 3, type: 'note', label: 'Note: Interested in API integration for Q2.', timestamp: '5 days ago', icon: FileText },
            { id: 4, type: 'conversion', label: 'Converted from Lead', timestamp: 'Dec 12, 2024', icon: User },
            { id: 5, type: 'email', label: 'Email: Contract signed and returned', timestamp: 'Dec 11, 2024', icon: Mail },
        ],

        tasks: [
            { id: 101, title: 'Prepare Q3 Review Deck', status: 'Open', due: 'Tomorrow', priority: 'High' },
            { id: 102, title: 'Schedule Technical Deep Dive', status: 'Open', due: 'Next Week', priority: 'Normal' },
            { id: 103, title: 'Send Welcome Kit', status: 'Completed', due: 'Dec 15', priority: 'Low' },
        ],

        notes: [
            { id: 201, content: 'Mentioned they are expanding their mobile team. Potential upsell opportunity for "Mobile SDK" module in Q3.', date: 'Dec 14, 2024', author: 'Alex Johnson' },
            { id: 202, content: 'Technical contact is Sarah Jenkins (CTO). Prefer email updates.', date: 'Dec 12, 2024', author: 'Alex Johnson' },
        ]
    },
    {
        id: 102,
        name: 'Elena Rodriguez',
        title: 'CTO',
        company: 'Solaris Systems',
        status: 'Active',
        email: 'elena.r@solaris.tech',
        phone: '+1 (555) 9876-5432',
        address: '450 Innovation Dr, San Francisco, CA',
        industry: 'Technology',
        source: 'Converted from Lead',
        internal_id: 'SS-2024-042',
        since: 'Nov 05, 2024',
        owner: 'Alex Johnson (You)',
        last_activity: 'Sent updated contract proposal.',
        last_interaction_at: new Date(Date.now() - 86400000 * 5).toISOString(),

        timeline: [
            { id: 1, type: 'email', label: 'Sent updated contract proposal', timestamp: '5 days ago', icon: Mail },
            { id: 2, type: 'status', label: 'Upgraded to Enterprise Plan', timestamp: '1 week ago', icon: History },
        ],

        tasks: [
            { id: 201, title: 'Follow up on contract', status: 'Open', due: 'Today', priority: 'High' },
        ],

        notes: [
            { id: 301, content: 'Needs SLA details for the legal team.', date: 'Jan 02, 2025', author: 'Alex Johnson' },
        ]
    },
    {
        id: 103,
        name: 'Marcus Chen',
        title: 'VP of Engineering',
        company: 'Future Net',
        status: 'Active',
        email: 'marcus.chen@futurenet.io',
        phone: '+1 (555) 4567-8901',
        address: '88 Tech Park, Austin, TX',
        industry: 'Telecommunications',
        source: 'Direct Account',
        internal_id: 'FN-2024-108',
        since: 'Oct 20, 2024',
        owner: 'Alex Johnson (You)',
        last_activity: 'Discussed expansion plans for Q3.',
        last_interaction_at: new Date(Date.now() - 86400000 * 12).toISOString(),

        timeline: [
            { id: 1, type: 'call', label: 'Quarterly Strategy Call', timestamp: '12 days ago', icon: Phone },
        ],

        tasks: [
            { id: 301, title: 'Draft Expansion Proposal', status: 'Open', due: 'Next Month', priority: 'Normal' },
        ],

        notes: []
    },
    {
        id: 104,
        name: 'Sarah Jenkins',
        title: 'Procurement Manager',
        company: 'Lawson & Partners',
        status: 'Active',
        email: 'sarah.j@lawson.com',
        phone: '+1 (555) 2222-3333',
        address: '10 Legal Ave, Chicago, IL',
        industry: 'Legal Services',
        source: 'Referral',
        internal_id: 'LP-2024-201',
        since: 'Sep 15, 2024',
        owner: 'Alex Johnson (You)',
        last_activity: 'Resolved billing inquiry #4492.',
        last_interaction_at: new Date(Date.now() - 86400000 * 20).toISOString(),

        timeline: [],
        tasks: [],
        notes: []
    },
    {
        id: 105,
        name: 'David Kim',
        title: 'IT Director',
        company: 'Orbital Tech',
        status: 'Active',
        email: 'david.kim@orbital.com',
        phone: '+1 (555) 7777-8888',
        address: '200 Space Way, Houston, TX',
        industry: 'Aerospace',
        source: 'Converted from Lead',
        internal_id: 'OT-2024-005',
        since: 'Aug 01, 2024',
        owner: 'Alex Johnson (You)',
        last_activity: 'Onboarding completed successfully.',
        last_interaction_at: new Date(Date.now() - 86400000 * 60).toISOString(),

        timeline: [],
        tasks: [],
        notes: []
    }
];
