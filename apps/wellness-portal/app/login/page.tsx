'use client';
import { useState, useEffect } from 'react';

export default function Login() {
  const [email, setEmail] = useState('admin@bookmyfit.in');
  const [password, setPassword] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('bmf_wellness_token');
    if (token) { try { const p = JSON.parse(atob(token.split('.')[1])); if (p.exp * 1000 > Date.now()) window.location.href = '/'; } catch {} }
  }, []);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'}/api/v1/auth/admin/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }
      );
      if (!res.ok) throw new Error('Invalid credentials');
      const data = await res.json();
      localStorage.setItem('bmf_wellness_token', data.accessToken);
      localStorage.setItem('bmf_wellness_user', JSON.stringify(data.user));
      // Store partner ID — user can set it manually or it's derived from the response
      const pid = partnerId.trim() || data.user?.partnerId || data.user?.id || '';
      localStorage.setItem('bmf_wellness_partner_id', pid);
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass p-10 w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg"
            style={{ background: 'var(--accent)', color: '#000' }}>
            W
          </div>
          <div>
            <div className="serif text-xl font-bold">
              Book<em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--t2)' }}>My</em>Fit
            </div>
            <div
              className="text-xs"
              style={{ color: 'var(--accent)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>
              Wellness Partner
            </div>
          </div>
        </div>

        <h1 className="serif text-2xl font-bold mb-1">Sign in</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--t2)' }}>BookMyFit Wellness Partner Portal</p>

        <form onSubmit={handle} className="space-y-4">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@bookmyfit.in"
              className="glass-input w-full"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="glass-input w-full"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>
              Wellness Partner ID <span style={{ color: 'var(--t3)' }}>(optional — leave blank to auto-detect)</span>
            </label>
            <input
              type="text"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              placeholder="e.g. wp_123abc"
              className="glass-input w-full"
            />
          </div>

          {error && <div className="text-sm" style={{ color: '#FF3C3C' }}>{error}</div>}

          <button type="submit" className="btn btn-primary w-full justify-center" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-xs mt-6 text-center" style={{ color: 'var(--t3)' }}>
          Use admin@bookmyfit.in / admin123 for testing
        </p>
      </div>
    </div>
  );
}
