'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api, getPartnerId } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { Save } from 'lucide-react';

type WellnessPartner = {
  id: string;
  name?: string;
  description?: string;
  city?: string;
  serviceTypes?: string[];
  businessHours?: string;
  photoUrl?: string;
  email?: string;
  phone?: string;
  status?: string;
};

const SERVICE_TYPES = ['yoga', 'physio', 'nutrition', 'meditation', 'spa', 'training'];

export default function ProfilePage() {
  const [partner, setPartner] = useState<WellnessPartner | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    city: '',
    serviceTypes: [] as string[],
    businessHours: '',
    photoUrl: '',
    phone: '',
    email: '',
  });
  const { toast } = useToast();
  const partnerId = getPartnerId();

  useEffect(() => {
    if (!partnerId) { setLoading(false); return; }
    api.get<WellnessPartner>(`/wellness/${partnerId}`)
      .then(data => {
        setPartner(data);
        setForm({
          name: data.name || '',
          description: data.description || '',
          city: data.city || '',
          serviceTypes: data.serviceTypes || [],
          businessHours: data.businessHours || '',
          photoUrl: data.photoUrl || '',
          phone: data.phone || '',
          email: data.email || '',
        });
      })
      .catch(() => toast('Could not load profile', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const toggleType = (t: string) => {
    setForm(f => ({
      ...f,
      serviceTypes: f.serviceTypes.includes(t)
        ? f.serviceTypes.filter(x => x !== t)
        : [...f.serviceTypes, t],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerId) return;
    setSaving(true);
    try {
      await api.put(`/wellness/${partnerId}`, form);
      toast('Profile saved');
    } catch (err: any) {
      toast(err.message || 'Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const typeColor: Record<string, string> = {
    yoga: '#A78BFA', physio: '#60A5FA', nutrition: '#34D399',
    meditation: '#F9A8D4', spa: '#FCD34D', training: '#3DFF54',
  };

  return (
    <Shell title="Profile">
      {loading && <p style={{ color: 'var(--t2)', fontSize: 13 }}>Loading profile…</p>}

      {!loading && (
        <form onSubmit={handleSave} className="max-w-2xl space-y-6">
          <div className="glass p-6 space-y-4">
            <h2 className="serif text-lg mb-2">Business Information</h2>

            {form.photoUrl && (
              <div className="mb-4">
                <img
                  src={form.photoUrl}
                  alt="Profile"
                  className="w-20 h-20 rounded-xl object-cover"
                  style={{ border: '2px solid var(--glass-border)' }}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Company Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Your wellness brand name"
                  className="glass-input w-full"
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="e.g. Mumbai"
                  className="glass-input w-full"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe your wellness services…"
                className="glass-input w-full"
                rows={4}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="contact@yourstudio.com"
                  className="glass-input w-full"
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="glass-input w-full"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Profile Photo URL</label>
              <input
                type="url"
                value={form.photoUrl}
                onChange={e => setForm(f => ({ ...f, photoUrl: e.target.value }))}
                placeholder="https://example.com/photo.jpg"
                className="glass-input w-full"
              />
            </div>
          </div>

          <div className="glass p-6">
            <h2 className="serif text-lg mb-4">Service Types</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--t2)' }}>Select all that apply to your wellness practice</p>
            <div className="flex flex-wrap gap-3">
              {SERVICE_TYPES.map(t => {
                const active = form.serviceTypes.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition"
                    style={{
                      background: active ? `${typeColor[t]}22` : 'var(--glass-bg)',
                      color: active ? typeColor[t] : 'var(--t2)',
                      border: active ? `1px solid ${typeColor[t]}44` : '1px solid var(--border)',
                    }}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass p-6">
            <h2 className="serif text-lg mb-4">Business Hours</h2>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>
                Hours of Operation
              </label>
              <input
                type="text"
                value={form.businessHours}
                onChange={e => setForm(f => ({ ...f, businessHours: e.target.value }))}
                placeholder="e.g. Mon-Sat 6:00 AM – 9:00 PM, Sun 7:00 AM – 7:00 PM"
                className="glass-input w-full"
              />
            </div>
          </div>

          {partner && (
            <div className="glass p-4 flex items-center gap-3">
              <span className="kicker">Status</span>
              <span className={partner.status === 'active' ? 'badge-active' : 'badge-pending'}>
                {partner.status || 'active'}
              </span>
              <span style={{ fontSize: 12, color: 'var(--t3)', marginLeft: 'auto' }}>
                Partner ID: {partnerId}
              </span>
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={14} /> {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      )}
    </Shell>
  );
}
