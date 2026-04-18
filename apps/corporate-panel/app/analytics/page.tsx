'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [an, ci] = await Promise.allSettled([
        api.get('/analytics/summary'),
        api.get('/checkins'),
      ]);
      if (an.status === 'fulfilled') setAnalytics(an.value);
      if (ci.status === 'fulfilled') {
        setCheckins(Array.isArray(ci.value) ? ci.value : ci.value?.checkins || ci.value?.data || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Dept engagement from checkins
  const deptMap: Record<string, number> = {};
  checkins.forEach((c: any) => {
    const d = c.user?.department || c.department || 'Unknown';
    deptMap[d] = (deptMap[d] || 0) + 1;
  });
  const maxDeptCount = Math.max(...Object.values(deptMap), 1);
  const deptStats = Object.entries(deptMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([dept, count]) => ({ dept, score: Math.round((count / maxDeptCount) * 100) }));

  // Month-over-month from analytics.monthlyRevenue
  const monthly: any[] = analytics?.monthlyRevenue || [];
  const monthTrend = monthly.slice(-6).map((m: any) => ({
    month: m.month || m.name || '',
    active: m.subscribers || m.activeUsers || m.count || 0,
  }));
  const maxMonthly = Math.max(...monthTrend.map((m) => m.active), 1);

  const totalRevenue = analytics?.totalRevenue || 0;
  const activeSubscribers = analytics?.activeSubscribers || analytics?.totalActiveSubscriptions || 0;
  const newSignups = analytics?.newSignups || analytics?.newUsersThisMonth || 0;
  const topDept = deptStats[0]?.dept || '—';

  return (
    <Shell title="Department Analytics">
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Revenue', value: loading ? '…' : `₹${Number(totalRevenue).toLocaleString('en-IN')}` },
          { label: 'Active Subscribers', value: loading ? '…' : String(activeSubscribers) },
          { label: 'New Signups', value: loading ? '…' : String(newSignups) },
          { label: 'Top Department', value: loading ? '…' : topDept },
        ].map((s) => (
          <div key={s.label} className="card stat-glow p-5">
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--t2)' }}>{s.label}</div>
            <div className="text-2xl font-bold truncate">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div className="glass p-6">
          <h3 className="serif text-lg mb-4">Department Engagement</h3>
          {loading ? (
            <p className="text-sm" style={{ color: 'var(--t2)' }}>Loading…</p>
          ) : deptStats.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--t2)' }}>No check-in data available.</p>
          ) : (
            <div className="space-y-3">
              {deptStats.map((d) => (
                <div key={d.dept}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white font-semibold">{d.dept}</span>
                    <span style={{ color: 'var(--accent)' }}>{d.score}%</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'var(--surface)' }}>
                    <div className="h-full rounded-full" style={{ width: `${d.score}%`, background: 'var(--accent)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass p-6">
          <h3 className="serif text-lg mb-4">Month-over-Month Revenue</h3>
          {loading ? (
            <p className="text-sm" style={{ color: 'var(--t2)' }}>Loading…</p>
          ) : monthTrend.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--t2)' }}>No trend data available.</p>
          ) : (
            <div className="space-y-3">
              {monthTrend.map((m) => (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="text-xs w-14 truncate" style={{ color: 'var(--t2)' }}>{m.month}</span>
                  <div className="h-2 rounded-full flex-1" style={{ background: 'var(--surface)' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.round((m.active / maxMonthly) * 100)}%`, background: 'var(--accent)' }} />
                  </div>
                  <span className="text-xs w-20 text-right font-semibold" style={{ color: 'var(--t)' }}>
                    {typeof m.active === 'number' && m.active > 1000 ? `₹${m.active.toLocaleString('en-IN')}` : m.active}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="glass p-6">
        <h3 className="serif text-lg mb-4">Platform Summary</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Revenue', value: `₹${Number(totalRevenue).toLocaleString('en-IN')}` },
            { label: 'Active Subscribers', value: String(activeSubscribers) },
            { label: 'New Users This Month', value: String(newSignups) },
          ].map((s) => (
            <div key={s.label} className="p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--t2)' }}>{s.label}</div>
              <div className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{loading ? '…' : s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
