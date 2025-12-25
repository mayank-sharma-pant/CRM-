import { useState, useEffect } from 'react';
import api from '../services/api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Reports() {
  const [stats, setStats] = useState(null);
  const [overview, setOverview] = useState(null);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [period]);

  const fetchReports = async () => {
    try {
      const [statsRes, overviewRes] = await Promise.all([
        api.get('/reports/dashboard'),
        api.get('/reports/overview', { params: { period } }),
      ]);

      setStats(statsRes.data);
      setOverview(overviewRes.data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Prepare chart data
  const leadsByStatusData = stats?.leadsByStatus?.map((item) => ({
    name: item.status,
    value: parseInt(item.count),
  })) || [];

  const leadsBySourceData = stats?.leadsBySource?.map((item) => ({
    name: item.source,
    value: parseInt(item.count),
  })) || [];

  const overviewData = overview?.leadsCreated?.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    leads: parseInt(item.count),
    conversions: overview.conversions?.find((c) => c.date === item.date)?.count || 0,
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">Track your business performance</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setPeriod('week')}
            className={`btn ${period === 'week' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Week
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`btn ${period === 'month' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <p className="text-sm text-gray-600">Total Leads</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalLeads || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Converted</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats?.convertedLeads || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Lost</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{stats?.lostLeads || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Conversion Rate</p>
          <p className="text-3xl font-bold text-primary-600 mt-2">
            {stats?.conversionRate?.toFixed(1) || 0}%
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads Over Time */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Leads Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={overviewData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="leads" stroke="#0ea5e9" name="Leads Created" />
              <Line type="monotone" dataKey="conversions" stroke="#10b981" name="Conversions" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Leads by Status */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Leads by Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={leadsByStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {leadsByStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Leads by Source */}
        {leadsBySourceData.length > 0 && (
          <div className="card lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Leads by Source</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={leadsBySourceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

