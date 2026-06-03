'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api, getPartnerId, getUser } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { Save } from 'lucide-react';
import LocationFields from '../../components/LocationFields';

type WellnessPartner = {
  id: string;
  name?: string;
  country?: string;
  state?: string;
  city?: string;
  area?: string;
  address?: string;
  serviceType?: string;
  serviceTypes?: string[];
  photos?: string[];
  status?: string;
};

const SERVICE_TYPES = ['spa', 'home', 'physio', 'massage', 'yoga', 'nutrition'];

export default function ProfilePage() {
  const [partner, setPartner] = useState<WellnessPartner | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [savePath, setSavePath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    country: 'India',
    state: '',
    city: '',
    area: '',
    address: '',
    serviceTypes: [] as string[],
    photoUrl: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    const user = getUser();
    const storedPartnerId = getPartnerId();
    const path = user?.role === 'wellness_partner'
      ? '/wellness/me'
      : storedPartnerId
        ? `/wellness/partners/${storedPartnerId}`
        : null;
    const nextSavePath = user?.role === 'wellness_partner'
      ? '/wellness/me'
      : storedPartnerId
        ? `/wellness/partners/${storedPartnerId}`
        : null;
    if (!path) {
      setLoading(false);
      return;
    }
    setSavePath(nextSavePath);
    api.get<WellnessPartner>(path)
      .then(data => {
        setPartner(data);
        setPartnerId(data.id);
        if (typeof window !== 'undefined' && data.id) {
          localStorage.setItem('bmf_wellness_partner_id', data.id);
        }
        const selectedTypes = Array.isArray(data.serviceTypes) && data.serviceTypes.length
          ? data.serviceTypes
          : data.serviceType
            ? [data.serviceType]
            : [];
        setForm({
          name: data.name || '',
          country: data.country || 'India',
          state: data.state || '',
          city: data.city || '',
          area: data.area || '',
          address: data.address || '',
          serviceTypes: selectedTypes.map(t => String(t).toLowerCase()),
          photoUrl: data.photos?.[0] || '',
        });
      })
      .catch(() => toast('Could not load profile', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!savePath) {
      toast('No wellness partner profile is linked to this login', 'error');
      return;
    }
    if (form.serviceTypes.length === 0) {
      toast('Select at least one service type', 'error');
      return;
    }
    setSaving(true);
    try {
      const updated = await api.put<WellnessPartner>(savePath, {
        name: form.name,
        country: form.country,
        state: form.state,
        city: form.city,
        area: form.area,
        address: form.address,
        serviceType: form.serviceTypes[0],
        serviceTypes: form.serviceTypes,
        photos: form.photoUrl ? [form.photoUrl] : [],
      });
      setPartner(updated);
      setPartnerId(updated.id);
      toast('Profile saved');
    } catch (err: any) {
      toast(err.message || 'Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleServiceType = (type: string) => {
    const key = type.toLowerCase();
    setForm(f => {
      const exists = f.serviceTypes.includes(key);
      const next = exists ? f.serviceTypes.filter(item => item !== key) : [...f.serviceTypes, key];
      return { ...f, serviceTypes: next };
    });
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

            <LocationFields
              value={{ country: form.country, state: form.state, city: form.city }}
              onChange={(location) => setForm((f) => ({ ...f, ...location }))}
              requiredCity
              inputClassName="glass-input w-full"
              gridClassName="grid grid-cols-1 md:grid-cols-3 gap-4"
            />

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
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Service Types</label>
                <input
                  type="text"
                  value={form.serviceTypes.join(', ')}
                  readOnly
                  placeholder="Select service types below"
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
                const active = form.serviceTypes.includes(t);
                const color = typeColor[t] || '#3DFF54';
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleServiceType(t)}
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
