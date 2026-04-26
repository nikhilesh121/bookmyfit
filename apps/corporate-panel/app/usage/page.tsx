'use client';
import { useEffect, useState, useMemo } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { Download } from 'lucide-react';

export default function UsagePage() {
  const [checkins, setCheckins] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('This Month');

  useEffect(() => {
    async function load() {
      try {
        const corp = await api.get('/corporate/me');

        const [ci, emps] = await Promise.allSettled([
          api.get('/corporate/me/checkins'),
          corp ? api.get(`/corporate/${corp._id || corp.id}/employees`) : Promise.resolve([]),
        ]);
        if (ci.status === 'fulfilled') {
          setCheckins(Array.isArray(ci.value) ? ci.value : ci.value?.data || []);
        }
        if (emps.status === 'fulfilled') {
          setEmployees(Array.isArray(emps.value) ? emps.value : emps.value?.data || []);
        }
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    return checkins.filter((c: any) => {
      const ts = c.createdAt ? new Date(c.createdAt).getTime() : now;
      const diff = now - ts;
      if (dateFilter === 'This Month' && diff > 30 * 86400000) return false;
      if (dateFilter === 'Last Month' && (diff < 30 * 86400000 || diff > 60 * 86400000)) return false;
      if (dateFilter === 'Last 3 Months' && diff > 90 * 86400000) return false;
      if (deptFilter !== 'All') {
        const dept = c.user?.department || c.department || '';
        if (dept !== deptFilter) return false;
      }
      return true;
    });
  }, [checkins, deptFilter, dateFilter]);

  // Build dept stats from filtered checkins
  const deptStats = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((c: any) => {
      const dept = c.user?.department || c.department || 'Unknown';
      map[dept] = (map[dept] || 0) + 1;
    });
    const max = Math.max(...Object.values(map), 1);
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([dept, count]) => ({ dept, count, pct: Math.round((count / max) * 100) }));
  }, [filtered]);

  const uniqueUsers = new Set(filtered.map((c: any) => c.user?._id || c.user?.id || c.userId)).size;
  const avgPerEmp = uniqueUsers > 0 ? (filtered.length / uniqueUsers).toFixed(1) : '0';

  const depts = ['All', ...Array.from(new Set(checkins.map((c: any) => c.user?.department || c.department).filter(Boolean)))];

  const exportCsv = () => {
    const rows = [['User', 'Gym', 'Date', 'Status']];
    filtered.forEach((c: any) => {
      rows.push([
        c.user?.name || c.userName || '',
        c.gym?.name || c.gymName || '',
        c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : '',
        c.status || '',
      ]);
    });
    const csv = rows.map((r) => r.map((x) => `"${x}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'usage_report.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Shell title="Usage Reports">
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Check-ins', value: loading ? '…' : String(filtered.length) },
          { label: 'Unique Users', value: loading ? '…' : String(uniqueUsers) },
          { label: 'Avg/Employee', value: loading ? '…' : avgPerEmp },
          { label: 'Employees', value: loading ? '…' : String(employees.length) },
        ].map((s) => (
          <div key={s.label} className="card stat-glow p-5">
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--t2)' }}>{s.label}</div>
            <div className="text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-5">
        <select className="glass-input" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          {depts.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select className="glass-input" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
          {['This Month', 'Last Month', 'Last 3 Months', 'All Time'].map((d) => <option key={d}>{d}</option>)}
        </select>
        <button className="btn btn-ghost" onClick={exportCsv}><Download size={14} /> Export CSV</button>
      </div>

      <div className="glass p-6 mb-6">
        <h3 className="serif text-lg mb-4">Department Check-ins</h3>
        {deptStats.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--t2)' }}>No data for selected filters.</p>
        ) : (
          <div className="space-y-3">
            {deptStats.map((d) => (
              <div key={d.dept}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white font-semibold">{d.dept}</span>
                  <span style={{ color: 'var(--t2)' }}>{d.count} check-ins</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: 'var(--surface)' }}>
                  <div className="h-full rounded-full" style={{ width: `${d.pct}%`, background: 'var(--accent)' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass overflow-hidden">
        <div className="p-6 pb-3"><h3 className="serif text-lg">Recent Check-ins</h3></div>
        {loading ? (
          <div className="p-6 text-sm" style={{ color: 'var(--t2)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm" style={{ color: 'var(--t2)' }}>No check-ins for selected period.</div>
        ) : (
          <table className="glass-table">
            <thead><tr><th>User</th><th>Gym</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.slice(0, 20).map((c: any, i: number) => {
                const d = c.createdAt ? new Date(c.createdAt) : null;
                return (
                  <tr key={c._id || c.id || i}>
                    <td className="font-semibold text-white">{c.user?.name || c.userName || '—'}</td>
                    <td>{c.gym?.name || c.gymName || '—'}</td>
                    <td>{d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</td>
                    <td>{d ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}</td>
                    <td><span className={c.status === 'success' || c.status === 'checked_out' ? 'badge-active' : 'badge-danger'}>{c.status || '—'}</span></td>
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
