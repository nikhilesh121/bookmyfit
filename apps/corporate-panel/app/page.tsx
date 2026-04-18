'use client';
import { useEffect, useState } from 'react';
import Shell from '../components/Shell';
import { api, getUser } from '../lib/api';
import { Users, CheckCircle, TrendingUp, Briefcase, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function CorporateDashboard() {
  const [corporate, setCorporate] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const corp = await api.get('/corporate/me');
        setCorporate(corp);

        if (corp) {
          const id = corp._id || corp.id;
          const [emps, ci] = await Promise.allSettled([
            api.get(`/corporate/${id}/employees?limit=200`),
            api.get('/checkins/my-history?limit=10'),
          ]);
          if (emps.status === 'fulfilled') {
            const empList = Array.isArray(emps.value) ? emps.value : emps.value?.data || [];
            setEmployees(empList);
          }
          if (ci.status === 'fulfilled') {
            const ciList = Array.isArray(ci.value) ? ci.value : ci.value?.data || [];
            setCheckins(ciList);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalSeats = corporate?.totalSeats || corporate?.seats || 0;
  const activeEmps = employees.filter((e: any) => e.status !== 'suspended' && e.status !== 'inactive').length;
  const assigned = employees.length;
  const available = Math.max(0, totalSeats - assigned);
  const perSeat = 1500;
  const monthlyCost = `₹${(assigned * perSeat).toLocaleString('en-IN')}`;

  const recentCheckins = checkins.slice(0, 5);

  const stats = [
    { label: 'Total Seats', value: loading ? '…' : String(totalSeats), icon: Users },
    { label: 'Assigned', value: loading ? '…' : String(assigned), icon: CheckCircle },
    { label: 'Available', value: loading ? '…' : String(available), icon: TrendingUp },
    { label: 'Monthly Cost', value: loading ? '…' : monthlyCost, icon: Briefcase },
  ];

  const utilPct = totalSeats > 0 ? Math.round((assigned / totalSeats) * 100) : 0;

  return (
    <Shell title="Dashboard">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card stat-glow p-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)' }}>
                <Icon size={16} style={{ color: 'var(--accent)' }} />
              </div>
              <div className="text-2xl font-bold tracking-tight">{s.value}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--t2)' }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="glass p-6">
          <h3 className="serif text-lg mb-4">Seat Utilization</h3>
          <div className="text-3xl font-bold mb-2" style={{ color: 'var(--accent)' }}>{utilPct}%</div>
          <div className="h-2 rounded-full" style={{ background: 'var(--surface)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${utilPct}%`, background: 'var(--accent)' }} />
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--t2)' }}>{assigned} of {totalSeats} seats assigned</p>
        </div>

        <div className="glass p-6">
          <h3 className="serif text-lg mb-4">Active Employees</h3>
          <div className="text-3xl font-bold mb-2" style={{ color: 'var(--accent)' }}>{loading ? '…' : activeEmps}</div>
          <p className="text-xs" style={{ color: 'var(--t2)' }}>employees with active status</p>
          <div className="flex gap-3 mt-4">
            <Link href="/employees" className="btn btn-primary text-xs">
              Manage Employees <ArrowRight size={12} />
            </Link>
            <Link href="/assign" className="btn btn-ghost text-xs">Assign Plans</Link>
          </div>
        </div>
      </div>

      <div className="glass overflow-hidden">
        <div className="flex items-center justify-between p-6 pb-3">
          <h3 className="serif text-lg">Recent Check-ins</h3>
          <Link href="/usage" className="text-xs" style={{ color: 'var(--accent)' }}>View all</Link>
        </div>
        {loading ? (
          <div className="p-6 text-sm" style={{ color: 'var(--t2)' }}>Loading…</div>
        ) : recentCheckins.length === 0 ? (
          <div className="p-6 text-sm" style={{ color: 'var(--t2)' }}>No check-ins found.</div>
        ) : (
          <table className="glass-table">
            <thead><tr><th>User</th><th>Gym</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {recentCheckins.map((c: any, i: number) => {
                const userName = c.user?.name || c.userName || c.memberName || '—';
                const gymName = c.gym?.name || c.gymName || '—';
                const date = c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
                const status = c.status || 'success';
                return (
                  <tr key={c._id || c.id || i}>
                    <td className="font-semibold text-white">{userName}</td>
                    <td>{gymName}</td>
                    <td>{date}</td>
                    <td><span className={status === 'success' || status === 'checked_out' ? 'badge-active' : 'badge-danger'}>{status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Shell>
  );
}
