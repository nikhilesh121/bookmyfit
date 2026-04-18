'use client';

import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { useEffect, useState } from 'react';
import { CreditCard, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, IndianRupee, Clock, AlertTriangle, X, Check } from 'lucide-react';
import { useToast } from '../../components/Toast';

type GymPlan = {
  id: string;
  gymId: string;
  name: string;
  description?: string;
  price: number;
  durationDays: number;
  sessionsPerDay: number;
  features: string[];
  isActive: boolean;
  createdAt: string;
};

const EMPTY_FORM = { name: '', description: '', price: '', durationDays: '30', sessionsPerDay: '1', features: '' };

function SkeletonCard() {
  return (
    <div className="glass card p-5" style={{ opacity: 0.5 }}>
      {[70, 50, 40, 60, 80].map((w, i) => (
        <div key={i} style={{ height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.1)', marginBottom: 12, width: `${w}%`, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  );
}

export default function PlansPage() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<GymPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editPlan, setEditPlan] = useState<GymPlan | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [confirmDelete, setConfirmDelete] = useState<GymPlan | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<any>('/gym-plans/my-gym')
      .then((res) => setPlans(Array.isArray(res) ? res : res?.data ?? []))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditPlan(null); setForm({ ...EMPTY_FORM }); setShowForm(true); };
  const openEdit = (p: GymPlan) => {
    setEditPlan(p);
    setForm({ name: p.name, description: p.description ?? '', price: String(p.price), durationDays: String(p.durationDays), sessionsPerDay: String(p.sessionsPerDay), features: (p.features ?? []).join(', ') });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      durationDays: Number(form.durationDays),
      sessionsPerDay: Number(form.sessionsPerDay),
      features: form.features ? form.features.split(',').map(s => s.trim()).filter(Boolean) : [],
    };
    try {
      if (editPlan) {
        await api.put(`/gym-plans/${editPlan.id}`, payload);
        toast('Plan updated successfully');
      } else {
        await api.post('/gym-plans', payload);
        toast('Plan created successfully');
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      toast(err.message || 'Failed to save plan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: GymPlan) => {
    try {
      await api.put(`/gym-plans/${p.id}`, { isActive: !p.isActive });
      setPlans(prev => prev.map(x => x.id === p.id ? { ...x, isActive: !x.isActive } : x));
      toast(p.isActive ? 'Plan deactivated' : 'Plan activated');
    } catch {
      toast('Failed to update plan', 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.del(`/gym-plans/${confirmDelete.id}`);
      toast('Plan deleted');
      setConfirmDelete(null);
      load();
    } catch (err: any) {
      toast(err.message || 'Failed to delete plan', 'error');
    }
  };

  const activePlans = plans.filter(p => p.isActive).length;

  return (
    <Shell title="Individual Subscription Plans">
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass p-6 rounded-2xl" style={{ maxWidth: 380, width: '90%' }}>
            <p className="mb-5 text-sm" style={{ color: 'var(--t)' }}>Delete plan <strong>{confirmDelete.name}</strong>? Existing subscribers will not be affected.</p>
            <div className="flex gap-3 justify-end">
              <button className="btn btn-ghost text-sm" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn text-sm" style={{ background: '#ef4444', color: '#fff' }} onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass p-6 rounded-2xl" style={{ maxWidth: 540, width: '94%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="serif text-lg" style={{ color: 'var(--t)' }}>{editPlan ? 'Edit Plan' : 'Create New Plan'}</h3>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)} style={{ padding: '4px 8px' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--t3)', display: 'block', marginBottom: 5 }}>Plan Name *</label>
                <input className="glass-input" style={{ width: '100%' }} placeholder="e.g. Monthly Unlimited" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--t3)', display: 'block', marginBottom: 5 }}>Description</label>
                <textarea className="glass-input" style={{ width: '100%', resize: 'vertical', minHeight: 60 }} placeholder="What's included in this plan..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--t3)', display: 'block', marginBottom: 5 }}>Price (₹) *</label>
                  <input className="glass-input" style={{ width: '100%' }} type="number" min="0" placeholder="1499" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--t3)', display: 'block', marginBottom: 5 }}>Duration (days) *</label>
                  <input className="glass-input" style={{ width: '100%' }} type="number" min="1" placeholder="30" value={form.durationDays} onChange={e => setForm(f => ({ ...f, durationDays: e.target.value }))} required />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--t3)', display: 'block', marginBottom: 5 }}>Sessions/Day</label>
                  <input className="glass-input" style={{ width: '100%' }} type="number" min="1" max="5" placeholder="1" value={form.sessionsPerDay} onChange={e => setForm(f => ({ ...f, sessionsPerDay: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--t3)', display: 'block', marginBottom: 5 }}>Features (comma separated)</label>
                <input className="glass-input" style={{ width: '100%' }} placeholder="Unlimited access, Locker, Parking, Pool..." value={form.features} onChange={e => setForm(f => ({ ...f, features: e.target.value }))} />
              </div>
              <div className="flex gap-3 justify-end mt-2">
                <button type="button" className="btn btn-ghost text-sm" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary text-sm" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {saving ? 'Saving...' : <><Check size={14} /> {editPlan ? 'Save Changes' : 'Create Plan'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <p style={{ color: 'var(--t2)', fontSize: 13 }}>
            Manage your gym's individual subscription plans. These appear in the BMF mobile app for members to purchase directly for your gym.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
          <Plus size={15} /> Add Plan
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Plans', value: plans.length, icon: <CreditCard size={18} /> },
          { label: 'Active Plans', value: activePlans, icon: <ToggleRight size={18} /> },
          { label: 'Inactive Plans', value: plans.length - activePlans, icon: <ToggleLeft size={18} /> },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: 'rgba(204,255,0,0.1)', borderRadius: 10, padding: 10, color: 'var(--accent)' }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--t)' }}>{loading ? '—' : s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <CreditCard size={40} style={{ color: 'var(--t3)', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--t2)', marginBottom: 16 }}>No individual plans yet. Create your first plan to offer gym-specific subscriptions to members.</p>
          <button className="btn btn-primary" onClick={openCreate} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> Create First Plan
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {plans.map(p => (
            <div key={p.id} className="glass card" style={{ padding: '20px 22px', opacity: p.isActive ? 1 : 0.65 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--t)', marginBottom: 4 }}>{p.name}</div>
                  {p.description && <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.5 }}>{p.description}</div>}
                </div>
                <button onClick={() => toggleActive(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8 }}>
                  {p.isActive
                    ? <ToggleRight size={22} color="var(--accent)" />
                    : <ToggleLeft size={22} color="var(--t3)" />}
                </button>
              </div>

              <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--accent)', fontWeight: 700, fontSize: 22 }}>
                  <IndianRupee size={16} />
                  {Number(p.price).toLocaleString('en-IN')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--t2)', fontSize: 13 }}>
                  <Clock size={13} />
                  {p.durationDays} days
                </div>
              </div>

              {p.features?.length > 0 && (
                <ul style={{ margin: '0 0 14px', padding: 0, listStyle: 'none' }}>
                  {p.features.slice(0, 4).map((f, i) => (
                    <li key={i} style={{ fontSize: 12, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ color: 'var(--accent)' }}>✓</span> {f}
                    </li>
                  ))}
                  {p.features.length > 4 && <li style={{ fontSize: 12, color: 'var(--t3)' }}>+{p.features.length - 4} more</li>}
                </ul>
              )}

              <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
                <button className="btn btn-ghost text-xs" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }} onClick={() => openEdit(p)}>
                  <Edit2 size={12} /> Edit
                </button>
                <button className="btn btn-ghost text-xs" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, color: 'var(--error)' }} onClick={() => setConfirmDelete(p)}>
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Banner */}
      <div className="glass card p-4 flex items-start gap-3 mt-6" style={{ borderColor: 'rgba(204,255,0,0.12)' }}>
        <AlertTriangle size={16} color="var(--accent)" style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--t)' }}>Individual Plans Revenue Model:</strong> BMF collects subscription payments and pays your gym{' '}
          <strong style={{ color: 'var(--accent)' }}>(100% − commission rate)</strong> of the subscription fee each month.
          For multi-gym plan members visiting your gym, you get paid <strong style={{ color: 'var(--accent)' }}>per visit-day</strong> at your configured rate.
        </div>
      </div>
    </Shell>
  );
}

