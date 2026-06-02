'use client';
import { useEffect, useMemo, useState } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { loadCorporateWithEmployees } from '../../lib/corporate';
import { useToast } from '../../components/Toast';
import { X, Download, Pencil, Trash2 } from 'lucide-react';

const DEPTS = ['Engineering', 'Sales', 'Operations', 'Marketing', 'HR', 'Finance', 'Other'];
const EMPTY_FORM = { name: '', email: '', phone: '', employeeCode: '', department: DEPTS[0] };

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [account, setAccount] = useState<any>(null);
  const [corporateId, setCorporateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const { corporate: corp, employees: employeeList } = await loadCorporateWithEmployees();
      if (!corp) {
        setAccount(null);
        setEmployees([]);
        return;
      }
      setAccount(corp);
      const id = corp._id || corp.id;
      setCorporateId(id);
      setEmployees(employeeList);
    } catch (e: any) {
      toast(e.message || 'Failed to load employees', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => employees.filter((e: any) => {
    const q = search.toLowerCase();
    const matchSearch = !q || [e.name, e.email, e.phone, e.employeeCode].some((value) => String(value || '').toLowerCase().includes(q));
    const matchDept = deptFilter === 'All' || e.department === deptFilter;
    return matchSearch && matchDept;
  }), [employees, search, deptFilter]);

  const totalSeats = Number(account?.totalSeats || 0);
  const activeEmployees = employees.filter((employee: any) => !employee.status || employee.status === 'active').length;
  const assignedSeats = Number(account?.assignedSeats ?? activeEmployees);
  const availableSeats = Math.max(0, totalSeats - Math.max(assignedSeats, activeEmployees));
  const canUseSeats = Boolean(account?.isActive) && ['active', 'trial'].includes(String(account?.billingStatus || 'active'));
  const depts = ['All', ...Array.from(new Set(employees.map((e: any) => e.department).filter(Boolean)))];

  const addEmployee = async () => {
    if (!corporateId || !form.phone.trim()) {
      toast('Phone number is required for app OTP login', 'error');
      return;
    }
    setSaving(true);
    try {
      const emp = await api.post(`/corporate/${corporateId}/employees`, form);
      toast(emp?.email ? `Invite sent to ${emp.email}` : 'Employee added');
      setForm(EMPTY_FORM);
      setShowModal(false);
      await load();
    } catch (e: any) {
      toast(e.message || 'Failed to add employee', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!corporateId || !editing) return;
    setSaving(true);
    try {
      await api.put(`/corporate/${corporateId}/employees/${editing.id}`, {
        name: editing.name,
        email: editing.email,
        phone: editing.phone,
        employeeCode: editing.employeeCode,
        department: editing.department,
        status: editing.status,
      });
      toast('Employee updated');
      setEditing(null);
      await load();
    } catch (e: any) {
      toast(e.message || 'Failed to update employee', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (emp: any) => {
    if (!corporateId) return;
    const id = emp._id || emp.id;
    const nextStatus = (emp.status === 'active' || !emp.status) ? 'suspended' : 'active';
    try {
      await api.put(`/corporate/${corporateId}/employees/${id}`, { status: nextStatus });
      toast(nextStatus === 'active' ? 'Employee activated' : 'Employee suspended');
      await load();
    } catch (e: any) {
      toast(e.message || 'Status update failed', 'error');
    }
  };

  const removeEmployee = async (emp: any) => {
    if (!corporateId || !confirm('Remove this employee and release the seat?')) return;
    try {
      await api.post(`/corporate/${corporateId}/employees/${emp.id}/remove`, {});
      toast('Employee removed and seat released');
      await load();
    } catch (e: any) {
      toast(e.message || 'Failed to remove employee', 'error');
    }
  };

  const exportCsv = () => {
    const rows = [['Name', 'Email', 'Phone', 'Employee Code', 'Department', 'Plan', 'Status']];
    filtered.forEach((e: any) => rows.push([e.name || '', e.email || '', e.phone || '', e.employeeCode || '', e.department || '', e.plan || 'Corporate Multi-Gym', e.status || 'active']));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employees.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Shell title="Employees">
      <div className="glass p-4 mb-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="kicker">Seat Allocation</div>
          <div className="text-sm" style={{ color: 'var(--t2)' }}>
            {!canUseSeats
              ? `Employee access is blocked until account approval and billing are active. Current billing: ${account?.billingStatus || 'pending'}`
              : totalSeats > 0
                ? `${Math.max(assignedSeats, activeEmployees)} of ${totalSeats} seats assigned`
                : 'No seats assigned yet. Ask admin to allocate seats before adding employees.'}
          </div>
        </div>
        <div className="accent-pill">{availableSeats} available</div>
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <input className="glass-input flex-1" style={{ minWidth: 260 }} placeholder="Search by name, phone, email or code..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="glass-input" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          {depts.map((d) => <option key={d}>{d}</option>)}
        </select>
        <button className="btn btn-ghost" onClick={exportCsv}><Download size={14} /> Export CSV</button>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} disabled={!canUseSeats || totalSeats <= 0 || availableSeats <= 0}>+ Add Employee</button>
      </div>

      <div className="glass overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: 'var(--t2)' }}>Loading employees...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: 'var(--t2)' }}>No employees found.</div>
        ) : (
          <table className="glass-table">
            <thead><tr><th>Name</th><th>Login Phone</th><th>Email</th><th>Department</th><th>Plan</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {filtered.map((e: any) => {
                const isActive = !e.status || e.status === 'active';
                return (
                  <tr key={e._id || e.id || e.email || e.phone}>
                    <td>
                      <div className="font-semibold text-white">{e.name || 'Unnamed employee'}</div>
                      <div className="text-xs" style={{ color: 'var(--t3)' }}>{e.employeeCode || '--'}</div>
                    </td>
                    <td style={{ color: 'var(--t2)' }}>{e.phone || 'Missing'}</td>
                    <td style={{ color: 'var(--t2)' }}>{e.email || '--'}</td>
                    <td>{e.department || '--'}</td>
                    <td><span className="accent-pill">{e.plan || 'Corporate Multi-Gym'}</span></td>
                    <td><span className={isActive ? 'badge-active' : 'badge-danger'}>{isActive ? 'Active' : e.status || 'Suspended'}</span></td>
                    <td className="flex gap-2 flex-wrap">
                      <button className="btn btn-ghost text-xs py-1 px-3" onClick={() => setEditing(e)}><Pencil size={12} /> Edit</button>
                      <button className="btn btn-ghost text-xs py-1 px-3" onClick={() => toggleStatus(e)}>{isActive ? 'Suspend' : 'Activate'}</button>
                      <button className="btn btn-ghost text-xs py-1 px-3" style={{ color: 'var(--error)', borderColor: 'var(--error)' }} onClick={() => removeEmployee(e)}><Trash2 size={12} /> Remove</button>
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
              <input className="glass-input w-full" placeholder="Full name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              <input className="glass-input w-full" placeholder="Phone for OTP login" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
              <input className="glass-input w-full" type="email" placeholder="Work email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              <input className="glass-input w-full" placeholder="Employee code" value={form.employeeCode} onChange={(e) => setForm((p) => ({ ...p, employeeCode: e.target.value }))} />
              <select className="glass-input w-full" value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}>
                {DEPTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn btn-ghost flex-1 justify-center" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary flex-1 justify-center" onClick={addEmployee} disabled={saving || !form.phone}>{saving ? 'Saving...' : 'Add Employee'}</button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="glass p-7 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="serif text-xl">Edit Employee</h3>
              <button onClick={() => setEditing(null)} style={{ color: 'var(--t2)' }}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input className="glass-input w-full" value={editing.name || ''} onChange={(e) => setEditing((p: any) => ({ ...p, name: e.target.value }))} placeholder="Full name" />
              <input className="glass-input w-full" value={editing.phone || ''} onChange={(e) => setEditing((p: any) => ({ ...p, phone: e.target.value }))} placeholder="Phone for OTP login" />
              <input className="glass-input w-full" type="email" value={editing.email || ''} onChange={(e) => setEditing((p: any) => ({ ...p, email: e.target.value }))} placeholder="Work email" />
              <input className="glass-input w-full" value={editing.employeeCode || ''} onChange={(e) => setEditing((p: any) => ({ ...p, employeeCode: e.target.value }))} placeholder="Employee code" />
              <select className="glass-input w-full" value={editing.department || DEPTS[0]} onChange={(e) => setEditing((p: any) => ({ ...p, department: e.target.value }))}>
                {DEPTS.map((d) => <option key={d}>{d}</option>)}
              </select>
              <select className="glass-input w-full" value={editing.status || 'active'} onChange={(e) => setEditing((p: any) => ({ ...p, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="removed">Removed</option>
              </select>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn btn-ghost flex-1 justify-center" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary flex-1 justify-center" onClick={saveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
