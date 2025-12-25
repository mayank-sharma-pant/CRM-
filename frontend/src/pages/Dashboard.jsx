import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { format } from 'date-fns';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [todayFollowUps, setTodayFollowUps] = useState([]);
  const [overdueFollowUps, setOverdueFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, todayRes, overdueRes] = await Promise.all([
        api.get('/reports/dashboard'),
        api.get('/follow-ups/today'),
        api.get('/follow-ups/overdue'),
      ]);

      setStats(statsRes.data);
      setTodayFollowUps(todayRes.data);
      setOverdueFollowUps(overdueRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const completeFollowUp = async (id) => {
    try {
      await api.put(`/follow-ups/${id}`, { status: 'Completed' });
      fetchDashboardData();
    } catch (error) {
      console.error('Failed to complete follow-up:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Leads</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalLeads || 0}</p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Converted</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats?.convertedLeads || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Conversion Rate</p>
              <p className="text-3xl font-bold text-primary-600 mt-1">
                {stats?.conversionRate || 0}%
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Recent Leads</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.recentLeads || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Last 7 days</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Follow-ups */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Today's Follow-ups</h2>
            <Link to="/follow-ups" className="text-sm text-primary-600 hover:text-primary-700">
              View all
            </Link>
          </div>
          {todayFollowUps.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No follow-ups scheduled for today</p>
          ) : (
            <div className="space-y-3">
              {todayFollowUps.map((followUp) => (
                <div key={followUp.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{followUp.lead_name}</p>
                      <p className="text-sm text-gray-600">
                        {followUp.scheduled_time || 'All day'}
                      </p>
                    </div>
                    <button
                      onClick={() => completeFollowUp(followUp.id)}
                      className="btn btn-primary text-sm"
                    >
                      Complete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overdue Follow-ups */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Overdue Follow-ups</h2>
            <Link to="/follow-ups" className="text-sm text-primary-600 hover:text-primary-700">
              View all
            </Link>
          </div>
          {overdueFollowUps.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No overdue follow-ups</p>
          ) : (
            <div className="space-y-3">
              {overdueFollowUps.map((followUp) => (
                <div key={followUp.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{followUp.lead_name}</p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(followUp.scheduled_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <button
                      onClick={() => completeFollowUp(followUp.id)}
                      className="btn btn-primary text-sm"
                    >
                      Complete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/leads?action=new" className="btn btn-primary text-center">
            Add New Lead
          </Link>
          <Link to="/leads" className="btn btn-secondary text-center">
            View All Leads
          </Link>
          <Link to="/reports" className="btn btn-secondary text-center">
            View Reports
          </Link>
        </div>
      </div>
    </div>
  );
}

