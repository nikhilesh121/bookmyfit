'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Save, Users } from 'lucide-react';
import Shell from '../../../components/Shell';
import { api } from '../../../lib/api';
import { useToast } from '../../../components/Toast';

type CorporateAccount = {
  id: string;
  companyName: string;
  email: string;
  planType: string;
  totalSeats: number;
  assignedSeats: number;
  billingContact?: string | null;
  adminUserId?: string | null;
  isActive: boolean;
  pricePerSeat?: number;
  billingStatus?: string;
  pendingSeatRequest?: number;
  pendingSeatOrderId?: string | null;
  lastSeatPaymentOrderId?: string | null;
};

export default function CorporateManagePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const { toast } = useToast();
  const [account, setAccount] = useState<CorporateAccount | null>(null);
  const [form, setForm] = useState({
    companyName: '',
    email: '',
    planType: 'Corporate',
    totalSeats: '',
    billingContact: '',
    adminUserId: '',
    isActive: false,
    pricePerSeat: '',
    billingStatus: 'pending_payment',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res: CorporateAccount = await api.get(`/corporate/${id}`);
      setAccount(res);
      setForm({
        companyName: res.companyName || '',
        email: res.email || '',
        planType: res.planType || 'Corporate',
        totalSeats: String(res.totalSeats ?? 0),
        billingContact: res.billingContact || '',
        adminUserId: res.adminUserId || '',
        isActive: Boolean(res.isActive),
        pricePerSeat: res.pricePerSeat !== null && res.pricePerSeat !== undefined ? String(res.pricePerSeat) : '',
        billingStatus: res.billingStatus || 'pending_payment',
      });
    } catch (e: any) {
      toast(e.message || 'Failed to load corporate account', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!id) return;
    if (!form.companyName.trim() || !form.email.trim()) {
      toast('Company name and email are required', 'error');
      return;
    }
    const totalSeats = Number(form.totalSeats);
    if (!Number.isFinite(totalSeats) || totalSeats < Number(account?.assignedSeats || 0)) {
      toast('Total seats cannot be lower than assigned seats', 'error');
      return;
    }
    setSaving(true);
    try {
      const res: CorporateAccount = await api.put(`/corporate/${id}`, {
        companyName: form.companyName.trim(),
        email: form.email.trim(),
        planType: form.planType.trim() || 'Corporate',
        totalSeats,
        billingContact: form.billingContact.trim() || null,
        adminUserId: form.adminUserId.trim() || null,
        isActive: form.isActive,
        pricePerSeat: Number(form.pricePerSeat) || 0,
        billingStatus: form.billingStatus,
      });
      setAccount(res);
      toast('Corporate account updated');
    } catch (e: any) {
      toast(e.message || 'Failed to update corporate account', 'error');
    } finally {
      setSaving(false);
    }
  };

  const assignedSeats = Number(account?.assignedSeats || 0);
  const totalSeats = Number(form.totalSeats || 0);
  const availableSeats = Math.max(0, totalSeats - assignedSeats);

  return (
    <Shell title={account ? `Manage ${account.companyName}` : 'Manage Corporate'}>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="btn btn-ghost flex items-center gap-2 text-sm">
          <ArrowLeft size={14} /> Back
        </button>
        {account && (
          <Link href={`/corporate/${account.id}/employees`} className="btn btn-ghost flex items-center gap-2 text-sm">
            <Users size={14} /> Employees
          </Link>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="card stat-glow p-5">
          <Building2 size={16} style={{ color: 'var(--accent)', marginBottom: 8 }} />
          <div className="text-2xl font-bold">{loading ? '--' : totalSeats}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--t2)' }}>Total Seats</div>
        </div>
        <div className="card stat-glow p-5">
          <div className="text-2xl font-bold">{loading ? '--' : assignedSeats}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--t2)' }}>Assigned Seats</div>
        </div>
        <div className="card stat-glow p-5">
          <div className="text-2xl font-bold">{loading ? '--' : availableSeats}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--t2)' }}>Available Seats</div>
        </div>
        <div className="card stat-glow p-5">
          <div className="text-2xl font-bold">{form.isActive ? 'Active' : 'Inactive'}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--t2)' }}>Account Status</div>
        </div>
      </div>

      {account?.pendingSeatOrderId && (
        <div className="glass p-4 mb-6" style={{ borderColor: 'rgba(255,184,0,0.35)' }}>
          <div className="kicker mb-1">Pending seat payment</div>
          <div className="text-sm text-white">
            Order {account.pendingSeatOrderId} {account.pendingSeatRequest ? `for ${account.pendingSeatRequest} extra seats` : 'for current seats'}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--t2)' }}>Seats update only after Cashfree verifies the order as paid.</div>
        </div>
      )}

      <div className="glass p-7" style={{ maxWidth: 980 }}>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, color: '#fff', marginBottom: 22 }}>Account Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <label>
            <span className="kicker block mb-1">Company Name</span>
            <input className="glass-input w-full" value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} />
          </label>
          <label>
            <span className="kicker block mb-1">Contact Email</span>
            <input className="glass-input w-full" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </label>
          <label>
            <span className="kicker block mb-1">Plan Type</span>
            <select className="glass-input w-full" value={form.planType} onChange={(e) => setForm((f) => ({ ...f, planType: e.target.value }))}>
              {['Corporate', 'Elite', 'Pro', 'Standard'].map((plan) => <option key={plan}>{plan}</option>)}
            </select>
          </label>
          <label>
            <span className="kicker block mb-1">Total Seats</span>
            <input className="glass-input w-full" type="number" min={assignedSeats} value={form.totalSeats} onChange={(e) => setForm((f) => ({ ...f, totalSeats: e.target.value }))} />
          </label>
          <label>
            <span className="kicker block mb-1">Billing Contact</span>
            <input className="glass-input w-full" value={form.billingContact} onChange={(e) => setForm((f) => ({ ...f, billingContact: e.target.value }))} placeholder="Finance contact or billing email" />
          </label>
          <label>
            <span className="kicker block mb-1">Per Seat Price</span>
            <input className="glass-input w-full" type="number" min={0} value={form.pricePerSeat} onChange={(e) => setForm((f) => ({ ...f, pricePerSeat: e.target.value }))} />
          </label>
          <label>
            <span className="kicker block mb-1">Billing Status</span>
            <select className="glass-input w-full" value={form.billingStatus} onChange={(e) => setForm((f) => ({ ...f, billingStatus: e.target.value }))}>
              <option value="active">Active/Paid</option>
              <option value="pending_payment">Pending Payment</option>
              <option value="payment_failed">Payment Failed</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>
          <label>
            <span className="kicker block mb-1">Corporate Admin User ID</span>
            <input className="glass-input w-full font-mono" value={form.adminUserId} onChange={(e) => setForm((f) => ({ ...f, adminUserId: e.target.value }))} placeholder="Optional user UUID" />
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 mt-6 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
            <span className="font-semibold">{form.isActive ? 'Active account' : 'Inactive account'}</span>
          </label>
          <button className="btn btn-primary flex items-center gap-2" disabled={saving || loading} onClick={save}>
            <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </Shell>
  );
}
