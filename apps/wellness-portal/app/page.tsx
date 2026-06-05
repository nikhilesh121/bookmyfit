'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Dumbbell, Calendar, Star, DollarSign, TrendingUp, Users } from 'lucide-react';
import Shell from '../components/Shell';
import { api, getPartnerId, getUser } from '../lib/api';
import {
  bookingScheduledAt,
  bookingServiceName,
  bookingUser,
  numberValue,
  WellnessBooking,
  WellnessPartnerSummary,
} from '../lib/wellness';

type Service = { id: string; name: string };

function timeAgo(iso: string) {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  return `${Math.floor(diffMin / 1440)}d ago`;
}

function statusBadge(status?: string) {
  if (!status) return <span className="badge-pending">unknown</span>;
  if (status === 'confirmed' || status === 'completed') return <span className="badge-active">{status}</span>;
  if (status === 'cancelled') return <span className="badge-danger">{status}</span>;
  return <span className="badge-pending">{status}</span>;
}

function formatCurrency(value: number) {
  return `\u20B9${value.toLocaleString('en-IN')}`;
}

function isInCurrentMonth(value?: string) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

export default function WellnessDashboard() {
  const [bookings, setBookings] = useState<WellnessBooking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [partner, setPartner] = useState<WellnessPartnerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [partnerId, setPartnerId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      let pid = getPartnerId();

      try {
        const user = getUser();
        const profilePath = user?.role === 'wellness_partner'
          ? '/wellness/me'
          : pid
            ? `/wellness/partners/${pid}`
            : null;
        if (!profilePath) throw new Error('No wellness partner selected');
        const profile = await api.get<WellnessPartnerSummary>(profilePath);
        setPartner(profile);
        pid = profile.id;
        setPartnerId(profile.id);
        localStorage.setItem('bmf_wellness_partner_id', profile.id);
      } catch {
        setPartnerId(pid);
      }

      if (!pid) {
        setLoading(false);
        return;
      }

      const results = await Promise.allSettled([
        api.get<WellnessBooking[]>(`/wellness/${pid}/bookings`),
        api.get<Service[]>(`/wellness/${pid}/services`),
      ]);
      if (results[0].status === 'fulfilled') setBookings(results[0].value ?? []);
      if (results[1].status === 'fulfilled') setServices(results[1].value ?? []);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const activeBookings = bookings.filter((booking) => booking.status === 'confirmed' || booking.status === 'pending');
  const revenue = bookings
    .filter((booking) => (booking.status === 'confirmed' || booking.status === 'completed') && isInCurrentMonth(bookingScheduledAt(booking)))
    .reduce((sum, booking) => sum + numberValue(booking.amount), 0);
  const reviewCount = numberValue(partner?.reviewCount);
  const rating = numberValue(partner?.rating);

  const stats = [
    { label: 'Total Services', value: String(services.length), change: 'offered', icon: Dumbbell },
    { label: 'Active Bookings', value: String(activeBookings.length), change: 'live', icon: Calendar },
    { label: 'Revenue This Month', value: formatCurrency(revenue), change: 'MTD', icon: DollarSign },
    { label: 'Avg Rating', value: reviewCount ? rating.toFixed(1) : '\u2014', change: `${reviewCount} review${reviewCount === 1 ? '' : 's'}`, icon: Star },
    { label: 'Total Bookings', value: String(bookings.length), change: 'all time', icon: Users },
    {
      label: 'Completion Rate',
      value: bookings.length
        ? `${Math.round((bookings.filter((booking) => booking.status === 'completed').length / bookings.length) * 100)}%`
        : '\u2014',
      change: 'success',
      icon: TrendingUp,
    },
  ];

  return (
    <Shell title="Dashboard">
      {loading && <div className="text-sm mb-4" style={{ color: 'var(--t2)' }}>Loading dashboard...</div>}

      {!partnerId && !loading && (
        <div className="glass p-6 mb-6" style={{ borderColor: 'rgba(255,180,0,0.3)' }}>
          <p className="text-sm" style={{ color: '#FFB400' }}>
            No partner profile found. Please <Link href="/login" className="underline">sign in again</Link>.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card stat-glow p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
                  <Icon size={16} style={{ color: 'var(--accent)' }} />
                </div>
                <span className="accent-pill">{stat.change}</span>
              </div>
              <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--t2)' }}>{stat.label}</div>
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
              {bookings.slice(0, 6).map((booking) => {
                const user = bookingUser(booking);
                const scheduledAt = bookingScheduledAt(booking);
                return (
                  <div key={booking.id} className="flex items-center justify-between gap-3" style={{ fontSize: 13 }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-white font-semibold truncate">{user.name}</div>
                        <div className="truncate" style={{ color: 'var(--t2)', fontSize: 11 }}>{bookingServiceName(booking)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {statusBadge(booking.status)}
                      {scheduledAt && <span style={{ color: 'var(--t3)', fontSize: 12 }}>{timeAgo(scheduledAt)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass p-6">
          <h3 className="serif text-lg mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/services" className="btn btn-primary text-sm justify-center">Manage Services</Link>
            <Link href="/bookings" className="btn btn-ghost text-sm justify-center">View Bookings</Link>
            <Link href="/reviews" className="btn btn-ghost text-sm justify-center">View Reviews</Link>
            <Link href="/profile" className="btn btn-ghost text-sm justify-center">Edit Profile</Link>
          </div>
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="kicker mb-2">Partner Status</div>
            <div className="flex items-center gap-2">
              <span className={partner?.status === 'active' ? 'badge-active' : 'badge-pending'}>{partner?.status || 'unknown'}</span>
              {partnerId && <span style={{ fontSize: 12, color: 'var(--t2)' }}>ID: {partnerId}</span>}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
