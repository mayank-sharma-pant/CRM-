import axios from 'axios';
import { MOCK_DATA } from './mockData';

// --- MOCK MODE CONFIGURATION ---
// Set this to true to use mock data instead of real backend
const USE_MOCK_BACKEND = false;  // Changed to false to use real backend
// -------------------------------

// Backend API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available (only in browser)
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('token');
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
}

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Mock Interceptor
if (USE_MOCK_BACKEND) {
  // Simple in-memory store for the session
  let mockLeads = [...(MOCK_DATA['/leads'] || [])];

  const originalGet = api.get;
  api.get = async (url, config) => {
    // Detect Context (Simulating Backend Token/Role Scope)
    const isManagerContext = typeof window !== 'undefined' && window.location.pathname.startsWith('/manager');

    // 1. Handle Leads List
    if (url === '/leads') {
      console.log(`[MOCK] GET /leads (Context: ${isManagerContext ? 'Manager/Team' : 'Sales/Personal'})`);

      let responseData = mockLeads;

      if (isManagerContext) {
        // GENERATE TEAM DATA (Simulated)
        // If we haven't generated team data yet, let's fake a larger dataset
        if (mockLeads.length < 200) {
          const teamLeads = Array.from({ length: 350 }).map((_, i) => {
            const statusPool = ['New', 'Contacted', 'Qualified', 'Converted', 'Lost'];
            const status = statusPool[Math.floor(Math.random() * statusPool.length)];

            // Random dates for signal logic
            const now = Date.now();
            const day = 86400000;
            let next_task = null;
            let last_contacted_at = null;

            if (status === 'Qualified') {
              next_task = Math.random() > 0.5 ? new Date(now - day).toISOString() : new Date(now + day).toISOString(); // Some overdue
            }
            if (status === 'Contacted') {
              last_contacted_at = new Date(now - (Math.floor(Math.random() * 5) * day)).toISOString();
            }

            return {
              id: 2000 + i,
              name: `Team Lead ${i + 1}`,
              company: `Company ${i + 1}`,
              status,
              value: Math.floor(Math.random() * 10000),
              created_at: new Date(now - (Math.floor(Math.random() * 30) * day)).toISOString(),
              last_contacted_at,
              next_task,
              last_response_at: Math.random() > 0.8 ? new Date(now - day).toISOString() : null
            };
          });
          // We don't overwrite mockLeads permanently to avoid messing up the sales view logic for this demo, 
          // but normally the backend queries DB.
          // For this mock, let's just RETURN the big array.
          responseData = teamLeads;
        }
      }

      return new Promise(resolve => setTimeout(() => resolve({ data: responseData, status: 200 }), 400));
    }

    // 2. Handle Dashboard Priorities (Short List)
    if (url === '/tasks') {
      console.log(`[MOCK] GET /tasks (Context: ${isManagerContext ? 'Manager/Team' : 'Sales/Personal'})`);

      let tasks = [];
      if (isManagerContext) {
        // MANAGER SIGNALS
        const yesterday = new Date(Date.now() - 86400000).toISOString();
        const today = new Date().toISOString();

        tasks = [
          {
            id: 901,
            title: '4 high-value deals stalled in negotiation stage',
            dueDate: yesterday, // Triggers Red "Overdue" Badge
            status: 'Pending'
          },
          {
            id: 903,
            title: '3 tasks overdue across Sales Team A',
            dueDate: yesterday, // Triggers Red "Overdue" Badge
            status: 'Pending'
          },
          {
            id: 905,
            title: 'Uneven lead distribution detected across team',
            dueDate: today, // Triggers Amber "Due Today" Badge
            status: 'Pending'
          },
          {
            id: 907,
            title: 'Client escalation pending: Acme Corp',
            dueDate: yesterday, // Triggers Red "Overdue" Badge
            status: 'Pending'
          }
        ];
      } else {
        // SALES PRIORITIES (Default)
        tasks = [
          { id: 101, title: 'Finalize contract with Acme Corp', dueDate: new Date().toISOString(), status: 'Pending' },
          { id: 102, title: 'Follow up on missing requirements', dueDate: new Date(Date.now() - 86400000).toISOString(), status: 'Pending' },
          { id: 103, title: 'Schedule demo for Q3 prospects', dueDate: new Date().toISOString(), status: 'Pending' },
        ];
      }
      return new Promise(resolve => setTimeout(() => resolve({ data: tasks, status: 200 }), 400));
    }

    // 2b. Handle Full Task List (The Tasks Page)
    if (url === '/tasks/list') {
      console.log(`[MOCK] GET /tasks/list (Context: ${isManagerContext ? 'Manager/Team' : 'Sales/Personal'})`);

      let tasksList = [];
      if (isManagerContext) {
        // MANAGER / TEAM TASKS
        tasksList = [
          { id: 2001, title: 'Q3 Sales Strategy Execution', assignee: 'Team', dueDate: 'Tomorrow', status: 'In Progress', priority: 'High', type: 'Project', entity: 'Sales Team', entityType: 'System', assignedBy: 'self' }, // Parent
          { id: 2002, title: 'Finalize Pricing Model', assignee: 'Sarah Miller', dueDate: 'Yesterday', status: 'Completed', priority: 'High', parentId: 2001, isChild: true, entity: 'Acme Corp', entityType: 'Client', assignedBy: 'manager' },
          { id: 2003, title: 'Draft Outreach Scripts', assignee: 'David Chen', dueDate: 'Today', status: 'Pending', priority: 'Medium', parentId: 2001, isChild: true, entity: 'TechStart', entityType: 'Lead', assignedBy: 'manager' },
          { id: 2004, title: 'Team Performance Reviews', assignee: 'Manager', dueDate: 'Fri, Jan 12', status: 'Pending', priority: 'High', entity: 'Internal', entityType: 'System', assignedBy: 'self' },
          { id: 2005, title: 'Resolve Escalation: Acme Corp', assignee: 'Michael Ross', dueDate: '2 days ago', status: 'Pending', priority: 'Critical', entity: 'Acme Corp', entityType: 'Client', assignedBy: 'self' },
          { id: 2006, title: 'Update DRM Records', assignee: 'Emily White', dueDate: 'Oct 20', status: 'In Progress', priority: 'Low', entity: 'System', entityType: 'System', assignedBy: 'self' }
        ];
      } else {
        // SALES PERSONAL TASKS - MATCHING ORIGINAL MOCK DATA STRUCTURE
        // The component expects: { id, title, entity, entityType, assignedBy, dueDate, isParent/isChild }
        tasksList = [
          { id: 1, title: 'Finalize contract agreement', entity: 'Acme Corp', entityType: 'Client', assignedBy: 'manager', dueDate: 'Yesterday', isParent: true },
          { id: 2, title: 'Upload signed NDA', entity: 'Acme Corp', entityType: 'Client', assignedBy: 'self', dueDate: 'Yesterday', isChild: true },
          { id: 3, title: 'Follow up on missing requirements', entity: 'John Doe', entityType: 'Lead', assignedBy: 'self', dueDate: '2 days ago' },
          { id: 4, title: 'Prepare Q3 presentation draft', entity: 'Internal', entityType: 'System', assignedBy: 'manager', dueDate: '10:00 AM' },
          { id: 5, title: 'Call Sarah about renewal', entity: 'TechStart Inc', entityType: 'Client', assignedBy: 'self', dueDate: '2:00 PM' },
          { id: 6, title: 'Send invoice #4022', entity: 'Global Solutions', entityType: 'Client', assignedBy: 'self', dueDate: '4:30 PM' },
          { id: 7, title: 'Update CRM contact details', entity: 'New Logistics', entityType: 'Lead', assignedBy: 'self', dueDate: '5:00 PM' },
          { id: 8, title: 'Weekly Pipeline Review', entity: 'Sales Team', entityType: 'System', assignedBy: 'manager', dueDate: 'Tomorrow', isParent: true },
          { id: 9, title: 'Update personal metrics', entity: 'Sales Team', entityType: 'System', assignedBy: 'manager', dueDate: 'Tomorrow', isChild: true },
          { id: 10, title: 'Lunch with potential partner', entity: 'City Bistro', entityType: 'Event', assignedBy: 'self', dueDate: 'Fri, Jan 12' },
        ];
      }
      return new Promise(resolve => setTimeout(() => resolve({ data: tasksList, status: 200 }), 500));
    }

    // 3. Handle specific keys
    const mockKey = Object.keys(MOCK_DATA).find(key => url.includes(key) && key !== '/leads');
    if (mockKey) {
      console.log(`[MOCK] Serving ${url}`);
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({ data: MOCK_DATA[mockKey], status: 200 });
        }, 400);
      });
    }
    return originalGet(url, config);
  };

  // Mock POST (Create)
  const originalPost = api.post;
  api.post = async (url, data, config) => {
    if (url === '/leads') {
      console.log('[MOCK] POST /leads', data);
      const newLead = { id: Date.now(), ...data, created_at: new Date().toISOString() };
      mockLeads = [newLead, ...mockLeads];
      return new Promise(resolve => setTimeout(() => resolve({ data: newLead, status: 201 }), 600));
    }
    return originalPost(url, data, config);
  };

  // Mock DELETE (Delete)
  const originalDelete = api.delete;
  api.delete = async (url, config) => {
    if (url.startsWith('/leads/')) {
      const id = url.split('/').pop();
      console.log(`[MOCK] DELETE /leads/${id}`);
      mockLeads = mockLeads.filter(l => l.id != id); // loose comparison for string/number id
      return new Promise(resolve => setTimeout(() => resolve({ data: { success: true }, status: 200 }), 400));
    }
    return originalDelete(url, config);
  };

  // Mock PUT (Update)
  const originalPut = api.put;
  api.put = async (url, data, config) => {
    console.log(`[MOCK] PUT ${url}`, data);
    return new Promise(resolve => setTimeout(() => resolve({ data: { success: true } }), 300));
  };
}

export default api;

