'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { Upload } from 'lucide-react';

const DEPTS = ['Engineering', 'Sales', 'Operations', 'Marketing', 'HR', 'Finance', 'Other'];

export default function AssignPage() {
  const [corporateId, setCorporateId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [account, setAccount] = useState<any>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', department: DEPTS[0] });
  const [sending, setSending] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkImporting, setBulkImporting] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    try {
      const corp = await api.get('/corporate/me');
      if (!corp) return;
      const id = corp._id || corp.id;
      setCorporateId(id);
      setAccount(corp);
      const res = await api.get(`/corporate/${id}/employees?limit=200`);
      setEmployees(Array.isArray(res) ? res : res?.data || []);
    } catch (e: any) {
      toast(e.message || 'Failed to load seat data', 'error');
    }
  };

  useEffect(() => { load(); }, []);

  const totalSeats = Number(account?.totalSeats || 0);
  const assigned = employees.filter((employee) => employee.status === 'active').length;
  const available = Math.max(0, totalSeats - assigned);
  const canUseSeats = Boolean(account?.isActive) && ['active', 'trial'].includes(String(account?.billingStatus || 'active'));

  const handleAssign = async (e: any) => {
    e.preventDefault();
    if (!corporateId || !form.phone) return;
    setSending(true);
    try {
      await api.post(`/corporate/${corporateId}/employees`, form);
      toast(`Employee access assigned to ${form.phone}`);
      setForm({ name: '', email: '', phone: '', department: DEPTS[0] });
      load();
    } catch (err: any) {
      toast(err.message || 'Failed to assign employee', 'error');
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
      const dataLines = header.includes('phone') || header.includes('email') ? lines.slice(1) : lines;
      const emps = dataLines.map((line) => {
        const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        return { phone: cols[0], name: cols[1] || 'Corporate Employee', email: cols[2] || '', department: cols[3] || 'Other' };
      }).filter((e) => e.phone);
      if (emps.length === 0) { toast('No valid rows found in CSV', 'error'); return; }
      const res = await api.post(`/corporate/${corporateId}/employees/bulk`, { employees: emps });
      const failures = (res?.results || []).filter((row: any) => row.error).length;
      toast(failures ? `${emps.length - failures} imported, ${failures} failed` : `${emps.length} employees imported`);
      setBulkFile(null);
      load();
    } catch (err: any) {
      toast(err.message || 'Bulk import failed', 'error');
    } finally {
      setBulkImporting(false);
    }
  };

  return (
    <Shell title="Assign Corporate Access">
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

      {!canUseSeats && (
        <div className="glass p-4 mb-5" style={{ borderColor: 'rgba(255,184,0,0.35)' }}>
          <div className="font-semibold text-white">Corporate access is not active yet.</div>
          <div className="text-xs mt-1" style={{ color: 'var(--t2)' }}>Billing status: {account?.billingStatus || 'pending'}. Employees can be assigned after payment and approval.</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass p-6">
          <h3 className="serif text-lg mb-4">Individual Assignment</h3>
          <form onSubmit={handleAssign} className="space-y-3">
            <input className="glass-input w-full" placeholder="Employee name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <input className="glass-input w-full" placeholder="Phone for OTP login" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} required />
            <input className="glass-input w-full" type="email" placeholder="Work email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            <select className="glass-input w-full" value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}>
              {DEPTS.map((d) => <option key={d}>{d}</option>)}
            </select>
            <button type="submit" className="btn btn-primary w-full justify-center" disabled={sending || !canUseSeats || available <= 0}>
              {sending ? 'Assigning...' : 'Assign Corporate Access'}
            </button>
          </form>
        </div>

        <div className="glass p-6">
          <h3 className="serif text-lg mb-4">Bulk Upload</h3>
          <label className="rounded-xl p-8 text-center block cursor-pointer" style={{ border: '2px dashed var(--accent-border)', background: 'var(--accent-soft)' }}>
            <input type="file" accept=".csv" className="hidden" onChange={(e) => setBulkFile(e.target.files?.[0] || null)} />
            <Upload size={24} style={{ color: 'var(--accent)', margin: '0 auto 8px' }} />
            {bulkFile ? <p className="text-sm text-white font-semibold">{bulkFile.name}</p> : (
              <>
                <p className="text-sm text-white font-semibold mb-1">Drop CSV file here</p>
                <p className="text-xs" style={{ color: 'var(--t3)' }}>or click to browse</p>
              </>
            )}
          </label>
          <div className="mt-3 p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--t2)' }}>CSV format: <span className="text-white">phone, name, email, department</span></p>
          </div>
          {bulkFile && (
            <button className="btn btn-primary w-full justify-center mt-3" onClick={handleBulkImport} disabled={bulkImporting || !canUseSeats || available <= 0}>
              {bulkImporting ? 'Importing...' : `Import ${bulkFile.name}`}
            </button>
          )}
        </div>
      </div>
    </Shell>
  );
}
