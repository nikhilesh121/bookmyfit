'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { CreditCard } from 'lucide-react';
import { api } from '../../lib/api';

type Sub = { id: string; userId: string; planType: string; startDate: string; endDate: string; status: string; amountPaid: number; gymIds?: string[] };

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res: any = await api.get('/subscriptions/all');
      setSubs(Array.isArray(res) ? res : res?.data ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const planColors: Record<string, string> = { individual: '#FF8A00', pro: '#00AFFF', max: '#9B00FF', elite: '#3DFF54' };
  const planStats = Object.fromEntries(
    ['individual', 'pro', 'max', 'elite'].map((p) => [
      p,
      { active: subs.filter((s) => s.planType === p && s.status === 'active').length, revenue: subs.filter((s) => s.planType === p).reduce((a, c) => a + Number(c.amountPaid), 0) },
    ])
  );

  return (
    <Shell title="Subscriptions">
      {loading ? (
        <div className="text-center py-20 text-sm" style={{ color: 'var(--t2)' }}>Loading subscriptions...</div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-8">
            {Object.entries(planStats).map(([plan, stats]) => (
              <div key={plan} className="card stat-glow p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: planColors[plan] } as any} />
                  <span className="text-xs font-semibold capitalize" style={{ color: 'var(--t2)' }}>{plan}</span>
                </div>
                <div className="text-2xl font-bold">{stats.active.toLocaleString()}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--t3)' }}>₹{(stats.revenue / 100000).toFixed(1)}L revenue</div>
              </div>
            ))}
          </div>
          <div className="glass overflow-hidden">
            <table className="glass-table">
              <thead><tr><th>User ID</th><th>Plan</th><th>Status</th><th>Start</th><th>End</th><th>Amount</th></tr></thead>
              <tbody>
                {subs.slice(0, 50).map((s) => (
                  <tr key={s.id}>
                    <td className="font-mono text-xs text-white">{s.userId.slice(0, 8)}...</td>
                    <td><span className="accent-pill capitalize">{s.planType}</span></td>
                    <td><span className={s.status === 'active' ? 'badge-active' : s.status === 'cancelled' ? 'badge-danger' : 'badge-pending'}>{s.status}</span></td>
                    <td>{new Date(s.startDate).toLocaleDateString()}</td>
                    <td>{new Date(s.endDate).toLocaleDateString()}</td>
                    <td>₹{Number(s.amountPaid).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Shell>
  );
}
