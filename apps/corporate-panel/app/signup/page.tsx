'use client';
import { useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

export default function CorporateSignup() {
  const [form, setForm] = useState({
    companyName: '', email: '', password: '', confirmPassword: '', billingContact: '', employeeCount: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    const phoneDigits = form.billingContact.replace(/\D/g, '');
    if (phoneDigits.length !== 10 && phoneDigits.length !== 12) { setError('Enter a valid 10-digit billing contact number'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/v1/auth/corporate/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: form.companyName, email: form.email,
          password: form.password, billingContact: form.billingContact,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
    padding: '11px 14px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = { fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 };

  if (done) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass p-10 w-full max-w-md text-center">
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
        <h2 className="serif text-2xl font-bold mb-3">Welcome aboard!</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--t2)', lineHeight: 1.7 }}>
          Your corporate wellness account has been created. Sign in to your dashboard to add employees and configure their gym access plans.
        </p>
        <Link href="/login" className="btn btn-primary" style={{ display: 'inline-block' }}>Sign in to dashboard</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center py-10">
      <div className="glass p-10 w-full" style={{ maxWidth: 480 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-7">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg" style={{ background: 'var(--accent)', color: '#000' }}>B</div>
          <div>
            <div className="serif text-xl font-bold">Book<em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--t2)' }}>My</em>Fit</div>
            <div className="text-xs" style={{ color: 'var(--accent)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>Corporate Wellness</div>
          </div>
        </div>

        <h1 className="serif text-2xl font-bold mb-1">Register your company</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--t2)' }}>
          Give your team multi-gym access at ₹999/employee/month.
        </p>

        {error && <div className="text-sm mb-4 p-3 rounded-lg" style={{ color: '#FF6B6B', background: 'rgba(255,100,100,0.08)', border: '1px solid rgba(255,100,100,0.2)' }}>{error}</div>}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Company Name</label>
            <input style={inputStyle} value={form.companyName} onChange={set('companyName')} placeholder="Acme Technologies Pvt. Ltd." required />
          </div>
          <div>
            <label style={labelStyle}>Work Email</label>
            <input style={inputStyle} type="email" value={form.email} onChange={set('email')} placeholder="hr@yourcompany.in" required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Password</label>
              <input style={inputStyle} type="password" value={form.password} onChange={set('password')} placeholder="Min. 6 characters" required />
            </div>
            <div>
              <label style={labelStyle}>Confirm Password</label>
              <input style={inputStyle} type="password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Re-enter" required />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Billing Contact (Phone)</label>
            <input style={inputStyle} value={form.billingContact} onChange={set('billingContact')} placeholder="+91 98765 43210" required />
          </div>

          {/* Pricing info card */}
          <div style={{ background: 'rgba(61,255,84,0.05)', border: '1px solid rgba(61,255,84,0.15)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>Corporate Plan</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)', marginBottom: 4 }}>₹999 <span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.5)' }}>/ employee / month</span></div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {['Unlimited multi-gym access for every employee', 'Automated QR check-in at 1000+ gyms', 'HR dashboard with usage analytics', 'Per-employee billing, cancel anytime'].map((item) => (
                <li key={item} style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                  <span style={{ color: 'var(--accent)' }}>✓</span> {item}
                </li>
              ))}
            </ul>
          </div>

          <button type="submit" className="btn btn-primary w-full justify-center mt-1" disabled={loading}>
            {loading ? 'Creating account…' : 'Register Company →'}
          </button>
        </form>

        <p className="text-sm mt-5 text-center" style={{ color: 'var(--t2)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
