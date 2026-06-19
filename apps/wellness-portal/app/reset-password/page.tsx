'use client';
import { useEffect, useState } from 'react';

const RAW_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';
const API_BASE = RAW_BASE.replace(/\/+$/, '').replace(/\/api\/v1$/, '');

export default function ResetPasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('bmf_wellness_token');
    if (!token) window.location.href = '/login';
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }
    const token = localStorage.getItem('bmf_wellness_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    setLoading(true);
    try {
      const resetRes = await fetch(`${API_BASE}/api/v1/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!resetRes.ok) {
        const raw = await resetRes.text();
        let message = raw || 'Password reset failed';
        try {
          const parsed = JSON.parse(raw);
          message = parsed?.message || parsed?.error || message;
        } catch {}
        throw new Error(message);
      }
      const data = await resetRes.json();
      localStorage.setItem('bmf_wellness_token', data.accessToken);
      localStorage.setItem('bmf_wellness_user', JSON.stringify(data.user));
      const meRes = await fetch(`${API_BASE}/api/v1/wellness/me`, {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });
      if (!meRes.ok) throw new Error('Password changed, but wellness profile could not be loaded. Please sign in again.');
      const partner = await meRes.json();
      localStorage.setItem('bmf_wellness_partner_id', partner?.id || '');
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass p-10 w-full max-w-md">
        <div className="serif text-2xl font-bold mb-1">Set New Password</div>
        <p className="text-sm mb-6" style={{ color: 'var(--t2)' }}>
          This temporary password must be changed before you can use the Wellness Partner Portal.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Temporary Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="glass-input w-full"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="glass-input w-full"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="glass-input w-full"
              required
              minLength={6}
            />
          </div>
          {error && <div className="text-sm" style={{ color: '#FF3C3C' }}>{error}</div>}
          <button type="submit" className="btn btn-primary w-full justify-center" disabled={loading}>
            {loading ? 'Saving...' : 'Save Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
