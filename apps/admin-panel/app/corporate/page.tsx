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
  pricePerSeat?: number;
  billingStatus?: string;
  adminLogin?: { email: string; password: string; portalUrl: string } | null;
  createdAt?: string;
};

function statusBadge(isActive: boolean) {
  return isActive ? 'badge-active' : 'badge-danger';
}

export default function CorporatePage() {
  const { toast } = useToast();
  const [data, setData] = useState<CorporateAccount[]>([]);
  const [allAccounts, setAllAccounts] = useState<CorporateAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const emptyAddForm = {
    name: '',
    email: '',
    seats: '',
    plan: 'Corporate',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
    pricePerSeat: '',
    billingStatus: 'pending_payment',
    isActive: false,
  };
  const [addForm, setAddForm] = useState(emptyAddForm);
  const [createdLogin, setCreatedLogin] = useState<{ email: string; password: string; portalUrl: string } | null>(null);
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
      const first: any = await api.get('/corporate?page=1&limit=100');
      const firstPage = Array.isArray(first) ? first : first?.data ?? [];
      const totalPages = Number(first?.pages ?? 1);
      const rest = totalPages > 1
        ? await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) => api.get(`/corporate?page=${index + 2}&limit=100`)))
        : [];
      setAllAccounts([
        firstPage,
        ...rest.map((result: any) => Array.isArray(result) ? result : result?.data ?? []),
      ].flat());
    } catch {
      setData([]);
      setAllAccounts([]);
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

  const handleActiveToggle = async (account: CorporateAccount, isActive: boolean) => {
    try {
      await api.put(`/corporate/${account.id}`, { isActive });
      toast(isActive ? 'Corporate account reactivated' : 'Corporate account suspended');
      load();
    } catch (e: any) {
      toast(e.message || 'Status update failed', 'error');
    }
  };

  const handleAddCorporate = async () => {
    if (!addForm.name.trim() || !addForm.email.trim()) { toast('Name and email required', 'error'); return; }
    const seats = Number(addForm.seats);
    if (!Number.isFinite(seats) || seats <= 0) { toast('Enter paid seat count before creating the account', 'error'); return; }
    const pricePerSeat = Number(addForm.pricePerSeat);
    if (!Number.isFinite(pricePerSeat) || pricePerSeat < 0) { toast('Enter a valid per-seat price', 'error'); return; }
    setAdding(true);
    try {
      const res: any = await api.post('/corporate', {
        companyName: addForm.name,
        email: addForm.email,
        totalSeats: seats,
        planType: addForm.plan,
        billingContact: addForm.email,
        adminName: addForm.adminName.trim() || addForm.name,
        adminEmail: addForm.adminEmail.trim() || addForm.email,
        adminPhone: addForm.adminPhone.trim() || null,
        adminPassword: addForm.adminPassword.trim() || undefined,
        pricePerSeat: Math.max(0, Math.round(pricePerSeat)),
        billingStatus: addForm.billingStatus,
        isActive: addForm.isActive,
      });
      toast('Corporate account created');
      setCreatedLogin(res?.adminLogin || null);
      setAddForm(emptyAddForm);
      load();
    } catch (e: any) {
      toast(e.message || 'Failed to create', 'error');
    } finally { setAdding(false); }
  };

  const filtered = data.filter((d) =>
    (d.companyName ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (d.email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const summaryAccounts = allAccounts.length ? allAccounts : data;
  const totalSeats = summaryAccounts.reduce((a, d) => a + (d.totalSeats ?? 0), 0);
  const totalUsed = summaryAccounts.reduce((a, d) => a + (d.assignedSeats ?? 0), 0);
  const utilization = totalSeats > 0 ? Math.round((totalUsed / totalSeats) * 100) : 0;

  const kpis = [
    { label: 'Total Accounts', icon: Briefcase, value: total || data.length },
    { label: 'Total Seats', icon: Users, value: totalSeats.toLocaleString() },
    { label: 'Utilization', icon: Activity, value: `${utilization}%` },
    { label: 'Active Accounts', icon: TrendingUp, value: summaryAccounts.filter((d) => d.isActive).length },
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
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <input
          className="glass-input flex-1"
          style={{ minWidth: 260 }}
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
                      <td>
                        <div className="flex flex-col gap-1">
                          <span className={statusBadge(c.isActive)}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                          <span className={c.billingStatus === 'active' ? 'badge-active' : 'badge-pending'}>{c.billingStatus || 'pending_payment'}</span>
                        </div>
                      </td>
                      <td className="flex gap-2">
                        <Link href={`/corporate/${c.id}/employees`}>
                          <button className="btn btn-ghost text-xs">Employees</button>
                        </Link>
                        <Link href={`/corporate/${c.id}`}>
                          <button className="btn btn-ghost text-xs">Manage</button>
                        </Link>
                        {!c.isActive ? (
                          <button className="btn btn-primary text-xs" onClick={() => handleApprove(c.id)}>Approve</button>
                        ) : null}
                        {c.isActive ? (
                          <button className="btn btn-ghost text-xs" onClick={() => handleActiveToggle(c, false)}>Suspend</button>
                        ) : (
                          <button className="btn btn-ghost text-xs" onClick={() => handleActiveToggle(c, true)}>Reactivate</button>
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
            {createdLogin ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl" style={{ background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.25)' }}>
                  <div className="kicker mb-2">Corporate login details</div>
                  <div className="text-sm text-white">Portal: {createdLogin.portalUrl}</div>
                  <div className="text-sm text-white">Email: {createdLogin.email}</div>
                  <div className="text-sm text-white">Password: {createdLogin.password}</div>
                </div>
                <button className="btn btn-primary w-full justify-center" onClick={() => {
                  navigator.clipboard?.writeText(`Corporate portal: ${createdLogin.portalUrl}\nEmail: ${createdLogin.email}\nPassword: ${createdLogin.password}`);
                  toast('Login details copied');
                }}>Copy Login Details</button>
                <button className="btn btn-ghost w-full justify-center" onClick={() => { setCreatedLogin(null); setShowAdd(false); }}>Done</button>
              </div>
            ) : (<>
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
              <div>
                <label className="kicker block mb-1">Per Seat Price</label>
                <input className="glass-input w-full" type="number" value={addForm.pricePerSeat} onChange={(e) => setAddForm((f) => ({ ...f, pricePerSeat: e.target.value }))} placeholder="Set approved price" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="kicker block mb-1">Billing Status</label>
                  <select className="glass-input w-full" value={addForm.billingStatus} onChange={(e) => setAddForm((f) => ({ ...f, billingStatus: e.target.value }))}>
                    <option value="active">Active/Paid</option>
                    <option value="pending_payment">Pending Payment</option>
                    <option value="trial">Trial</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 mt-6 text-sm">
                  <input type="checkbox" checked={addForm.isActive} onChange={(e) => setAddForm((f) => ({ ...f, isActive: e.target.checked }))} />
                  Approved
                </label>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div className="kicker mb-2">HR admin login</div>
                <input className="glass-input w-full mb-2" value={addForm.adminName} onChange={(e) => setAddForm((f) => ({ ...f, adminName: e.target.value }))} placeholder="HR admin name" />
                <input className="glass-input w-full mb-2" type="email" value={addForm.adminEmail} onChange={(e) => setAddForm((f) => ({ ...f, adminEmail: e.target.value }))} placeholder="hr@company.in" />
                <input className="glass-input w-full mb-2" value={addForm.adminPhone} onChange={(e) => setAddForm((f) => ({ ...f, adminPhone: e.target.value }))} placeholder="HR phone (optional)" />
                <input className="glass-input w-full" value={addForm.adminPassword} onChange={(e) => setAddForm((f) => ({ ...f, adminPassword: e.target.value }))} placeholder="Temporary password (auto if blank)" />
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:20}}>
              <button className="btn btn-ghost flex-1" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary flex-1" onClick={handleAddCorporate} disabled={adding}>
                {adding ? 'Creating...' : 'Create Account'}
              </button>
            </div>
            </>)}
          </div>
        </div>
      )}
    </Shell>
  );
}
