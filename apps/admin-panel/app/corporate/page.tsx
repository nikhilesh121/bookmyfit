'use client';
import { useCallback, useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { Briefcase, Users, Activity, TrendingUp, Plus } from 'lucide-react';
import Link from 'next/link';
import Pagination from '../../components/Pagination';

type CorporateAccount = {
  id: string;
  companyName: string;
  email: string;
  planType: string;
  totalSeats: number;
  assignedSeats: number;
  billingContact?: string;
  adminUserId?: string;
  isActive: boolean;
  createdAt?: string;
};

function statusBadge(isActive: boolean) {
  return isActive ? 'badge-active' : 'badge-danger';
}

export default function CorporatePage() {
  const { toast } = useToast();
  const [data, setData] = useState<CorporateAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', seats: '', plan: 'Corporate' });
  const [adding, setAdding] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await api.get(`/corporate?page=${page}&limit=${limit}`);
      const arr: CorporateAccount[] = Array.isArray(res) ? res : res?.data ?? [];
      setData(arr);
      setTotal(res?.total ?? arr.length);
      setPages(res?.pages ?? 1);
    } catch {
      setData([]);
      setTotal(0);
      setPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/corporate/${id}/approve`);
      toast('Corporate account approved');
      load();
    } catch {
      toast('Approval failed', 'error');
    }
  };

  const handleAddCorporate = async () => {
    if (!addForm.name.trim() || !addForm.email.trim()) { toast('Name and email required', 'error'); return; }
    setAdding(true);
    try {
      await api.post('/corporate', {
        companyName: addForm.name,
        email: addForm.email,
        totalSeats: Number(addForm.seats) || 10,
        planType: addForm.plan,
        billingContact: addForm.email,
      });
      toast('Corporate account created');
      setShowAdd(false);
      setAddForm({ name: '', email: '', seats: '', plan: 'Corporate' });
      load();
    } catch (e: any) {
      toast(e.message || 'Failed to create', 'error');
    } finally { setAdding(false); }
  };

  const filtered = data.filter((d) =>
    (d.companyName ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (d.email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const totalSeats = data.reduce((a, d) => a + (d.totalSeats ?? 0), 0);
  const totalUsed = data.reduce((a, d) => a + (d.assignedSeats ?? 0), 0);
  const utilization = totalSeats > 0 ? Math.round((totalUsed / totalSeats) * 100) : 0;

  const kpis = [
    { label: 'Total Accounts', icon: Briefcase, value: total || data.length },
    { label: 'Total Seats', icon: Users, value: totalSeats.toLocaleString() },
    { label: 'Utilization', icon: Activity, value: `${utilization}%` },
    { label: 'Active Accounts', icon: TrendingUp, value: data.filter((d) => d.isActive).length },
  ];

  return (
    <Shell title="Corporate Accounts">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-5">
                <div className="animate-pulse h-8 rounded mb-2" style={{ background: 'var(--surface)' }} />
                <div className="animate-pulse h-4 rounded" style={{ background: 'var(--surface)' }} />
              </div>
            ))
          : kpis.map((k) => {
              const Icon = k.icon;
              return (
                <div key={k.label} className="card stat-glow p-5">
                  <div className="mb-2">
                    <Icon size={16} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="text-2xl font-bold mb-1">{k.value}</div>
                  <div className="text-xs" style={{ color: 'var(--t2)' }}>{k.label}</div>
                </div>
              );
            })}
      </div>

      {/* Search + Add */}
      <div className="flex items-center gap-3 mb-5">
        <input
          className="glass-input flex-1"
          placeholder="Search by company name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-primary flex items-center gap-2" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> New Account
        </button>
      </div>

      {/* Table */}
      <div className="glass overflow-hidden">
        <table className="glass-table">
          <thead>
            <tr>
              <th>Company Name</th>
              <th>Total Seats</th>
              <th>Assigned</th>
              <th>Utilization</th>
              <th>Plan</th>
              <th>Contact Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j}><div className="animate-pulse h-4 rounded" style={{ background: 'var(--surface)' }} /></td>
                    ))}
                  </tr>
                ))
              : filtered.length === 0
                ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--t2)', padding: '40px 0' }}>
                      No corporate accounts found
                    </td>
                  </tr>
                )
                : filtered.map((c) => {
                  const seats = c.totalSeats ?? 0;
                  const used = c.assignedSeats ?? 0;
                  const pct = seats > 0 ? Math.round((used / seats) * 100) : 0;
                  const status = c.isActive ? 'active' : 'inactive';
                  return (
                    <tr key={c.id}>
                      <td className="font-semibold text-white">{c.companyName}</td>
                      <td>{seats}</td>
                      <td>{used}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div style={{ width: 60, height: 6, background: 'var(--surface)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: pct > 80 ? 'var(--accent)' : pct > 50 ? '#FFB800' : 'var(--error)', borderRadius: 4 }} />
                          </div>
                          <span className="text-xs" style={{ color: 'var(--t2)' }}>{pct}%</span>
                        </div>
                      </td>
                      <td><span className="accent-pill">{c.planType}</span></td>
                      <td className="text-xs" style={{ color: 'var(--t2)' }}>{c.email}</td>
                      <td><span className={statusBadge(c.isActive)}>{status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
                      <td className="flex gap-2">
                        <Link href={`/corporate/${c.id}/employees`}>
                          <button className="btn btn-ghost text-xs">Employees</button>
                        </Link>
                        {!c.isActive ? (
                          <button className="btn btn-primary text-xs" onClick={() => handleApprove(c.id)}>Approve</button>
                        ) : (
                          <button className="btn btn-ghost text-xs" onClick={() => toast(`Managing ${c.companyName}`, 'info')}>Manage</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pages={pages} total={total} limit={limit} onPage={(p) => setPage(p)} onLimit={(l) => { setLimit(l); setPage(1); }} />

      {/* Add Corporate Modal */}
      {showAdd && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={() => setShowAdd(false)}>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:20,padding:28,width:440,maxWidth:'90vw'}} onClick={e=>e.stopPropagation()}>
            <h3 style={{fontFamily:'var(--serif)',fontSize:20,color:'#fff',marginBottom:20}}>New Corporate Account</h3>
            <div className="space-y-3">
              <div>
                <label className="kicker block mb-1">Company Name</label>
                <input className="glass-input w-full" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} placeholder="Company name" />
              </div>
              <div>
                <label className="kicker block mb-1">Contact Email</label>
                <input className="glass-input w-full" type="email" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} placeholder="hr@company.in" />
              </div>
              <div>
                <label className="kicker block mb-1">Number of Seats</label>
                <input className="glass-input w-full" type="number" value={addForm.seats} onChange={(e) => setAddForm((f) => ({ ...f, seats: e.target.value }))} placeholder="50" />
              </div>
              <div>
                <label className="kicker block mb-1">Plan</label>
                <select className="glass-input w-full" value={addForm.plan} onChange={(e) => setAddForm((f) => ({ ...f, plan: e.target.value }))}>
                  <option>Corporate</option><option>Elite</option><option>Pro</option>
                </select>
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:20}}>
              <button className="btn btn-ghost flex-1" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary flex-1" onClick={handleAddCorporate} disabled={adding}>
                {adding ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
