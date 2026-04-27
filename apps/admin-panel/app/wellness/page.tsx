'use client';
import { useState, useEffect } from 'react';
import Shell from '../../components/Shell';
import { Plus, Edit3, Trash2, Check, X, MapPin, Star, Clock, Tag, Building2 } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';
const token = () => typeof window !== 'undefined' ? localStorage.getItem('bmf_admin_token') : '';

const SERVICE_CATEGORIES = ['Massage', 'Cupping', 'Physio', 'Spa', 'Nutrition', 'Recovery', 'Other'];

const STATIC_PARTNERS = [
  { id: 'p1', name: 'Serenity Spa & Wellness', serviceType: 'Spa', city: 'Mumbai', area: 'Bandra', rating: 4.6, status: 'active' },
  { id: 'p2', name: 'The Royal Spa', serviceType: 'Massage', city: 'Mumbai', area: 'Andheri', rating: 4.4, status: 'active' },
  { id: 'p3', name: 'Bliss Physio Clinic', serviceType: 'Physio', city: 'Mumbai', area: 'Juhu', rating: 4.5, status: 'active' },
];

const STATIC_SERVICES = [
  { id: 's1', name: 'Full Body Massage', category: 'Massage', price: 1299, durationMinutes: 60, isActive: true, partnerId: 'p1' },
  { id: 's2', name: 'Deep Tissue Massage', category: 'Massage', price: 1599, durationMinutes: 60, isActive: true, partnerId: 'p1' },
  { id: 's3', name: 'Cupping Therapy', category: 'Cupping', price: 799, durationMinutes: 45, isActive: true, partnerId: 'p2' },
  { id: 's4', name: 'Physiotherapy Session', category: 'Physio', price: 999, durationMinutes: 60, isActive: true, partnerId: 'p3' },
  { id: 's5', name: 'Steam & Sauna', category: 'Spa', price: 499, durationMinutes: 45, isActive: true, partnerId: 'p1' },
];

const card = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: 24,
};

const input = {
  width: '100%', background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
  color: '#fff', padding: '10px 14px',
  fontFamily: 'DM Sans, sans-serif', fontSize: 14, outline: 'none',
} as React.CSSProperties;

const btn = (variant: 'green' | 'ghost' | 'red' = 'ghost') => ({
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
  fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 13,
  ...(variant === 'green' ? { background: '#CCFF00', color: '#060606' }
    : variant === 'red' ? { background: 'rgba(255,60,60,0.15)', color: '#ff6b6b', border: '1px solid rgba(255,60,60,0.2)' }
    : { background: 'rgba(255,255,255,0.07)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' }),
}) as React.CSSProperties;

const pill = (color: string) => ({
  background: `${color}22`, border: `1px solid ${color}44`,
  borderRadius: 20, padding: '3px 10px', fontSize: 11,
  fontWeight: 700, color, letterSpacing: 0.5,
} as React.CSSProperties);

type Partner = { id: string; name: string; serviceType: string; city: string; area: string; rating: number; status: string };
type Service = { id: string; name: string; category: string; price: number; durationMinutes: number; isActive: boolean; partnerId: string };

