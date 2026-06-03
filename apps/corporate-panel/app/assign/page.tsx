'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { loadCorporateWithEmployees } from '../../lib/corporate';
import { useToast } from '../../components/Toast';
import { Upload } from 'lucide-react';

const DEPTS = ['Engineering', 'Sales', 'Operations', 'Marketing', 'HR', 'Finance', 'Other'];

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

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
      const { corporate: corp, employees: employeeList } = await loadCorporateWithEmployees();
      if (!corp) {
        setCorporateId(null);
        setAccount(null);
        setEmployees([]);
        return;
      }
      const id = corp._id || corp.id;
      setCorporateId(id);
      setAccount(corp);
      setEmployees(employeeList);
    } catch (e: any) {
      toast(e.message || 'Failed to load seat data', 'error');
    }
  };

  useEffect(() => { load(); }, []);

  const totalSeats = Number(account?.totalSeats || 0);
  const assigned = employees.filter((employee) => employee.status === 'active').length;
  const available = Math.max(0, totalSeats - assigned);
  const canUseSeats = Boolean(account?.isActive) && ['active', 'trial'].includes(String(account?.billingStatus || 'pending_payment'));

  const handleAssign = async (e: any) => {
    e.preventDefault();
    if (!corporateId || !form.phone) return;
    setSending(true);
    try {
      await api.post(`/corporate/${corporateId}/employees`, form);
      toast(`Employee access assigned to ${form.phone}`);
      setForm({ name: '', email: '', phone: '', department: DEPTS[0] });
      await load();
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
      const headerCells = parseCsvLine(lines[0]).map((cell) => cell.toLowerCase());
      const hasHeader = headerCells.some((cell) => ['phone', 'mobile', 'name', 'email', 'department'].includes(cell));
      const dataLines = hasHeader ? lines.slice(1) : lines;
      const emps = dataLines.map((line) => {
        const cols = parseCsvLine(line);
        if (hasHeader) {
          const row: any = {};
          headerCells.forEach((key, index) => {
            const normalizedKey = key === 'mobile' ? 'phone' : key;
            row[normalizedKey] = cols[index] || '';
          });
          return {
            phone: row.phone || '',
            name: row.name || row.employee || '',
            email: row.email || '',
            department: row.department || 'Other',
          };
        }
        return { phone: cols[0], name: cols[1] || '', email: cols[2] || '', department: cols[3] || 'Other' };
      }).filter((e) => e.phone);
      if (emps.length === 0) { toast('No valid rows found in CSV', 'error'); return; }
      if (emps.length > available) {
        toast(`Only ${available} seats are available. Reduce the CSV rows or top-up seats first.`, 'error');
        return;
      }
      const res = await api.post(`/corporate/${corporateId}/employees/bulk`, { employees: emps });
      const failures = (res?.results || []).filter((row: any) => row.error).length;
      toast(
        failures ? `${emps.length - failures} imported, ${failures} failed. Check duplicate phone/email or seats.` : `${emps.length} employees imported`,
        failures ? (failures === emps.length ? 'error' : 'info') : 'success',
      );
      setBulkFile(null);
      await load();
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
