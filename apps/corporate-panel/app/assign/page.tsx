'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { Upload } from 'lucide-react';

const PLANS = ['Pro', 'Max', 'Elite'];
const DEPTS = ['Engineering', 'Sales', 'Operations', 'Marketing', 'HR', 'Finance', 'Other'];

export default function AssignPage() {
  const [corporateId, setCorporateId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [totalSeats, setTotalSeats] = useState(0);
  const [form, setForm] = useState({ email: '', department: DEPTS[0], plan: PLANS[0] });
  const [sending, setSending] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkImporting, setBulkImporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const corp = await api.get('/corporate/me');

        if (!corp) return;
        const id = corp._id || corp.id;
        setCorporateId(id);
        setTotalSeats(corp.totalSeats || corp.seats || 0);
        const res = await api.get(`/corporate/${id}/employees`);
        const emps = Array.isArray(res) ? res : res?.data || [];
        setEmployees(emps);
      } catch {}
    }
    load();
  }, []);

  const assigned = employees.length;
  const available = Math.max(0, totalSeats - assigned);

  const handleAssign = async (e: any) => {
    e.preventDefault();
    if (!corporateId || !form.email) return;
    setSending(true);
    try {
      const payload = { email: form.email, name: form.email.split('@')[0], department: form.department, plan: form.plan };
      const newEmp = await api.post(`/corporate/${corporateId}/employees`, payload);
      setEmployees((p) => [...p, newEmp?.employee || newEmp]);
      toast(`Invite sent to ${form.email}`);
      setForm((p) => ({ ...p, email: '' }));
    } catch (err: any) {
      toast(err.message || 'Failed to send invite', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkFile || !corporateId) return;
    setBulkImporting(true);
    try {
      const text = await bulkFile.text();
      const lines = text.trim().split('\n').filter(Boolean);
      const header = lines[0].toLowerCase();
      const dataLines = header.includes('email') ? lines.slice(1) : lines;
      const emps = dataLines.map((line) => {
        const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        return { email: cols[0], name: cols[1] || cols[0].split('@')[0], department: cols[2] || 'Other', plan: cols[3] || 'Pro' };
      }).filter((e) => e.email);
      if (emps.length === 0) { toast('No valid rows found in CSV', 'error'); return; }
      const res = await api.post(`/corporate/${corporateId}/employees/bulk`, { employees: emps });
      const imported = res?.imported || res?.count || emps.length;
      toast(`${imported} employees imported successfully`);
      const updated = await api.get(`/corporate/${corporateId}/employees`);
      setEmployees(Array.isArray(updated) ? updated : updated?.employees || updated?.data || []);
      setBulkFile(null);
    } catch (err: any) {
      toast(err.message || 'Bulk import failed', 'error');
    } finally {
      setBulkImporting(false);
    }
  };

  return (
    <Shell title="Assign Plans">
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Seats', value: totalSeats },
          { label: 'Assigned', value: assigned },
          { label: 'Available', value: available },
        ].map((s) => (
          <div key={s.label} className="card stat-glow p-5">
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--t2)' }}>{s.label}</div>
            <div className="text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass p-6">
          <h3 className="serif text-lg mb-4">Individual Assignment</h3>
          <form onSubmit={handleAssign} className="space-y-3">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Employee Email</label>
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
            <button type="submit" className="btn btn-primary w-full justify-center" disabled={sending}>
              {sending ? 'Sending…' : 'Assign & Send Invite'}
            </button>
          </form>
        </div>

        <div className="glass p-6">
          <h3 className="serif text-lg mb-4">Bulk Upload</h3>
          <label
            className="rounded-xl p-8 text-center block cursor-pointer"
            style={{ border: '2px dashed var(--accent-border)', background: 'var(--accent-soft)' }}
          >
            <input type="file" accept=".csv" className="hidden" onChange={(e) => setBulkFile(e.target.files?.[0] || null)} />
            <Upload size={24} style={{ color: 'var(--accent)', margin: '0 auto 8px' }} />
            {bulkFile ? (
              <p className="text-sm text-white font-semibold">{bulkFile.name}</p>
            ) : (
              <>
                <p className="text-sm text-white font-semibold mb-1">Drop CSV file here</p>
                <p className="text-xs" style={{ color: 'var(--t3)' }}>or click to browse</p>
              </>
            )}
          </label>
          <div className="mt-3 p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--t2)' }}>CSV format: <span className="text-white">email, name, department, plan</span></p>
          </div>
          {bulkFile && (
            <button
              className="btn btn-primary w-full justify-center mt-3"
              onClick={handleBulkImport}
              disabled={bulkImporting}
            >
              {bulkImporting ? 'Importing…' : `Import ${bulkFile.name}`}
            </button>
          )}
        </div>
      </div>
    </Shell>
  );
}
