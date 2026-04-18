'use client';
import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.bookmyfit.in';

export default function EarlyAccessForm() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email');
      return;
    }
    setError('');
    // Fire-and-forget — show success regardless
    fetch(`${API_BASE}/api/v1/misc/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => {});
    setDone(true);
  };

  if (done) {
    return (
      <p
        role="status"
        aria-live="polite"
        style={{
          fontSize: 18, fontWeight: 600, color: 'var(--accent)',
          padding: '24px 0',
        }}
      >
        🎉 You&apos;re on the list! We&apos;ll notify you at launch.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={{ display: 'flex', gap: 12, maxWidth: 480, margin: '0 auto 12px', flexWrap: 'wrap' }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          aria-label="Email address for waitlist"
          autoComplete="email"
          style={{
            flex: 1, minWidth: 200,
            background: 'rgba(255,255,255,0.06)',
            border: `1px solid ${error ? 'rgba(255,100,100,0.5)' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 12, padding: '14px 18px',
            color: '#fff', fontFamily: 'var(--sans)', fontSize: 14, outline: 'none',
          }}
        />
        <button type="submit" className="btn btn-primary btn-lg">
          Join Waitlist →
        </button>
      </div>
      {error && <p style={{ fontSize: 13, color: 'rgba(255,100,100,0.8)', marginBottom: 8 }}>{error}</p>}
      <p style={{ fontSize: 12, color: 'var(--t3)' }}>No spam. Unsubscribe anytime. We respect your privacy.</p>
    </form>
  );
}
