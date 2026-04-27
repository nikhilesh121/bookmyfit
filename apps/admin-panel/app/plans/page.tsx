'use client';
import { useState, useEffect } from 'react';
import Shell from '../../components/Shell';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';
const token = () => typeof window !== 'undefined' ? localStorage.getItem('bmf_admin_token') : '';

const PLAN_FEATURES = {
  day_pass: ['Single visit to any partner gym', 'Valid for 24 hours', 'No subscription required', 'Buy anytime, any number'],
  same_gym: ['Unlimited visits to one gym', 'Slot booking included', 'Monthly subscription', 'QR check-in'],
  multi_gym: ['Access all partner gyms', 'Switch gyms anytime', 'Slot booking included', 'Priority support'],
};

export default function PlansPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prices, setPrices] = useState({ day_pass: 149, same_gym: 599, multi_gym: 1499 });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch(`${API}/api/v1/subscriptions/plans`, {
      headers: { Authorization: `Bearer ${token()}` },
    }).then(r => r.json()).then(data => {
      setConfig(data);
      setPrices({
        day_pass: data?.day_pass?.basePrice || 149,
        same_gym: data?.same_gym?.basePrice || 599,
        multi_gym: data?.multi_gym?.basePrice || 1499,
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      await fetch(`${API}/api/v1/subscriptions/multigym-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ multi_gym: { basePrice: prices.multi_gym }, day_pass: { basePrice: prices.day_pass } }),
      });
      setMsg('Plan prices updated successfully.');
    } catch {
      setMsg('Failed to save. Please try again.');
    } finally { setSaving(false); }
  };

  const plans = [
    { key: 'day_pass', name: '1-Day Pass', description: 'Drop-in pass for a single visit', color: '#00AFFF', priceLabel: 'per visit' },
    { key: 'same_gym', name: 'Same Gym Pass', description: 'Monthly pass for a single gym', color: '#CCFF00', priceLabel: 'per month', note: 'Gym-specific pricing is set by each gym owner in Gym Management.' },
    { key: 'multi_gym', name: 'Multi Gym Pass', description: 'Monthly pass for all partner gyms', color: '#9B00FF', priceLabel: 'per month' },
  ];

  return (
    <Shell title="Plan Management">
      <div style={{ maxWidth: 800 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 className="serif" style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>Plan Management</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
            Configure the 3 subscription tiers available to users.
          </p>
        </div>

        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.5)' }}>Loading…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {plans.map(plan => (
              <div key={plan.key} className="glass" style={{ padding: 24, borderRadius: 16, borderLeft: `3px solid ${plan.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 900 }}>{plan.name}</span>
                      <span style={{ fontSize: 10, fontFamily: 'var(--sans)', letterSpacing: 1, textTransform: 'uppercase', color: plan.color, background: plan.color + '22', padding: '2px 8px', borderRadius: 100 }}>{plan.key}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{plan.description}</div>
                  </div>

                  {plan.key !== 'same_gym' ? (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Base price ({plan.priceLabel})</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>₹</span>
                        <input
                          type="number"
                          value={prices[plan.key as keyof typeof prices]}
                          onChange={e => setPrices(p => ({ ...p, [plan.key]: Number(e.target.value) }))}
                          style={{
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 8, padding: '6px 12px', color: '#fff', fontSize: 18,
                            fontWeight: 700, width: 100, textAlign: 'right',
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'right', maxWidth: 200 }}>
                      Pricing set by gym owners
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(PLAN_FEATURES[plan.key as keyof typeof PLAN_FEATURES] || []).map((f: string) => (
                    <span key={f} style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.05)', padding: '3px 10px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.08)' }}>
                      ✓ {f}
                    </span>
                  ))}
                </div>

                {(plan as any).note && (
                  <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
                    ℹ️ {(plan as any).note}
                  </div>
                )}
              </div>
            ))}

            {msg && (
              <div style={{ padding: '12px 16px', borderRadius: 8, background: msg.includes('success') ? 'rgba(61,255,84,0.1)' : 'rgba(255,68,68,0.1)', border: `1px solid ${msg.includes('success') ? 'rgba(61,255,84,0.3)' : 'rgba(255,68,68,0.3)'}`, fontSize: 13, color: msg.includes('success') ? '#3DFF54' : '#FF4444' }}>
                {msg}
              </div>
            )}

            <button
              onClick={save}
              disabled={saving}
              style={{
                alignSelf: 'flex-start', background: 'var(--accent)', color: '#060606',
                border: 'none', borderRadius: 100, padding: '12px 28px',
                fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save Plan Prices'}
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}