export default function WellnessPage() {
  const [tab, setTab] = useState<'services' | 'centres'>('services');
  const [partners, setPartners] = useState<Partner[]>(STATIC_PARTNERS);
  const [services, setServices] = useState<Service[]>(STATIC_SERVICES);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  // Service form
  const [showSvcForm, setShowSvcForm] = useState(false);
  const [editingSvc, setEditingSvc] = useState<Service | null>(null);
  const [svcForm, setSvcForm] = useState({ name: '', category: 'Massage', price: '', durationMinutes: '60', partnerId: '' });

  // Partner form
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [partnerForm, setPartnerForm] = useState({ name: '', serviceType: 'Spa', city: '', area: '' });

  useEffect(() => {
    // Load from API
    Promise.all([
      fetch(`${API}/api/v1/wellness/partners?page=1&limit=50`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()).catch(() => null),
      fetch(`${API}/api/v1/wellness/services/all`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()).catch(() => null),
    ]).then(([partnersRes, servicesRes]) => {
      const pts = partnersRes?.data || partnersRes;
      const svcs = servicesRes;
      if (Array.isArray(pts) && pts.length > 0) setPartners(pts);
      if (Array.isArray(svcs) && svcs.length > 0) setServices(svcs);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const saveService = async () => {
    if (!svcForm.name || !svcForm.price) return flash('Please fill all required fields');
    try {
      const body = { ...svcForm, price: Number(svcForm.price), durationMinutes: Number(svcForm.durationMinutes), isActive: true };
      const url = editingSvc ? `${API}/api/v1/wellness/services/${editingSvc.id}` : `${API}/api/v1/wellness/services`;
      const method = editingSvc ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify(body) });
      if (res.ok) {
        const created = await res.json();
        if (editingSvc) setServices(s => s.map(sv => sv.id === editingSvc.id ? { ...sv, ...svcForm, price: Number(svcForm.price), durationMinutes: Number(svcForm.durationMinutes) } : sv));
        else setServices(s => [...s, created]);
        flash('Service saved!');
      } else flash('Save failed — using local update');
    } catch { flash('Saved locally'); }
    if (!editingSvc) {
      setServices(s => [...s, { id: `local_${Date.now()}`, ...svcForm, price: Number(svcForm.price), durationMinutes: Number(svcForm.durationMinutes), isActive: true } as Service]);
    }
    setShowSvcForm(false); setEditingSvc(null);
    setSvcForm({ name: '', category: 'Massage', price: '', durationMinutes: '60', partnerId: '' });
  };

  const toggleService = (id: string) => setServices(s => s.map(sv => sv.id === id ? { ...sv, isActive: !sv.isActive } : sv));
  const deleteService = (id: string) => setServices(s => s.filter(sv => sv.id !== id));

  const savePartner = async () => {
    if (!partnerForm.name || !partnerForm.city) return flash('Please fill all required fields');
    const body = { ...partnerForm, status: 'active', rating: 0, lat: 0, lng: 0, address: partnerForm.area + ', ' + partnerForm.city, commissionRate: 25 };
    try {
      const res = await fetch(`${API}/api/v1/wellness/partners`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify(body) });
      const created = await res.json();
      setPartners(p => [...p, created.id ? created : { ...body, id: `local_${Date.now()}` }]);
    } catch { setPartners(p => [...p, { ...body, id: `local_${Date.now()}` } as Partner]); }
    flash('Spa centre added!'); setShowPartnerForm(false);
    setPartnerForm({ name: '', serviceType: 'Spa', city: '', area: '' });
  };

  const catColor: Record<string, string> = { Massage: '#CCFF00', Cupping: '#9B5DE5', Physio: '#00AFFF', Spa: '#FFD93D', Nutrition: '#3DFF54', Recovery: '#FF6B6B', Other: '#aaa' };

  return (
    <Shell title="Wellness Services">
      {/* Flash */}
      {msg && <div style={{ position: 'fixed', top: 20, right: 20, background: '#CCFF00', color: '#060606', padding: '10px 20px', borderRadius: 10, fontWeight: 700, zIndex: 9999 }}>{msg}</div>}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, color: '#fff', margin: 0 }}>Wellness Services</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: '4px 0 0' }}>Manage spa centres, services, pricing and visibility</p>
        </div>
        <button style={btn('green')} onClick={() => tab === 'services' ? setShowSvcForm(true) : setShowPartnerForm(true)}>
          <Plus size={16} /> {tab === 'services' ? 'Add Service' : 'Add Spa Centre'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['services', 'centres'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, background: tab === t ? '#CCFF00' : 'rgba(255,255,255,0.07)', color: tab === t ? '#060606' : '#fff' }}>
            {t === 'services' ? `Services (${services.length})` : `Spa Centres (${partners.length})`}
          </button>
        ))}
      </div>

      {/* Services Tab */}
      {tab === 'services' && (
        <>
          {/* Add Service Form */}
          {showSvcForm && (
            <div style={{ ...card, marginBottom: 20, borderColor: 'rgba(204,255,0,0.2)' }}>
              <h3 style={{ fontFamily: 'DM Sans', fontWeight: 700, color: '#fff', marginBottom: 16 }}>{editingSvc ? 'Edit Service' : 'New Service'}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>SERVICE NAME *</label>
                  <input style={input} placeholder="e.g. Full Body Massage" value={svcForm.name} onChange={e => setSvcForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>CATEGORY</label>
                  <select style={{ ...input, cursor: 'pointer' }} value={svcForm.category} onChange={e => setSvcForm(f => ({ ...f, category: e.target.value }))}>
                    {SERVICE_CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#111' }}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>PRICE (₹) *</label>
                  <input style={input} type="number" placeholder="999" value={svcForm.price} onChange={e => setSvcForm(f => ({ ...f, price: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>DURATION (mins)</label>
                  <input style={input} type="number" placeholder="60" value={svcForm.durationMinutes} onChange={e => setSvcForm(f => ({ ...f, durationMinutes: e.target.value }))} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>SPA CENTRE</label>
                  <select style={{ ...input, cursor: 'pointer' }} value={svcForm.partnerId} onChange={e => setSvcForm(f => ({ ...f, partnerId: e.target.value }))}>
                    <option value="" style={{ background: '#111' }}>— No centre (standalone service) —</option>
                    {partners.map(p => <option key={p.id} value={p.id} style={{ background: '#111' }}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={btn('green')} onClick={saveService}><Check size={14} /> Save Service</button>
                <button style={btn()} onClick={() => { setShowSvcForm(false); setEditingSvc(null); }}><X size={14} /> Cancel</button>
              </div>
            </div>
          )}

          {/* Services List */}
          <div style={{ display: 'grid', gap: 10 }}>
            {services.map(svc => {
              const partner = partners.find(p => p.id === svc.partnerId);
              const cc = catColor[svc.category] || '#aaa';
              return (
                <div key={svc.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 16, opacity: svc.isActive ? 1 : 0.5 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <Text style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 16, color: '#fff' }}>{svc.name}</Text>
                      <span style={pill(cc)}>{svc.category}</span>
                      {!svc.isActive && <span style={pill('#888')}>Hidden</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#CCFF00', fontWeight: 700, fontSize: 15 }}>
                        ₹{svc.price.toLocaleString('en-IN')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                        <Clock size={13} /> {svc.durationMinutes} min
                      </div>
                      {partner && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                          <Building2 size={13} /> {partner.name}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={btn()} onClick={() => toggleService(svc.id)} title={svc.isActive ? 'Hide' : 'Show'}>
                      {svc.isActive ? <><X size={13} /> Hide</> : <><Check size={13} /> Show</>}
                    </button>
                    <button style={btn()} onClick={() => { setEditingSvc(svc); setSvcForm({ name: svc.name, category: svc.category, price: String(svc.price), durationMinutes: String(svc.durationMinutes), partnerId: svc.partnerId || '' }); setShowSvcForm(true); }}>
                      <Edit3 size={13} /> Edit
                    </button>
                    <button style={btn('red')} onClick={() => deleteService(svc.id)}><Trash2 size={13} /></button>
                  </div>
                </div>
              );
            })}
            {services.length === 0 && (
              <div style={{ ...card, textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 48 }}>
                No wellness services yet. Click "Add Service" to get started.
              </div>
            )}
          </div>
        </>
      )}

      {/* Spa Centres Tab */}
      {tab === 'centres' && (
        <>
          {showPartnerForm && (
            <div style={{ ...card, marginBottom: 20, borderColor: 'rgba(204,255,0,0.2)' }}>
              <h3 style={{ fontFamily: 'DM Sans', fontWeight: 700, color: '#fff', marginBottom: 16 }}>Add Spa Centre</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>CENTRE NAME *</label>
                  <input style={input} placeholder="e.g. Serenity Spa & Wellness" value={partnerForm.name} onChange={e => setPartnerForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>SERVICE TYPE</label>
                  <select style={{ ...input, cursor: 'pointer' }} value={partnerForm.serviceType} onChange={e => setPartnerForm(f => ({ ...f, serviceType: e.target.value }))}>
                    {SERVICE_CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#111' }}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>CITY *</label>
                  <input style={input} placeholder="Mumbai" value={partnerForm.city} onChange={e => setPartnerForm(f => ({ ...f, city: e.target.value }))} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>AREA / LOCALITY</label>
                  <input style={input} placeholder="Bandra West" value={partnerForm.area} onChange={e => setPartnerForm(f => ({ ...f, area: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={btn('green')} onClick={savePartner}><Check size={14} /> Add Centre</button>
                <button style={btn()} onClick={() => setShowPartnerForm(false)}><X size={14} /> Cancel</button>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gap: 10 }}>
            {partners.map(p => {
              const cc = catColor[p.serviceType] || '#aaa';
              const partnerServices = services.filter(s => s.partnerId === p.id);
              return (
                <div key={p.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `${cc}22`, border: `1px solid ${cc}44`, alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
                    <Building2 size={20} color={cc} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 16, color: '#fff' }}>{p.name}</span>
                      <span style={pill(cc)}>{p.serviceType}</span>
                      <span style={pill(p.status === 'active' ? '#3DFF54' : '#888')}>{p.status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                        <MapPin size={13} /> {p.area}, {p.city}
                      </div>
                      {p.rating > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#FFD93D', fontSize: 13, fontWeight: 700 }}>
                          <Star size={13} /> {p.rating}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                        <Tag size={13} /> {partnerServices.length} service{partnerServices.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <button style={btn()} onClick={() => { setTab('services'); setShowSvcForm(true); setSvcForm(f => ({ ...f, partnerId: p.id })); }}>
                    <Plus size={13} /> Add Service
                  </button>
                </div>
              );
            })}
            {partners.length === 0 && (
              <div style={{ ...card, textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 48 }}>
                No spa centres yet. Click "Add Spa Centre" to get started.
              </div>
            )}
          </div>
        </>
      )}
    </Shell>
  );
}

// Inline text helper to avoid JSX Text issues
const Text = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <span style={style}>{children}</span>
);
