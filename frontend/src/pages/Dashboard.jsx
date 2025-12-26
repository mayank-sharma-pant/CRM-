import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { format } from 'date-fns';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [todayFollowUps, setTodayFollowUps] = useState([]);
  const [overdueFollowUps, setOverdueFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initial Data Fetch
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
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Combine actions for "Priority Focus" - Overdue first, then Today
  const priorityList = [
    ...overdueFollowUps.map(f => ({ ...f, type: 'overdue' })),
    ...todayFollowUps.map(f => ({ ...f, type: 'today' }))
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 lg:p-10 animate-enter">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* --- TOP BAR: Header & Actions --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Command Center</h1>
            <p className="text-slate-500 text-sm mt-1">Overview of your pipeline and daily priorities</p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              to="/leads"
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg text-sm hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
              View All Leads
            </Link>
            <Link
              to="/leads?action=new"
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg text-sm hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-blue-200"
            >
              + Add New Lead
            </Link>
          </div>
        </div>

        {/* --- ROW 1: Key Metrics (Cards) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Leads"
            value={stats?.totalLeads || 0}
            trend="+12% vs last week"
            trendColor="text-emerald-600"
            icon={<UsersIcon />}
            delay="stagger-1"
          />
          <MetricCard
            label="Closed Deals"
            value={stats?.convertedLeads || 0}
            trend="Needs attention"
            trendColor="text-slate-400"
            icon={<CheckCircleIcon />}
            delay="stagger-2"
          />
          <MetricCard
            label="Conversion Rate"
            value={`${stats?.conversionRate || 0}%`}
            trend="Healthy"
            trendColor="text-emerald-600"
            icon={<TrendingUpIcon />}
            delay="stagger-3"
          />
          <MetricCard
            label="Active Pipeline"
            value={stats?.recentLeads || 0}
            trend="Last 7 days"
            trendColor="text-blue-600"
            icon={<PipelineIcon />}
            delay="stagger-4"
          />
        </div>

        {/* --- MAIN CONTENT ZONES --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* --- ROW 2: Primary Focus (Priorities) [Span 2] --- */}
          <div className="lg:col-span-2 space-y-6">
            <div className="animate-enter stagger-5">
              <div className="dashboard-section-title">
                <h2>Priority Focus</h2>
                <span className="text-xs font-normal text-slate-500 bg-white px-2 py-1 rounded border border-slate-100 shadow-sm">
                  {priorityList.length} Tasks Pending
                </span>
              </div>

              <div className="dashboard-card overflow-hidden">
                {priorityList.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h3 className="text-slate-900 font-medium">All caught up!</h3>
                    <p className="text-slate-500 text-sm mt-1">No pending follow-ups for today.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    <div className="bg-slate-50/50 px-6 py-3 border-b border-slate-100 flex text-xs font-medium text-slate-500 uppercase tracking-wider">
                      <div className="w-1/3">Lead Name</div>
                      <div className="w-1/4">Status</div>
                      <div className="w-1/4">Due</div>
                      <div className="w-1/6 text-right">Action</div>
                    </div>
                    {priorityList.map((item, idx) => (
                      <div key={item.id} className="dashboard-table-row flex items-center px-6 py-4 group">
                        <div className="w-1/3 pr-4">
                          <p className="font-semibold text-slate-900">{item.lead_name}</p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">Contact via Phone</p>
                        </div>
                        <div className="w-1/4">
                          {item.type === 'overdue' ? (
                            <span className="badge badge-red">Overdue</span>
                          ) : (
                            <span className="badge badge-amber">Due Today</span>
                          )}
                        </div>
                        <div className="w-1/4 text-sm text-slate-600 font-medium">
                          {item.type === 'overdue'
                            ? format(new Date(item.scheduled_date), 'MMM d')
                            : (item.scheduled_time || 'All Day')}
                        </div>
                        <div className="w-1/6 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => completeFollowUp(item.id)}
                            className="bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 text-slate-600 px-3 py-1.5 rounded text-xs font-medium shadow-sm transition-all transform hover:-translate-y-0.5"
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
          </div>

          {/* --- SIDE: Secondary Insights [Span 1] --- */}
          <div className="space-y-6">
            <div className="animate-enter stagger-5">
              <div className="dashboard-section-title">
                <h2>Quick Access</h2>
              </div>
              <div className="dashboard-card p-4 space-y-2">
                <Link to="/reports" className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 group cursor-pointer border border-transparent hover:border-slate-100 transition-all">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                      <ChartIcon />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Reports</p>
                      <p className="text-xs text-slate-500">View performance</p>
                    </div>
                  </div>
                  <ChevronRightIcon />
                </Link>

                <Link to="/settings" className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 group cursor-pointer border border-transparent hover:border-slate-100 transition-all">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                      <SettingsIcon />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Settings</p>
                      <p className="text-xs text-slate-500">Manage account</p>
                    </div>
                  </div>
                  <ChevronRightIcon />
                </Link>
              </div>

              <div className="mt-6 dashboard-section-title">
                <h2>Activity Trend</h2>
              </div>
              <div className="dashboard-card p-6">
                <div className="flex items-end space-x-2 h-24 justify-between px-2">
                  {/* Fake Chart Bars for "Visual Quiet" */}
                  <div className="w-full bg-blue-50 rounded-t h-[40%] hover:bg-blue-100 transition-colors"></div>
                  <div className="w-full bg-blue-50 rounded-t h-[70%] hover:bg-blue-100 transition-colors"></div>
                  <div className="w-full bg-blue-50 rounded-t h-[50%] hover:bg-blue-100 transition-colors"></div>
                  <div className="w-full bg-blue-50 rounded-t h-[80%] hover:bg-blue-100 transition-colors"></div>
                  <div className="w-full bg-blue-50 rounded-t h-[60%] hover:bg-blue-100 transition-colors"></div>
                  <div className="w-full bg-blue-600 rounded-t h-[90%] shadow-lg shadow-blue-200"></div>
                  <div className="w-full bg-slate-100 rounded-t h-[30%]"></div>
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-medium uppercase">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span className="text-blue-600">Sat</span>
                  <span>Sun</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// --- Sub Components ---

function MetricCard({ label, value, trend, trendColor, icon, delay }) {
  return (
    <div className={`dashboard-card metric-card animate-enter ${delay}`}>
      <div className="flex justify-between items-start">
        <div className="metric-label">{label}</div>
        <div className="text-slate-300 p-2 bg-slate-50 rounded-lg">
          {icon}
        </div>
      </div>
      <div>
        <div className="metric-value">{value}</div>
        <div className={`text-xs font-medium ${trendColor} flex items-center mt-1`}>
          {trendColor.includes('emerald') && <span className="mr-1">↑</span>}
          {trend}
        </div>
      </div>
    </div>
  );
}

// --- Icons (Simple SVG Wrappers) ---

function UsersIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
}

function CheckCircleIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}

function TrendingUpIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
}

function PipelineIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
}

function ChartIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>;
}

function SettingsIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}

function ChevronRightIcon() {
  return <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;
}


