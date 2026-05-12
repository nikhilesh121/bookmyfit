'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api, getPartnerId } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { Save } from 'lucide-react';

type WellnessPartner = {
  id: string;
  name?: string;
  city?: string;
  area?: string;
  address?: string;
  serviceType?: string;
  photos?: string[];
  status?: string;
};

const SERVICE_TYPES = ['spa', 'home', 'physio', 'massage', 'yoga', 'nutrition'];

export default function ProfilePage() {
  const [partner, setPartner] = useState<WellnessPartner | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    city: '',
    area: '',
    address: '',
    serviceType: '',
    photoUrl: '',
  });
  const { toast } = useToast();
  const partnerId = getPartnerId();

  useEffect(() => {
    if (!partnerId) {
      setLoading(false);
      return;
    }
    api.get<WellnessPartner>(`/wellness/partners/${partnerId}`)
      .then(data => {
        setPartner(data);
        setForm({
          name: data.name || '',
          city: data.city || '',
          area: data.area || '',
          address: data.address || '',
          serviceType: data.serviceType || '',
          photoUrl: data.photos?.[0] || '',
        });
      })
      .catch(() => toast('Could not load profile', 'error'))
      .finally(() => setLoading(false));
  }, [partnerId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerId) return;
    setSaving(true);
    try {
      const updated = await api.put<WellnessPartner>(`/wellness/partners/${partnerId}`, {
        name: form.name,
        city: form.city,
        area: form.area,
        address: form.address,
        serviceType: form.serviceType,
        photos: form.photoUrl ? [form.photoUrl] : [],
      });
      setPartner(updated);
      toast('Profile saved');
    } catch (err: any) {
      toast(err.message || 'Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const typeColor: Record<string, string> = {
    spa: '#FCD34D',
    home: '#34D399',
    physio: '#60A5FA',
    massage: '#F9A8D4',
    yoga: '#A78BFA',
    nutrition: '#3DFF54',
  };

  return (
    <Shell title="Profile">
      {loading && <p style={{ color: 'var(--t2)', fontSize: 13 }}>Loading profile...</p>}

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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Area</label>
                <input
                  type="text"
                  value={form.area}
                  onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                  placeholder="e.g. Saheed Nagar"
                  className="glass-input w-full"
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Service Type</label>
                <input
                  type="text"
                  value={form.serviceType}
                  onChange={e => setForm(f => ({ ...f, serviceType: e.target.value }))}
                  placeholder="e.g. spa"
                  className="glass-input w-full"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Address</label>
              <textarea
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Full business address"
                className="glass-input w-full"
                rows={3}
                style={{ resize: 'vertical' }}
              />
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
            <div className="flex flex-wrap gap-3">
              {SERVICE_TYPES.map(t => {
                const active = form.serviceType === t;
                const color = typeColor[t] || '#3DFF54';
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, serviceType: t }))}
                    className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition"
                    style={{
                      background: active ? `${color}22` : 'var(--glass-bg)',
                      color: active ? color : 'var(--t2)',
                      border: active ? `1px solid ${color}44` : '1px solid var(--border)',
                    }}>
                    {t}
                  </button>
                );
              })}
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
            <Save size={14} /> {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      )}
    </Shell>
  );
}
