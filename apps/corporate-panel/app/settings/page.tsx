'use client';
import { useState, useEffect } from 'react';
import Shell from '../../components/Shell';
import { useToast } from '../../components/Toast';
import { X } from 'lucide-react';

const PROFILE_KEY = 'bmf_corp_profile';
const NOTIF_KEY = 'bmf_corp_notifs';

const NOTIF_OPTIONS = [
  'New employee onboarding',
  'Monthly usage summary',
  'Invoice reminders',
  'Inactive employee alerts',
  'Wellness insights digest',
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState({
    companyName: 'TechCorp Solutions Pvt Ltd',
    hrEmail: 'hr@techcorp.in',
    billingAddress: '',
    industry: 'Information Technology',
    gstin: '27AABCT1234C1ZV',
  });
  const [notifs, setNotifs] = useState<Record<string, boolean>>({});
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
      if (saved) setProfile((p) => ({ ...p, ...saved }));
      const savedNotifs = JSON.parse(localStorage.getItem(NOTIF_KEY) || 'null');
      if (savedNotifs) setNotifs(savedNotifs);
      else {
        const defaults: Record<string, boolean> = {};
        NOTIF_OPTIONS.forEach((n) => (defaults[n] = true));
        setNotifs(defaults);
      }
    } catch {}
  }, []);

  const saveProfile = () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    toast('Company profile saved');
  };

  const toggleNotif = (n: string) => {
    const updated = { ...notifs, [n]: !notifs[n] };
    setNotifs(updated);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(updated));
  };

  return (
    <Shell title="Settings">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div className="glass p-6">
          <h3 className="serif text-lg mb-4">Company Profile</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Company Name</label>
              <input className="glass-input w-full" value={profile.companyName} onChange={(e) => setProfile((p) => ({ ...p, companyName: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>HR Email</label>
              <input className="glass-input w-full" type="email" value={profile.hrEmail} onChange={(e) => setProfile((p) => ({ ...p, hrEmail: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Billing Address</label>
              <input className="glass-input w-full" placeholder="123 Business Park, Mumbai" value={profile.billingAddress} onChange={(e) => setProfile((p) => ({ ...p, billingAddress: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Industry</label>
              <input className="glass-input w-full" value={profile.industry} onChange={(e) => setProfile((p) => ({ ...p, industry: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>GSTIN</label>
              <input className="glass-input w-full" value={profile.gstin} onChange={(e) => setProfile((p) => ({ ...p, gstin: e.target.value }))} />
            </div>
            <button className="btn btn-primary" onClick={saveProfile}>Save Profile</button>
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
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-white">Elite Corporate Plan</p>
            <p className="text-xs mt-1" style={{ color: 'var(--t2)' }}>Access to all partner gyms · Priority support · Advanced analytics</p>
          </div>
          <div className="flex gap-3 items-center">
            <span className="accent-pill">Active</span>
            <button className="btn btn-ghost text-sm" onClick={() => toast('Contact sales@bookmyfit.in to upgrade', 'info')}>Upgrade Plan</button>
          </div>
        </div>
      </div>

      <div className="glass p-6" style={{ border: '1px solid rgba(255,60,60,0.25)' }}>
        <h3 className="serif text-lg mb-2" style={{ color: '#FF6060' }}>Danger Zone</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--t2)' }}>Deactivating your account will suspend all employee access immediately.</p>
        <button className="btn text-sm" style={{ background: 'rgba(255,60,60,0.15)', border: '1px solid rgba(255,60,60,0.3)', color: '#FF6060' }}
          onClick={() => setShowDeactivate(true)}>
          Deactivate Account
        </button>
      </div>

      {showDeactivate && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}>
          <div className="glass p-7 w-full max-w-sm" style={{ border: '1px solid rgba(255,60,60,0.3)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="serif text-xl" style={{ color: '#FF6060' }}>Confirm Deactivation</h3>
              <button onClick={() => { setShowDeactivate(false); setConfirmText(''); }} style={{ color: 'var(--t2)' }}><X size={18} /></button>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--t2)' }}>Type <strong className="text-white">DEACTIVATE</strong> to confirm.</p>
            <input className="glass-input w-full mb-4" placeholder="DEACTIVATE" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
            <button
              disabled={confirmText !== 'DEACTIVATE'}
              className="btn w-full justify-center"
              style={{ background: confirmText === 'DEACTIVATE' ? 'rgba(255,60,60,0.8)' : 'rgba(255,60,60,0.2)', color: '#fff', opacity: confirmText === 'DEACTIVATE' ? 1 : 0.5 }}
              onClick={() => { toast('Deactivation request submitted. Our team will contact you.', 'info'); setShowDeactivate(false); setConfirmText(''); }}
            >
              Deactivate Account
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}
