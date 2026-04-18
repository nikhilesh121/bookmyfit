'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { Star, Plus, Search, Edit2, UserX, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../../components/Toast';

interface Trainer {
  _id: string;
  name: string;
  specialty: string;
  sessionRateInr: number;
  bio?: string;
  status?: string;
  rating?: number;
  sessionsCount?: number;
  gymId?: string;
}

function SkeletonRow() {
  return (
    <tr style={{ opacity: 0.4 }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i}><div style={{ height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.08)', animation: 'pulse 1.5s ease-in-out infinite' }} /></td>
      ))}
    </tr>
  );
}

const EMPTY_FORM = { name: '', specialty: '', sessionRateInr: '', bio: '' };

export default function TrainersPage() {
  const { toast } = useToast();
  const [gymId, setGymId] = useState('');
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Trainer | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState<Trainer | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true); setError(null);
    try {
      const gymData = await api.get<any>('/gyms/my-gym');
      const gid = gymData._id || gymData.id || '';
      setGymId(gid);
      const data = await api.get<Trainer[]>(`/trainers?gymId=${gid}`);
      setTrainers(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load trainers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setShowModal(true); };
  const openEdit = (t: Trainer) => {
    setEditing(t);
    setForm({ name: t.name, specialty: t.specialty, sessionRateInr: String(t.sessionRateInr), bio: t.bio || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.specialty.trim()) { toast('Name and specialty are required', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        specialty: form.specialty.trim(),
        sessionRateInr: Number(form.sessionRateInr) || 0,
        bio: form.bio.trim(),
        gymId,
      };
      if (editing) {
        await api.put(`/trainers/${editing._id}`, payload);
        toast('Trainer updated', 'success');
      } else {
        await api.post('/trainers', payload);
        toast('Trainer added successfully', 'success');
      }
      setShowModal(false);
      loadData();
    } catch (e: any) {
      toast(e.message || 'Failed to save trainer', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirmDeactivate) return;
    setDeactivating(true);
    try {
      await api.put(`/trainers/${confirmDeactivate._id}`, { status: 'inactive' });
      toast(`${confirmDeactivate.name} marked inactive`, 'info');
      setConfirmDeactivate(null);
      loadData();
    } catch {
      toast('Failed to deactivate trainer', 'error');
    } finally {
      setDeactivating(false);
    }
  };

  const filtered = trainers.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.specialty.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Shell title="Trainers (PT)">
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

      {error && (
        <div className="card p-3 mb-4 text-xs" style={{ color: '#FFB400', background: 'rgba(255,180,0,0.05)', borderColor: 'rgba(255,180,0,0.3)' }}>
          <AlertTriangle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> {error}
        </div>
      )}

      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 relative">
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)', pointerEvents: 'none' }} />
          <input
            className="glass-input w-full"
            placeholder="Search by name or specialty..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
        <button className="btn btn-primary flex items-center gap-2" onClick={openAdd}>
          <Plus size={14} /> Add Trainer
        </button>
      </div>

      <div className="glass overflow-hidden">
        <table className="glass-table">
          <thead>
            <tr>
              <th>Name</th><th>Specialty</th><th>Rate/Session</th>
              <th>Sessions</th><th>Rating</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
              : filtered.length === 0
                ? <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--t2)', padding: '40px 0' }}>
                    {search ? 'No trainers match your search' : 'No trainers yet. Click Add Trainer to get started.'}
                  </td></tr>
                : filtered.map(t => (
                  <tr key={t._id}>
                    <td style={{ fontWeight: 600, color: '#fff' }}>{t.name}</td>
                    <td>{t.specialty}</td>
                    <td style={{ color: 'var(--accent)' }}>
                      {t.sessionRateInr ? `\u20B9${t.sessionRateInr.toLocaleString('en-IN')}/session` : '\u2014'}
                    </td>
                    <td>{t.sessionsCount ?? '\u2014'}</td>
                    <td>
                      {t.rating
                        ? <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            {t.rating.toFixed(1)} <Star size={11} color="#FFB400" fill="#FFB400" />
                          </span>
                        : '\u2014'}
                    </td>
                    <td>
                      <span className={t.status === 'inactive' ? 'badge-danger' : 'badge-active'}>
                        {t.status === 'inactive' ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(t)} className="btn btn-ghost" style={{ padding: '4px 10px' }} title="Edit">
                          <Edit2 size={12} />
                        </button>
                        {t.status !== 'inactive' && (
                          <button onClick={() => setConfirmDeactivate(t)} className="btn btn-ghost" style={{ padding: '4px 10px', color: '#FF6060' }} title="Deactivate">
                            <UserX size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 28, width: 440 }} onClick={e => e.stopPropagation()}>
            <h3 className="serif" style={{ fontSize: 18, marginBottom: 20 }}>
              {editing ? 'Edit Trainer' : 'Add New Trainer'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { key: 'name', label: 'Full Name *', placeholder: 'e.g. Vikram Patel', type: 'text' },
                { key: 'specialty', label: 'Specialty *', placeholder: 'e.g. Strength & Conditioning', type: 'text' },
                { key: 'sessionRateInr', label: 'Rate per Session (\u20B9)', placeholder: 'e.g. 800', type: 'number' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>{label}</label>
                  <input
                    className="glass-input w-full"
                    type={type}
                    placeholder={placeholder}
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Bio</label>
                <textarea
                  className="glass-input w-full"
                  placeholder="Short trainer bio..."
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  style={{ minHeight: 70, resize: 'vertical' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn btn-ghost flex-1" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Update Trainer' : 'Add Trainer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeactivate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setConfirmDeactivate(null)}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 28, width: 380 }} onClick={e => e.stopPropagation()}>
            <h3 className="serif" style={{ fontSize: 18, marginBottom: 12 }}>Deactivate Trainer?</h3>
            <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 20 }}>
              <strong style={{ color: '#fff' }}>{confirmDeactivate.name}</strong> will be marked as inactive and hidden from member view.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost flex-1" onClick={() => setConfirmDeactivate(null)}>Cancel</button>
              <button
                className="btn flex-1"
                style={{ background: 'rgba(255,60,60,0.15)', color: '#FF6060', border: '1px solid rgba(255,60,60,0.3)' }}
                onClick={handleDeactivate}
                disabled={deactivating}
              >
                {deactivating ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
