'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { TrendingUp, Users, UserPlus, Activity } from 'lucide-react';

interface Summary {
  totalRevenue?: number;
  revenue?: number;
  activeSubscribers?: number;
  newSignups?: number;
  avgCheckinsPerDay?: number;
  topGyms?: { name: string; checkins?: number; revenue?: number; rating?: number | string }[];
  topPlans?: { name: string; subscribers?: number; revenue?: number }[];
  monthlyRevenue?: { month: string; amount: number }[];
}

const EMPTY_SUMMARY: Summary = {
  totalRevenue: 0, activeSubscribers: 0, newSignups: 0, avgCheckinsPerDay: 0,
  topGyms: [], topPlans: [], monthlyRevenue: [],
};

function formatRevenue(v: number) {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v}`;
}

export default function AnalyticsPage() {
  const { toast } = useToast();
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/summary')
      .then((d: any) => setSummary(d ?? EMPTY_SUMMARY))
      .catch(() => { toast('Failed to load analytics', 'error'); setSummary(EMPTY_SUMMARY); })
      .finally(() => setLoading(false));
  }, []);

  const revenue = summary.totalRevenue ?? summary.revenue ?? 0;
  const subscribers = summary.activeSubscribers ?? 0;
  const signups = summary.newSignups ?? 0;
  const checkins = summary.avgCheckinsPerDay ?? 0;

  const kpis = [
    { label: 'Total Revenue', icon: TrendingUp, value: formatRevenue(revenue), change: '+18%' },
    { label: 'Active Subscribers', icon: Users, value: subscribers.toLocaleString(), change: '+8%' },
    { label: 'New Sign-ups', icon: UserPlus, value: signups.toLocaleString(), change: '+12%' },
    { label: 'Avg Check-ins/Day', icon: Activity, value: checkins.toLocaleString(), change: '+5%' },
  ];

  const monthlyData = summary.monthlyRevenue ?? [];
  const maxRevenue = Math.max(...monthlyData.map((m) => m.amount), 1);

  const topGyms = summary.topGyms ?? [];
  const topPlans = summary.topPlans ?? [];

  return (
    <Shell title="Analytics">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-5">
                <div className="animate-pulse h-8 rounded mb-2" style={{ background: 'var(--surface)' }} />
                <div className="animate-pulse h-6 rounded mb-2" style={{ background: 'var(--surface)' }} />
                <div className="animate-pulse h-4 rounded" style={{ background: 'var(--surface)' }} />
              </div>
            ))
          : kpis.map((k) => {
              const Icon = k.icon;
              return (
                <div key={k.label} className="card stat-glow p-5">
                  <div className="flex items-center justify-between mb-2">
                    <Icon size={16} style={{ color: 'var(--accent)' }} />
                    <span className="accent-pill">{k.change}</span>
                  </div>
                  <div className="text-2xl font-bold">{k.value}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--t2)' }}>{k.label}</div>
                </div>
              );
            })}
      </div>

      {/* Revenue Bar Chart */}
      <div className="glass p-6 mb-6">
        <h3 className="serif text-lg mb-6">Revenue - Last 6 Months</h3>
        {loading ? (
          <div className="flex items-end gap-2 h-48">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-1 animate-pulse rounded-t" style={{ height: `${60 + i * 15}px`, background: 'var(--surface)' }} />
            ))}
          </div>
        ) : (
          <div className="flex items-end gap-2 h-48">
            {monthlyData.map((b) => {
              const pct = (b.amount / maxRevenue) * 100;
              return (
                <div key={b.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-xs font-semibold" style={{ color: 'var(--t3)', fontSize: 11 }}>{formatRevenue(b.amount)}</div>
                  <div className="w-full rounded-t" style={{ height: `${Math.max(pct * 1.6, 8)}px`, background: 'linear-gradient(to top, var(--accent), transparent)', opacity: 0.8, transition: 'height 0.3s' }} />
                  <div className="text-xs font-semibold" style={{ color: 'var(--t2)' }}>{b.month}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tables */}
      <div className="grid grid-cols-2 gap-5">
        <div className="glass p-6">
          <h3 className="serif text-lg mb-4">Top Gyms</h3>
          <table className="glass-table">
            <thead>
              <tr>
                <th>Gym Name</th>
                <th>Check-ins</th>
                <th>Revenue</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {topGyms.map((g) => (
                <tr key={g.name}>
                  <td className="font-semibold text-white">{g.name}</td>
                  <td>{(g.checkins ?? 0).toLocaleString()}</td>
                  <td>{typeof g.revenue === 'number' ? formatRevenue(g.revenue) : (g.revenue ?? '--')}</td>
                  <td style={{ color: 'var(--accent)' }}>{g.rating ?? '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="glass p-6">
          <h3 className="serif text-lg mb-4">Top Plans</h3>
          <table className="glass-table">
            <thead>
              <tr>
                <th>Plan Name</th>
                <th>Subscribers</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topPlans.map((p) => (
                <tr key={p.name}>
                  <td className="font-semibold text-white">{p.name}</td>
                  <td>{(p.subscribers ?? 0).toLocaleString()}</td>
                  <td>{typeof p.revenue === 'number' ? formatRevenue(p.revenue) : (p.revenue ?? '--')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
