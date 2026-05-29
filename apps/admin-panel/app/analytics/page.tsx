'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { TrendingUp, Users, UserPlus, Activity } from 'lucide-react';

interface Summary {
  totalRevenue?: number | string;
  revenue?: number | string;
  activeSubscribers?: number | string;
  newSignups?: number | string;
  avgCheckinsPerDay?: number | string;
  topGyms?: { gymId?: string; name?: string; checkins?: number | string; revenue?: number | string; rating?: number | string }[];
  topPlans?: { name?: string; subscribers?: number | string; revenue?: number | string }[];
  monthlyRevenue?: { month: string; amount?: number | string; revenue?: number | string }[];
}

const EMPTY_SUMMARY: Summary = {
  totalRevenue: 0,
  activeSubscribers: 0,
  newSignups: 0,
  avgCheckinsPerDay: 0,
  topGyms: [],
  topPlans: [],
  monthlyRevenue: [],
};

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatRevenue(value: unknown) {
  const amount = toNumber(value);
  if (amount >= 100000) return `Rs ${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `Rs ${(amount / 1000).toFixed(0)}K`;
  return `Rs ${amount}`;
}

function formatCount(value: unknown) {
  return toNumber(value).toLocaleString();
}

function getMonthlyAmount(month: NonNullable<Summary['monthlyRevenue']>[number]) {
  return toNumber(month.amount ?? month.revenue);
}

function getGymName(gym: NonNullable<Summary['topGyms']>[number]) {
  return gym.name || (gym.gymId ? `Gym ${gym.gymId.slice(0, 8)}` : 'Unknown Gym');
}

function formatPlanName(name?: string) {
  return (name || 'Unknown Plan')
    .split(/[_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function AnalyticsPage() {
  const { toast } = useToast();
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/summary')
      .then((d: any) => setSummary(d ?? EMPTY_SUMMARY))
      .catch(() => {
        toast('Failed to load analytics', 'error');
        setSummary(EMPTY_SUMMARY);
      })
      .finally(() => setLoading(false));
  }, [toast]);

  const revenue = summary.totalRevenue ?? summary.revenue ?? 0;
  const subscribers = summary.activeSubscribers ?? 0;
  const signups = summary.newSignups ?? 0;
  const checkins = summary.avgCheckinsPerDay ?? 0;

  const kpis = [
    { label: 'Total Revenue', icon: TrendingUp, value: formatRevenue(revenue), change: '+18%' },
    { label: 'Active Subscribers', icon: Users, value: formatCount(subscribers), change: '+8%' },
    { label: 'New Sign-ups', icon: UserPlus, value: formatCount(signups), change: '+12%' },
    { label: 'Avg Check-ins/Day', icon: Activity, value: formatCount(checkins), change: '+5%' },
  ];

  const monthlyData = summary.monthlyRevenue ?? [];
  const maxRevenue = Math.max(...monthlyData.map(getMonthlyAmount), 1);

  const topGyms = summary.topGyms ?? [];
  const topPlans = summary.topPlans ?? [];

  return (
    <Shell title="Analytics">
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

      <div className="glass p-6 mb-6">
        <h3 className="serif text-lg mb-6">Revenue - Last 6 Months</h3>
        {loading ? (
          <div className="flex items-end gap-2 h-48">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-1 animate-pulse rounded-t" style={{ height: `${60 + i * 15}px`, background: 'var(--surface)' }} />
            ))}
          </div>
        ) : monthlyData.length ? (
          <div className="flex items-end gap-2 h-48">
            {monthlyData.map((b) => {
              const amount = getMonthlyAmount(b);
              const pct = (amount / maxRevenue) * 100;
              return (
                <div key={b.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-xs font-semibold" style={{ color: 'var(--t3)', fontSize: 11 }}>{formatRevenue(amount)}</div>
                  <div className="w-full rounded-t" style={{ height: `${Math.max(pct * 1.6, 8)}px`, background: 'linear-gradient(to top, var(--accent), transparent)', opacity: 0.8, transition: 'height 0.3s' }} />
                  <div className="text-xs font-semibold" style={{ color: 'var(--t2)' }}>{b.month}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center" style={{ color: 'var(--t2)' }}>No revenue data yet</div>
        )}
      </div>

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
              {topGyms.length ? topGyms.map((g, index) => (
                <tr key={g.gymId || `${getGymName(g)}-${index}`}>
                  <td className="font-semibold text-white">{getGymName(g)}</td>
                  <td>{formatCount(g.checkins)}</td>
                  <td>{formatRevenue(g.revenue)}</td>
                  <td style={{ color: 'var(--accent)' }}>{g.rating ?? '--'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} style={{ color: 'var(--t2)', textAlign: 'center' }}>No gym data yet</td>
                </tr>
              )}
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
              {topPlans.length ? topPlans.map((p, index) => (
                <tr key={`${p.name || 'plan'}-${index}`}>
                  <td className="font-semibold text-white">{formatPlanName(p.name)}</td>
                  <td>{formatCount(p.subscribers)}</td>
                  <td>{formatRevenue(p.revenue)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={3} style={{ color: 'var(--t2)', textAlign: 'center' }}>No plan data yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
