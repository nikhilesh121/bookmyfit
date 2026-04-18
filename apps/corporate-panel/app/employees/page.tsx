'use client';
import { useEffect, useState, useMemo } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { X, Download } from 'lucide-react';

const PLANS = ['Pro', 'Max', 'Elite'];
const DEPTS = ['Engineering', 'Sales', 'Operations', 'Marketing', 'HR', 'Finance', 'Other'];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [corporateId, setCorporateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', department: DEPTS[0], plan: PLANS[0] });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const corp = await api.get('/corporate/me');

        if (!corp) return;
        const id = corp._id || corp.id;
        setCorporateId(id);
        const res = await api.get(`/corporate/${id}/employees`);
        const emps = Array.isArray(res) ? res : res?.data || [];
        setEmployees(emps);
      } catch (e: any) {
        toast(e.message || 'Failed to load employees', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    return employees.filter((e: any) => {
      const name = (e.name || e.email || '').toLowerCase();
      const dept = e.department || '';
      const matchSearch = !search || name.includes(search.toLowerCase()) || (e.email || '').toLowerCase().includes(search.toLowerCase());
      const matchDept = deptFilter === 'All' || dept === deptFilter;
      return matchSearch && matchDept;
    });
  }, [employees, search, deptFilter]);

  const addEmployee = async () => {
    if (!corporateId || !form.email) return;
    setSaving(true);
    try {
      const newEmp = await api.post(`/corporate/${corporateId}/employees`, form);
      const emp = newEmp?.employee || newEmp;
      setEmployees((p) => [...p, emp]);
      setShowModal(false);
      setForm({ name: '', email: '', department: DEPTS[0], plan: PLANS[0] });
      toast(`Invite sent to ${form.email}`);
    } catch (e: any) {
      toast(e.message || 'Failed to add employee', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (emp: any) => {
    const id = emp._id || emp.id;
    const newStatus = (emp.status === 'active' || !emp.status) ? 'suspended' : 'active';
    setEmployees((p) => p.map((e: any) => (e._id || e.id) === id ? { ...e, status: newStatus } : e));
    toast(`Employee ${newStatus === 'suspended' ? 'suspended' : 'activated'}`);
    try {
      if (corporateId) await api.put(`/corporate/${corporateId}/employees/${id}`, { status: newStatus });
    } catch {}
  };

  const exportCsv = () => {
    const rows = [['Name', 'Email', 'Department', 'Plan', 'Status']];
    filtered.forEach((e: any) => {
      rows.push([e.name || '', e.email || '', e.department || '', e.plan || '', e.status || 'active']);
    });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'employees.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const depts = ['All', ...Array.from(new Set(employees.map((e: any) => e.department).filter(Boolean)))];

  return (
    <Shell title="Employees">
      <div className="flex items-center gap-3 mb-5">
        <input
          className="glass-input flex-1"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="glass-input"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
        >
          {depts.map((d) => <option key={d}>{d}</option>)}
        </select>
        <button className="btn btn-ghost" onClick={exportCsv}>
          <Download size={14} /> Export CSV
        </button>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Employee</button>
      </div>

      <div className="glass overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: 'var(--t2)' }}>Loading employees…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: 'var(--t2)' }}>No employees found.</div>
        ) : (
          <table className="glass-table">
            <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Plan</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {filtered.map((e: any) => {
                const isActive = !e.status || e.status === 'active';
                return (
                  <tr key={e._id || e.id || e.email}>
                    <td className="font-semibold text-white">{e.name || '—'}</td>
                    <td style={{ color: 'var(--t2)' }}>{e.email}</td>
                    <td>{e.department || '—'}</td>
                    <td><span className="accent-pill">{e.plan || '—'}</span></td>
                    <td><span className={isActive ? 'badge-active' : 'badge-danger'}>{isActive ? 'Active' : 'Suspended'}</span></td>
                    <td>
                      <button
                        className="btn btn-ghost text-xs py-1 px-3"
                        onClick={() => toggleStatus(e)}
                      >
                        {isActive ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="glass p-7 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="serif text-xl">Add Employee</h3>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--t2)' }}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Full Name</label>
                <input className="glass-input w-full" placeholder="Arjun Nair" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Work Email</label>
                <input className="glass-input w-full" type="email" placeholder="employee@company.in" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Department</label>
                <select className="glass-input w-full" value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}>
                  {DEPTS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Plan</label>
                <select className="glass-input w-full" value={form.plan} onChange={(e) => setForm((p) => ({ ...p, plan: e.target.value }))}>
                  {PLANS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn btn-ghost flex-1 justify-center" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary flex-1 justify-center" onClick={addEmployee} disabled={saving || !form.email}>
                {saving ? 'Sending…' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
