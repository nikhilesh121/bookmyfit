'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';
const GYM_PANEL   = process.env.NEXT_PUBLIC_GYM_PANEL_URL   || 'http://localhost:3005';
const CORP_PANEL  = process.env.NEXT_PUBLIC_CORP_PANEL_URL  || 'http://localhost:3002';

type Tab = 'gym' | 'corporate';

interface GymForm {
  name: string; email: string; password: string; confirm: string;
  gymName: string; city: string; area: string; address: string;
}
interface CorpForm {
  companyName: string; email: string; password: string; confirm: string; billingContact: string;
}

function OnboardContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>('gym');
  const [gymStep, setGymStep] = useState(1);
  const [gymForm, setGymForm] = useState<GymForm>({ name: '', email: '', password: '', confirm: '', gymName: '', city: '', area: '', address: '' });
  const [corpForm, setCorpForm] = useState<CorpForm>({ companyName: '', email: '', password: '', confirm: '', billingContact: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<'gym' | 'corporate' | null>(null);

  useEffect(() => {
    const t = searchParams.get('tab') as Tab;
    if (t === 'gym' || t === 'corporate') setTab(t);
  }, [searchParams]);

  const handleGymSubmit = async () => {
    if (gymStep === 1) {
      if (!gymForm.name || !gymForm.email || !gymForm.password) { setError('All fields are required.'); return; }
      if (gymForm.password !== gymForm.confirm) { setError('Passwords do not match.'); return; }
      setError(''); setGymStep(2); return;
    }
    if (!gymForm.gymName || !gymForm.city || !gymForm.area || !gymForm.address) { setError('All fields are required.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/v1/auth/gym/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: gymForm.name, email: gymForm.email, password: gymForm.password, gymName: gymForm.gymName, city: gymForm.city, area: gymForm.area, address: gymForm.address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      setSuccess('gym');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally { setLoading(false); }
  };

  const handleCorpSubmit = async () => {
    if (!corpForm.companyName || !corpForm.email || !corpForm.password || !corpForm.billingContact) { setError('All fields are required.'); return; }
    if (corpForm.password !== corpForm.confirm) { setError('Passwords do not match.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/v1/auth/corporate/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: corpForm.companyName, email: corpForm.email, password: corpForm.password, billingContact: corpForm.billingContact }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      setSuccess('corporate');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally { setLoading(false); }
  };

  const Input = ({ label, type = 'text', placeholder, value, onChange }: { label: string; type?: string; placeholder: string; value: string; onChange: (v: string) => void }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 16px', color: '#fff', fontSize: '0.9rem', outline: 'none', width: '100%', fontFamily: 'inherit' }}
        onFocus={e => { e.target.style.borderColor = 'rgba(61,255,84,0.4)'; e.target.style.background = 'rgba(61,255,84,0.03)'; }}
        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
      />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#060606', position: 'relative', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: rgba(255,255,255,0.25); }
        .ob-tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 11px 16px; border-radius: 8px; border: 1px solid transparent; background: transparent; color: rgba(255,255,255,0.4); font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.2s; font-family: inherit; }
        .ob-tab:hover { color: rgba(255,255,255,0.8); }
        .ob-tab.active { background: rgba(61,255,84,0.1); color: #3DFF54; border-color: rgba(61,255,84,0.25); }
        .ob-btn-primary { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px 24px; border-radius: 12px; border: none; background: #3DFF54; color: #060606; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: inherit; }
        .ob-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 32px rgba(61,255,84,0.3); filter: brightness(1.05); }
        .ob-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .ob-btn-ghost { display: flex; align-items: center; justify-content: center; padding: 13px 24px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.12); background: transparent; color: rgba(255,255,255,0.7); font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: all 0.2s; font-family: inherit; }
        .ob-btn-ghost:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.2); }
        @media (max-width: 900px) { .ob-main { grid-template-columns: 1fr !important; } .ob-trust { flex-direction: row !important; overflow-x: auto; } }
        @media (max-width: 480px) { .ob-card { padding: 24px 20px !important; } .ob-nav { padding: 16px 20px !important; } .ob-form-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* BG orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', width: 600, height: 600, background: 'radial-gradient(circle, #3DFF54 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.2, top: -200, right: -100 }} />
        <div style={{ position: 'absolute', width: 500, height: 500, background: 'radial-gradient(circle, #1a6e23 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.2, bottom: -150, left: -100 }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(61,255,84,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Nav */}
      <nav className="ob-nav" style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 40px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(6,6,6,0.4)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="8" fill="#3DFF54" fillOpacity="0.15"/><path d="M7 14 C7 10 10 7 14 7 C18 7 21 10 21 14 C21 18 18 21 14 21" stroke="#3DFF54" strokeWidth="2" strokeLinecap="round"/><circle cx="14" cy="14" r="3" fill="#3DFF54"/></svg>
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>BookMyFit</span>
        </Link>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '0.875rem' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to Home
        </Link>
      </nav>

      {/* Main */}
      <div className="ob-main" style={{ position: 'relative', zIndex: 1, maxWidth: 1060, margin: '0 auto', padding: '48px 24px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 28, alignItems: 'start' }}>

        {/* Card */}
        <div className="ob-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '36px 32px', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(61,255,84,0.1)', border: '1px solid rgba(61,255,84,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M6 14L11 19L22 8" stroke="#3DFF54" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.6rem', fontWeight: 700, color: '#fff', marginBottom: 12 }}>Registration Successful</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: 380, margin: '0 auto 32px' }}>
                {success === 'gym'
                  ? 'Your gym has been registered. Our team will review and approve your account within 24 hours.'
                  : 'Your company has been registered. You can now log in and manage your team.'}
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href={`${success === 'gym' ? GYM_PANEL : CORP_PANEL}/login`} className="ob-btn-primary" style={{ width: 'auto', padding: '13px 28px', textDecoration: 'none', borderRadius: 12 }}>
                  Go to {success === 'gym' ? 'Gym' : 'Corporate'} Dashboard →
                </a>
                <Link href="/" className="ob-btn-ghost" style={{ textDecoration: 'none' }}>Back to Home</Link>
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#3DFF54', marginBottom: 8 }}>Get Started</div>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.6rem,4vw,2.2rem)', fontWeight: 700, color: '#fff', marginBottom: 8 }}>Join the Network</h1>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', lineHeight: 1.6 }}>Register as a gym partner or corporate client.</p>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 28, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 5 }}>
                <button className={`ob-tab${tab === 'gym' ? ' active' : ''}`} onClick={() => { setTab('gym'); setGymStep(1); setError(''); }}>
                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M2 13V7L9 4L16 7V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><rect x="6" y="10" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>
                  Register Gym
                </button>
                <button className={`ob-tab${tab === 'corporate' ? ' active' : ''}`} onClick={() => { setTab('corporate'); setError(''); }}>
                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M6 7H12M6 10H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Register Company
                </button>
              </div>

              {/* Gym Form */}
              {tab === 'gym' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {/* Step indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    {[1, 2].map((s) => (
                      <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: gymStep >= s ? '#3DFF54' : 'rgba(255,255,255,0.06)', border: `1.5px solid ${gymStep >= s ? '#3DFF54' : 'rgba(255,255,255,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: gymStep >= s ? '#000' : 'rgba(255,255,255,0.3)' }}>
                          {gymStep > s ? '✓' : s}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: gymStep >= s ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)', fontWeight: gymStep >= s ? 500 : 400 }}>{s === 1 ? 'Account' : 'Gym Details'}</span>
                        {s < 2 && <div style={{ width: 32, height: 1, background: 'rgba(255,255,255,0.1)', marginLeft: 4 }} />}
                      </div>
                    ))}
                  </div>

                  {gymStep === 1 && (<>
                    <Input label="Full Name" placeholder="John Smith" value={gymForm.name} onChange={v => setGymForm(p => ({ ...p, name: v }))} />
                    <Input label="Email Address" type="email" placeholder="john@mygym.com" value={gymForm.email} onChange={v => setGymForm(p => ({ ...p, email: v }))} />
                    <Input label="Password" type="password" placeholder="Min 8 characters" value={gymForm.password} onChange={v => setGymForm(p => ({ ...p, password: v }))} />
                    <Input label="Confirm Password" type="password" placeholder="Repeat password" value={gymForm.confirm} onChange={v => setGymForm(p => ({ ...p, confirm: v }))} />
                  </>)}

                  {gymStep === 2 && (<>
                    <Input label="Gym / Club Name" placeholder="Iron Paradise Gym" value={gymForm.gymName} onChange={v => setGymForm(p => ({ ...p, gymName: v }))} />
                    <div className="ob-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <Input label="City" placeholder="Mumbai" value={gymForm.city} onChange={v => setGymForm(p => ({ ...p, city: v }))} />
                      <Input label="Area" placeholder="Bandra West" value={gymForm.area} onChange={v => setGymForm(p => ({ ...p, area: v }))} />
                    </div>
                    <Input label="Full Address" placeholder="123, Main St, Bandra West, Mumbai" value={gymForm.address} onChange={v => setGymForm(p => ({ ...p, address: v }))} />
                  </>)}

                  {error && <div style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 10, padding: '10px 14px', color: '#ff8080', fontSize: '0.85rem' }}>{error}</div>}

                  <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                    {gymStep === 2 && <button className="ob-btn-ghost" onClick={() => { setGymStep(1); setError(''); }} style={{ width: '40%' }}>← Back</button>}
                    <button className="ob-btn-primary" onClick={handleGymSubmit} disabled={loading} style={{ flex: 1 }}>
                      {loading ? 'Creating account…' : gymStep === 1 ? 'Continue →' : 'Create Account'}
                    </button>
                  </div>
                </div>
              )}

              {/* Corporate Form */}
              {tab === 'corporate' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <Input label="Company Name" placeholder="Acme Corp Ltd." value={corpForm.companyName} onChange={v => setCorpForm(p => ({ ...p, companyName: v }))} />
                  <Input label="Work Email" type="email" placeholder="hr@acmecorp.com" value={corpForm.email} onChange={v => setCorpForm(p => ({ ...p, email: v }))} />
                  <Input label="Billing Contact" placeholder="+91 98765 43210" value={corpForm.billingContact} onChange={v => setCorpForm(p => ({ ...p, billingContact: v }))} />
                  <Input label="Password" type="password" placeholder="Min 8 characters" value={corpForm.password} onChange={v => setCorpForm(p => ({ ...p, password: v }))} />
                  <Input label="Confirm Password" type="password" placeholder="Repeat password" value={corpForm.confirm} onChange={v => setCorpForm(p => ({ ...p, confirm: v }))} />

                  {error && <div style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 10, padding: '10px 14px', color: '#ff8080', fontSize: '0.85rem' }}>{error}</div>}

                  <div style={{ paddingTop: 4 }}>
                    <button className="ob-btn-primary" onClick={handleCorpSubmit} disabled={loading}>
                      {loading ? 'Creating account…' : 'Create Account'}
                    </button>
                  </div>
                </div>
              )}

              <p style={{ marginTop: 22, textAlign: 'center', fontSize: '0.875rem', color: 'rgba(255,255,255,0.35)' }}>
                Already registered?{' '}
                <a href={`${tab === 'gym' ? GYM_PANEL : CORP_PANEL}/login`} style={{ color: '#3DFF54', textDecoration: 'none' }}>Log in to your portal →</a>
              </p>
            </>
          )}
        </div>

        {/* Trust sidebar */}
        <div className="ob-trust" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { icon: 'M12 3L14.5 8.5L21 9.3L16.5 13.6L17.8 20L12 16.9L6.2 20L7.5 13.6L3 9.3L9.5 8.5L12 3Z', title: 'Trusted by 500+ gyms', body: 'Across 20+ cities in India' },
            { icon: 'M9 12L11 14L15 10M21 12a9 9 0 11-18 0 9 9 0 0118 0z', title: 'Zero setup fee', body: 'Go live in under 24 hours' },
            { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', title: 'Bank-grade security', body: '256-bit SSL encryption' },
          ].map(({ icon, title, body }) => (
            <div key={title} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 14, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(61,255,84,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3DFF54" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={icon}/></svg>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', marginBottom: 3 }}>{title}</div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>{body}</div>
              </div>
            </div>
          ))}

          <div style={{ background: 'rgba(61,255,84,0.04)', border: '1px solid rgba(61,255,84,0.15)', borderRadius: 16, padding: '18px 20px', marginTop: 4 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#3DFF54', marginBottom: 10 }}>What happens next</div>
            {['Your account is created instantly', 'Team reviews gym/company details', 'Go live within 24 hours', 'Start earning or managing'].map((s, i) => (
              <div key={s} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: i < 3 ? 10 : 0 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(61,255,84,0.12)', border: '1px solid rgba(61,255,84,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#3DFF54', flexShrink: 0 }}>{i + 1}</div>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OnboardPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#060606', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>Loading…</div>
      </div>
    }>
      <OnboardContent />
    </Suspense>
  );
}


