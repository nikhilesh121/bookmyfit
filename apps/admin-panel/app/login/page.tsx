'use client';
import { useState, useEffect } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@bookmyfit.in');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('bmf_admin_token');
    if (token) { try { const p = JSON.parse(atob(token.split('.')[1])); if (p.exp * 1000 > Date.now()) window.location.href = '/'; } catch {} }
  }, []);

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'}/api/v1/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error('Invalid credentials');
      const data = await res.json();
      if (data.user?.role !== 'super_admin') throw new Error('This account does not have admin access');
      localStorage.setItem('bmf_admin_token', data.accessToken);
      localStorage.setItem('bmf_admin_user', JSON.stringify(data.user));
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass p-10 w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg" style={{ background: 'var(--accent)', color: '#000' }}>B</div>
          <div>
            <div className="serif text-xl font-bold">Book<em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--t2)' }}>My</em>Fit</div>
            <div className="text-xs" style={{ color: 'var(--accent)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const }}>Admin Console</div>
          </div>
        </div>
        <h1 className="serif text-2xl font-bold mb-1">Sign in</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--t2)' }}>Enter your credentials to continue</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="glass-input w-full" required />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="glass-input w-full" required />
          </div>
          {error && <div className="text-sm" style={{ color: '#FF3C3C' }}>{error}</div>}
          <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
