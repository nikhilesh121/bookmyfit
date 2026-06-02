'use client';
import { useCallback, useEffect, useState } from 'react';
import Shell from '../../../components/Shell';
import { api } from '../../../lib/api';
import { Users, TrendingUp, Activity, Download, Search } from 'lucide-react';

type Employee = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  employeeCode?: string;
  department?: string;
  checkinCount?: number;
  lastCheckin?: string;
  status?: string;
  corporate?: { companyName?: string };
};

function normalizePage(payload: any) {
  const data = Array.isArray(payload) ? payload : payload?.data || [];
  return {
    data,
    total: Number(payload?.total ?? data.length),
    pages: Number(payload?.pages ?? 1),
  };
}

function fmt(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CorporateEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const first = normalizePage(await api.get('/corporate/employees?page=1&limit=100'));
      const rest = await Promise.all(
        Array.from({ length: first.pages - 1 }, (_, index) =>
          api.get(`/corporate/employees?page=${index + 2}&limit=100`).then(normalizePage)
        )
      );
      const all: Employee[] = [first, ...rest].flatMap((employeePage) => employeePage.data);
      setEmployees(all);
    } catch {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const companies = [...new Set(employees.map((e) => e.corporate?.companyName).filter(Boolean))];

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch = !q || [e.name, e.email, e.phone, e.employeeCode]
      .some((value) => String(value || '').toLowerCase().includes(q));
    const matchCompany = !companyFilter || e.corporate?.companyName === companyFilter;
    return matchSearch && matchCompany;
  });

  const totalCheckins = filtered.reduce((s, e) => s + (e.checkinCount || 0), 0);
  const activeCount = filtered.filter((e) => e.status !== 'suspended' && e.status !== 'inactive').length;
  const avgCheckins = filtered.length ? (totalCheckins / filtered.length).toFixed(1) : '—';

  const exportCsv = () => {
    const rows = [['Name', 'Company', 'Email', 'Phone', 'Employee Code', 'Department', 'Check-ins', 'Last Visit', 'Status']];
    filtered.forEach((employee) => rows.push([
      employee.name || '',
      employee.corporate?.companyName || '',
      employee.email || '',
      employee.phone || '',
      employee.employeeCode || '',
      employee.department || '',
      String(employee.checkinCount ?? 0),
      employee.lastCheckin ? new Date(employee.lastCheckin).toLocaleString('en-IN') : '',
      employee.status || 'active',
    ]));
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'corporate-employees.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Shell title="Corporate Employees">
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Employees', value: loading ? '…' : filtered.length.toLocaleString(), icon: Users },
          { label: 'Active This Month', value: loading ? '…' : activeCount.toLocaleString(), icon: Activity },
          { label: 'Avg Check-ins / User', value: loading ? '…' : avgCheckins, icon: TrendingUp },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card stat-glow p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
                  <Icon size={14} style={{ color: 'var(--accent)' }} />
                </div>
              </div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--t2)' }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 glass-input flex-1" style={{ padding: '0 14px', minWidth: 200 }}>
          <Search size={14} style={{ color: 'var(--t3)' }} />
          <input
            className="bg-transparent outline-none text-sm w-full"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ color: 'var(--t)', padding: '10px 0' }}
          />
        </div>
        <select
          className="glass-input"
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
        >
          <option value="">All Companies</option>
          {companies.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="btn btn-ghost" onClick={exportCsv} disabled={loading || filtered.length === 0}>
          <Download size={14} /> Export
        </button>
      </div>

      {loading ? (
        <div className="glass p-8 text-center text-sm" style={{ color: 'var(--t2)' }}>Loading employees…</div>
      ) : filtered.length === 0 ? (
        <div className="glass p-12 text-center">
          <Users size={36} className="mx-auto mb-3" style={{ color: 'var(--t3)' }} />
          <p className="text-sm" style={{ color: 'var(--t2)' }}>No employees found{search ? ' for this search' : ''}.</p>
        </div>
      ) : (
        <div className="glass overflow-hidden">
          <table className="glass-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Email</th>
                <th>Department</th>
                <th>Phone</th>
                <th>Check-ins</th>
                <th>Last Visit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td className="font-semibold" style={{ color: '#fff' }}>
                    {e.name || '—'}
                  </td>
                  <td style={{ color: 'var(--t2)' }}>{e.corporate?.companyName || '—'}</td>
                  <td style={{ color: 'var(--t2)', fontSize: 12 }}>{e.email || '—'}</td>
                  <td>{e.department || '—'}</td>
                  <td style={{ color: 'var(--t2)', fontSize: 12 }}>{e.phone || '--'}</td>
                  <td>{e.checkinCount ?? 0}</td>
                  <td style={{ color: 'var(--t2)', fontSize: 12 }}>{fmt(e.lastCheckin)}</td>
                  <td>
                    <span className={
                      e.status === 'active' || !e.status ? 'badge-active' :
                      e.status === 'suspended' ? 'badge-danger' : 'badge-pending'
                    }>
                      {e.status || 'active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
