'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Shell from '../../../../components/Shell';
import Pagination from '../../../../components/Pagination';
import { api } from '../../../../lib/api';
import { useToast } from '../../../../components/Toast';
import { Users, ArrowLeft, UserPlus, Trash2, Download } from 'lucide-react';

export default function CorporateEmployeesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [corporate, setCorporate] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ employeeCode: '', department: 'Engineering', userId: '' });
  const [adding, setAdding] = useState(false);

  const loadCorp = useCallback(async () => {
    try {
      const res: any = await api.get(`/corporate`);
      const list = Array.isArray(res) ? res : res?.data ?? [];
      const found = list.find((c: any) => c.id === id);
      if (found) setCorporate(found);
    } catch {}
  }, [id]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res: any = await api.get(`/corporate/${id}/employees?page=${page}&limit=${limit}`);
      setEmployees(Array.isArray(res) ? res : res?.data ?? []);
      setTotal(res?.total ?? 0);
      setPages(res?.pages ?? 1);
    } catch (e: any) {
      toast(e.message || 'Failed to load employees', 'error');
    } finally { setLoading(false); }
  }, [id, page, limit, toast]);

  useEffect(() => { loadCorp(); }, [loadCorp]);
  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!addForm.employeeCode) { toast('Employee code required', 'error'); return; }
    setAdding(true);
    try {
      await api.post(`/corporate/${id}/employees`, addForm);
      toast('Employee added');
      setShowAdd(false);
      setAddForm({ employeeCode: '', department: 'Engineering', userId: '' });
      load();
    } catch (e: any) { toast(e.message || 'Failed to add', 'error'); }
    finally { setAdding(false); }
  };

  const handleRemove = async (empId: string) => {
    if (!confirm('Remove this employee?')) return;
    try {
      await api.post(`/corporate/${id}/employees/${empId}/remove`, {});
      toast('Employee removed');
      load();
    } catch (e: any) { toast(e.message || 'Failed to remove', 'error'); }
  };

  const exportCSV = () => {
    const rows = [['ID', 'User ID', 'Employee Code', 'Department', 'Status', 'Assigned Date']];
    employees.forEach((e) => rows.push([e.id, e.userId, e.employeeCode, e.department, e.status, e.assignedDate]));
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'employees.csv'; a.click();
    toast('CSV exported');
  };

  const filtered = search
    ? employees.filter((e) => (e.employeeCode || '').toLowerCase().includes(search.toLowerCase()) || (e.department || '').toLowerCase().includes(search.toLowerCase()))
    : employees;

  return (
    <Shell title={corporate ? `${corporate.companyName} — Employees` : 'Corporate Employees'}>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="btn btn-ghost flex items-center gap-2 text-sm">
          <ArrowLeft size={14} /> Back
        </button>
        {corporate && (
          <div>
            <div className="text-xs" style={{ color: 'var(--t3)' }}>Corporate Account</div>
            <div className="font-semibold">{corporate.companyName}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card stat-glow p-5">
          <Users size={16} style={{ color: 'var(--accent)', marginBottom: 8 }} />
          <div className="text-2xl font-bold">{total}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--t2)' }}>Total Employees</div>
        </div>
        <div className="card stat-glow p-5">
          <div className="text-2xl font-bold">{corporate?.totalSeats ?? '--'}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--t2)' }}>Total Seats</div>
        </div>
        <div className="card stat-glow p-5">
          <div className="text-2xl font-bold">{Math.max(0, (corporate?.totalSeats ?? 0) - (corporate?.assignedSeats ?? 0))}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--t2)' }}>Available Seats</div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <input className="glass-input flex-1" placeholder="Search by code or department..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <button onClick={exportCSV} className="btn btn-ghost flex items-center gap-2 text-sm"><Download size={14} /> Export</button>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary flex items-center gap-2 text-sm"><UserPlus size={14} /> Add Employee</button>
      </div>

      <div className="glass overflow-hidden">
        <table className="glass-table">
          <thead>
            <tr>
              <th>Employee Code</th><th>User ID</th><th>Department</th><th>Status</th><th>Assigned Date</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((__, j) => (<td key={j}><div className="animate-pulse h-4 rounded" style={{ background: 'var(--surface)' }} /></td>))}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--t3)' }}>No employees found</td></tr>
            ) : (
              filtered.map((e) => (
                <tr key={e.id}>
                  <td className="font-mono font-semibold text-white">{e.employeeCode}</td>
                  <td className="font-mono text-xs" style={{ color: 'var(--t3)' }}>{e.userId?.slice(0, 8)}...</td>
                  <td style={{ color: 'var(--t2)' }}>{e.department || '--'}</td>
                  <td><span className={e.status === 'active' ? 'badge-active' : 'badge-pending'}>{e.status}</span></td>
                  <td className="text-xs" style={{ color: 'var(--t3)' }}>{e.assignedDate ? new Date(e.assignedDate).toLocaleDateString('en-IN') : '--'}</td>
                  <td>
                    <button onClick={() => handleRemove(e.id)} className="btn btn-ghost text-xs flex items-center gap-1" style={{ color: 'var(--error)', borderColor: 'var(--error)' }}>
                      <Trash2 size={12} /> Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pages={pages} total={total} limit={limit} onPage={setPage} onLimit={(l) => { setLimit(l); setPage(1); }} />

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowAdd(false)}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 28, width: 400, maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 18, color: '#fff', marginBottom: 20 }}>Add Employee</h3>
            <div className="space-y-3">
              <div>
                <label className="kicker block mb-1">User ID (UUID)</label>
                <input className="glass-input w-full" value={addForm.userId} onChange={(e) => setAddForm((f) => ({ ...f, userId: e.target.value }))} placeholder="User UUID" />
              </div>
              <div>
                <label className="kicker block mb-1">Employee Code</label>
                <input className="glass-input w-full" value={addForm.employeeCode} onChange={(e) => setAddForm((f) => ({ ...f, employeeCode: e.target.value }))} placeholder="EMP001" />
              </div>
              <div>
                <label className="kicker block mb-1">Department</label>
                <select className="glass-input w-full" value={addForm.department} onChange={(e) => setAddForm((f) => ({ ...f, department: e.target.value }))}>
                  {['Engineering', 'Sales', 'Operations', 'Marketing', 'HR', 'Finance', 'Other'].map((d) => (<option key={d}>{d}</option>))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn btn-ghost flex-1" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary flex-1" onClick={handleAdd} disabled={adding}>{adding ? 'Adding...' : 'Add Employee'}</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
