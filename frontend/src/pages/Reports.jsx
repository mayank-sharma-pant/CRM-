import { useState, useEffect } from 'react';
import api from '../services/api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Professional, "Trust" Palette
const COLORS = {
  primary: '#0f172a', // Slate 900
  secondary: '#64748b', // Slate 500
  accent1: '#0ea5e9', // Sky 500
  accent2: '#10b981', // Emerald 500
  accent3: '#6366f1', // Indigo 500
  accent4: '#f59e0b', // Amber 500
  grid: '#e2e8f0' // Slate 200
};

const PIE_COLORS = [COLORS.accent1, COLORS.accent2, COLORS.accent3, COLORS.accent4, '#ef4444'];

// Custom Hook for CountUp Animation
function useCountUp(end, duration = 2000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime;
    let animationFrame;

    const animate = (time) => {
      if (!startTime) startTime = time;
      const progress = time - startTime;
      const percentage = Math.min(progress / duration, 1);

      // Easing function: easeOutQuart
      const ease = 1 - Math.pow(1 - percentage, 4);

      setCount(Math.floor(end * ease));

      if (progress < duration) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
}

function MetricCard({ label, value, color, suffix = '', prefix = '' }) {
  const animatedValue = useCountUp(value || 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{label}</p>
      <div className={`text-4xl font-bold tracking-tight ${color}`}>
        {prefix}{animatedValue.toLocaleString()}{suffix}
      </div>
    </div>
  );
}

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
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
    <div className="min-h-screen bg-slate-50/50 pb-20 animate-fade-in-up font-sans text-slate-900">

      {/* 1. Header Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Reports</h1>
            <p className="text-slate-500 mt-2 text-lg font-medium">Performance overview and trends</p>
          </div>

          {/* Filters - Segmented Control */}
          <div className="bg-slate-200/50 p-1 rounded-lg inline-flex">
            {['week', 'month'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-6 py-2 rounded-md text-sm font-semibold transition-all duration-200
                  ${period === p
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'}`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Overview Metrics (Trust via Numbers) */}
        <section className="mb-12 animate-staggered-fade" style={{ animationDelay: '100ms' }}>
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-slate-900 rounded-full"></span>
            Key Performance Indicators
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              label="Total Leads"
              value={stats?.totalLeads}
              color="text-slate-900"
            />
            <MetricCard
              label="Converted Leads"
              value={stats?.convertedLeads}
              color="text-emerald-600"
            />
            <MetricCard
              label="Lost Leads"
              value={stats?.lostLeads}
              color="text-rose-600"
            />
            <MetricCard
              label="Conversion Rate"
              value={stats?.conversionRate}
              color="text-indigo-600"
              suffix="%"
            />
          </div>
        </section>

        {/* 3. Primary Trends (The "Story") */}
        <section className="mb-12 animate-staggered-fade" style={{ animationDelay: '200ms' }}>
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-sky-500 rounded-full"></span>
            Growth Trajectory
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
            <div className="mb-8">
              <h3 className="text-xl font-bold text-slate-900">Lead Volume vs. Conversions</h3>
              <p className="text-slate-500 text-sm mt-1">Comparing total incoming leads against successful conversions over time.</p>
            </div>

            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={overviewData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid vertical={false} stroke={COLORS.grid} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: COLORS.secondary, fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: COLORS.secondary, fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line
                  type="monotone"
                  dataKey="leads"
                  name="Total Leads"
                  stroke={COLORS.accent1}
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 8 }}
                  animationDuration={2000}
                />
                <Line
                  type="monotone"
                  dataKey="conversions"
                  name="Conversions"
                  stroke={COLORS.accent2}
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 8 }}
                  animationDuration={2000}
                  animationBegin={500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 4. Secondary Insights (Breakdowns) */}
        <section className="animate-staggered-fade" style={{ animationDelay: '300ms' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Status Breakdown */}
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                Pipeline Health
              </h2>
              <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm h-[400px] flex flex-col">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Leads by Status</h3>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={leadsByStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {leadsByStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Source Breakdown */}
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-amber-500 rounded-full"></span>
                Acquisition Channels
              </h2>
              <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm h-[400px] flex flex-col">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Leads by Source</h3>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leadsBySourceData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid horizontal={false} stroke={COLORS.grid} strokeDasharray="3 3" />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: COLORS.secondary, fontSize: 12, fontWeight: 500 }}
                        width={100}
                      />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar
                        dataKey="value"
                        name="Leads"
                        fill={COLORS.accent1}
                        radius={[0, 4, 4, 0]}
                        barSize={20}
                        animationDuration={1500}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

          </div>
        </section>
      </div>
    </div>
  );
}
