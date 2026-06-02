'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { useToast } from '../../components/Toast';
import { api } from '../../lib/api';

const NOTIF_OPTIONS = [
  'New employee onboarding',
  'Monthly usage summary',
  'Invoice reminders',
  'Inactive employee alerts',
  'Wellness insights digest',
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>({
    companyName: '',
    email: '',
    billingContact: '',
    planType: '',
    totalSeats: 0,
    pricePerSeat: 0,
    billingStatus: '',
    isActive: false,
  });
  const [notifs, setNotifs] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const corp = await api.get('/corporate/me');
      if (corp) setProfile(corp);
      const defaults: Record<string, boolean> = {};
      NOTIF_OPTIONS.forEach((n) => (defaults[n] = true));
      const saved = JSON.parse(localStorage.getItem('bmf_corp_notifs') || 'null');
      setNotifs(saved || defaults);
    } catch (e: any) {
      toast(e.message || 'Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const updated = await api.put('/corporate/me', {
        companyName: profile.companyName,
        billingContact: profile.billingContact,
      });
      setProfile(updated);
      toast('Company profile saved');
    } catch (e: any) {
      toast(e.message || 'Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleNotif = (n: string) => {
    const updated = { ...notifs, [n]: !notifs[n] };
    setNotifs(updated);
    localStorage.setItem('bmf_corp_notifs', JSON.stringify(updated));
  };

  return (
    <Shell title="Settings">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div className="glass p-6">
          <h3 className="serif text-lg mb-4">Company Profile</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Company Name</label>
              <input className="glass-input w-full" value={profile.companyName || ''} onChange={(e) => setProfile((p: any) => ({ ...p, companyName: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Account Email</label>
              <input className="glass-input w-full" type="email" value={profile.email || ''} disabled />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Billing Contact</label>
              <input className="glass-input w-full" placeholder="Finance contact or billing email" value={profile.billingContact || ''} onChange={(e) => setProfile((p: any) => ({ ...p, billingContact: e.target.value }))} />
            </div>
            <button className="btn btn-primary" onClick={saveProfile} disabled={saving || loading}>{saving ? 'Saving...' : 'Save Profile'}</button>
          </div>
        </div>

        <div className="glass p-6">
          <h3 className="serif text-lg mb-4">Notification Preferences</h3>
          <div className="space-y-3">
            {NOTIF_OPTIONS.map((n) => (
              <div key={n} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <span className="text-[13px] text-white">{n}</span>
                <button
                  onClick={() => toggleNotif(n)}
                  className="w-10 h-5 rounded-full relative transition-colors"
                  style={{ background: notifs[n] ? 'var(--accent)' : 'rgba(255,255,255,0.15)' }}
                >
                  <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all"
                    style={{ right: notifs[n] ? '2px' : undefined, left: notifs[n] ? undefined : '2px' }}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass p-6 mb-6">
        <h3 className="serif text-lg mb-4">Current Plan</h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Plan', value: profile.planType || 'Corporate' },
            { label: 'Seats', value: String(profile.totalSeats || 0) },
            { label: 'Per Seat', value: `Rs ${Number(profile.pricePerSeat || 999).toLocaleString('en-IN')}/mo` },
            { label: 'Billing', value: profile.billingStatus || 'pending' },
          ].map((item) => (
            <div key={item.label} className="card stat-glow p-4">
              <div className="text-xs font-semibold mb-1" style={{ color: 'var(--t2)' }}>{item.label}</div>
              <div className="text-lg font-bold">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass p-6" style={{ border: '1px solid rgba(255,60,60,0.25)' }}>
        <h3 className="serif text-lg mb-2" style={{ color: '#FF6060' }}>Account Status</h3>
        <p className="text-sm mb-3" style={{ color: 'var(--t2)' }}>
          {profile.isActive ? 'Your corporate account is approved by BookMyFit.' : 'Your corporate account is pending approval or suspended.'}
        </p>
        <p className="text-xs" style={{ color: 'var(--t3)' }}>Only BookMyFit admin can suspend/reactivate a corporate account or change paid seat counts.</p>
      </div>
    </Shell>
  );
}
