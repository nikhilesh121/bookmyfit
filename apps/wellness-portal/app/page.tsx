'use client';
import { useEffect, useState } from 'react';
import Shell from '../components/Shell';
import { Dumbbell, Calendar, Star, DollarSign, TrendingUp, Users } from 'lucide-react';
import { api, getPartnerId } from '../lib/api';
import Link from 'next/link';

type Booking = {
  id: string;
  userName?: string;
  serviceName?: string;
  scheduledAt?: string;
  amount?: number;
  status?: string;
};

type Service = { id: string; name: string };

function timeAgo(iso: string) {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  return `${Math.floor(diffMin / 1440)}d ago`;
}

function statusBadge(s?: string) {
  if (!s) return <span className="badge-pending">unknown</span>;
  if (s === 'confirmed' || s === 'completed') return <span className="badge-active">{s}</span>;
  if (s === 'cancelled') return <span className="badge-danger">{s}</span>;
  return <span className="badge-pending">{s}</span>;
}

export default function WellnessDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [partnerId, setPartnerId] = useState<string | null>(null);

  useEffect(() => {
    const pid = getPartnerId();
    setPartnerId(pid);
    if (!pid) { setLoading(false); return; }

    const fetchAll = async () => {
      setLoading(true);
      const results = await Promise.allSettled([
        api.get<Booking[]>(`/wellness/${pid}/bookings`),
        api.get<Service[]>(`/wellness/${pid}/services`),
      ]);
      if (results[0].status === 'fulfilled') setBookings(results[0].value ?? []);
      if (results[1].status === 'fulfilled') setServices(results[1].value ?? []);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const activeBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'pending');
  const revenue = bookings
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + (b.amount || 0), 0);

  const stats = [
    { label: 'Total Services', value: String(services.length), change: 'offered', icon: Dumbbell },
    { label: 'Active Bookings', value: String(activeBookings.length), change: 'live', icon: Calendar },
    { label: 'Revenue This Month', value: `₹${revenue.toLocaleString()}`, change: 'MTD', icon: DollarSign },
    { label: 'Avg Rating', value: '—', change: 'coming soon', icon: Star },
    { label: 'Total Bookings', value: String(bookings.length), change: 'all time', icon: Users },
    { label: 'Completion Rate', value: bookings.length ? `${Math.round((bookings.filter(b => b.status === 'completed').length / bookings.length) * 100)}%` : '—', change: 'success', icon: TrendingUp },
  ];

  return (
    <Shell title="Dashboard">
      {loading && <div className="text-sm mb-4" style={{ color: 'var(--t2)' }}>Loading dashboard…</div>}

      {!partnerId && !loading && (
        <div className="glass p-6 mb-6" style={{ borderColor: 'rgba(255,180,0,0.3)' }}>
          <p className="text-sm" style={{ color: '#FFB400' }}>
            No partner ID found. Please <Link href="/login" className="underline">sign in again</Link> and enter your Wellness Partner ID.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card stat-glow p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
                  <Icon size={16} style={{ color: 'var(--accent)' }} />
                </div>
                <span className="accent-pill">{s.change}</span>
              </div>
              <div className="text-2xl font-bold tracking-tight">{s.value}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--t2)' }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass p-6">
          <h3 className="serif text-lg mb-4">Recent Bookings</h3>
          {bookings.length === 0 ? (
            <p style={{ color: 'var(--t2)', fontSize: 13 }}>No bookings yet.</p>
          ) : (
            <div className="space-y-4">
              {bookings.slice(0, 6).map((b) => (
                <div key={b.id} className="flex items-center justify-between" style={{ fontSize: 13 }}>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                      {(b.userName || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-white font-semibold">{b.userName || 'Guest'}</span>
                      {b.serviceName && (
                        <span className="ml-2" style={{ color: 'var(--t2)', fontSize: 11 }}>{b.serviceName}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {statusBadge(b.status)}
                    {b.scheduledAt && (
                      <span style={{ color: 'var(--t3)', fontSize: 12 }}>{timeAgo(b.scheduledAt)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass p-6">
          <h3 className="serif text-lg mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/services" className="btn btn-primary text-sm justify-center">Manage Services</Link>
            <Link href="/bookings" className="btn btn-ghost text-sm justify-center">View Bookings</Link>
            <Link href="/profile" className="btn btn-ghost text-sm justify-center">Edit Profile</Link>
            <Link href="/services" className="btn btn-ghost text-sm justify-center">Add Service</Link>
          </div>
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="kicker mb-2">Partner Status</div>
            <div className="flex items-center gap-2">
              <span className="badge-active">active</span>
              {partnerId && <span style={{ fontSize: 12, color: 'var(--t2)' }}>ID: {partnerId}</span>}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
