'use client';
import { useState, useEffect } from 'react';

export default function Login() {
  const [email, setEmail] = useState('hr@techcorp.in');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('bmf_corporate_token');
    if (token) { try { const p = JSON.parse(atob(token.split('.')[1])); if (p.exp * 1000 > Date.now()) window.location.href = '/'; } catch {} }
  }, []);

  const handle = async (e: any) => {
    e.preventDefault(); setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'}/api/v1/auth/admin/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error('Invalid credentials');
      const data = await res.json();
      if (data.user?.role !== 'corporate_admin') throw new Error('This account does not have corporate access');
      localStorage.setItem('bmf_corporate_token', data.accessToken);
      localStorage.setItem('bmf_corporate_user', JSON.stringify(data.user));
      window.location.href = '/';
    } catch (err: any) { setError(err.message); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass p-10 w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg" style={{ background: 'var(--accent)', color: '#000' }}>B</div>
          <div>
            <div className="serif text-xl font-bold">Book<em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--t2)' }}>My</em>Fit</div>
            <div className="text-xs" style={{ color: 'var(--accent)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const }}>Corporate</div>
          </div>
        </div>
        <h1 className="serif text-2xl font-bold mb-1">Sign in</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--t2)' }}>BookMyFit HR Portal</p>
        <form onSubmit={handle} className="space-y-4">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Work Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Work email" className="glass-input w-full" required />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="glass-input w-full" required />
          </div>
          {error && <div className="text-sm" style={{ color: '#FF3C3C' }}>{error}</div>}
          <button type="submit" className="btn btn-primary w-full justify-center">Sign in</button>
        </form>
        <p className="text-sm mt-5 text-center" style={{ color: 'var(--t2)' }}>
          New to BookMyFit?{' '}
          <a href="/signup" style={{ color: 'var(--accent)', fontWeight: 600 }}>Register your company →</a>
        </p>
      </div>
    </div>
  );
}
