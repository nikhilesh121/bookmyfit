'use client';
import { useEffect, useState } from 'react';
import { XCircle, Clock } from 'lucide-react';
import Shell from '../../components/Shell';
import { api, getPartnerId } from '../../lib/api';
import { useToast } from '../../components/Toast';
import {
  bookingScheduledAt,
  bookingServiceName,
  bookingUser,
  numberValue,
  WellnessBooking,
} from '../../lib/wellness';

function statusBadge(status?: string) {
  if (status === 'confirmed') return <span className="badge-active">confirmed</span>;
  if (status === 'completed') return <span className="badge-active">completed</span>;
  if (status === 'cancelled') return <span className="badge-danger">cancelled</span>;
  return <span className="badge-pending">{status || 'pending'}</span>;
}

function formatDate(iso?: string) {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(value: number | string) {
  return `\u20B9${numberValue(value).toLocaleString('en-IN')}`;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<WellnessBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const { toast } = useToast();
  const partnerId = getPartnerId();

  const load = async () => {
    if (!partnerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get<WellnessBooking[]>(`/wellness/${partnerId}/bookings`);
      setBookings(data ?? []);
    } catch {
      toast('Failed to load bookings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    if (!partnerId) return;
    try {
      await api.patch(`/wellness/${partnerId}/bookings/${id}`, { status });
      setBookings((current) => current.map((booking) => booking.id === id ? { ...booking, status } : booking));
      toast(`Booking marked as ${status}`);
    } catch (err: any) {
      toast(err.message || 'Failed to update status', 'error');
    }
  };

  const filtered = filter === 'all' ? bookings : bookings.filter((booking) => booking.status === filter);
  const counts = {
    all: bookings.length,
    pending: bookings.filter((booking) => booking.status === 'pending').length,
    confirmed: bookings.filter((booking) => booking.status === 'confirmed').length,
    completed: bookings.filter((booking) => booking.status === 'completed').length,
    cancelled: bookings.filter((booking) => booking.status === 'cancelled').length,
  };
  const filters = ['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const;

  return (
    <Shell title="Bookings">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {filters.map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className="btn text-xs"
            style={{
              background: filter === item ? 'var(--accent)' : 'var(--glass-bg)',
              color: filter === item ? '#000' : 'rgba(255,255,255,0.6)',
              border: filter === item ? 'none' : '1px solid var(--border-strong)',
              fontWeight: filter === item ? 700 : 400,
            }}>
            {item.charAt(0).toUpperCase() + item.slice(1)} ({counts[item]})
          </button>
        ))}
      </div>

      {loading && <p style={{ color: 'var(--t2)', fontSize: 13 }}>Loading bookings...</p>}

      {!loading && filtered.length === 0 && (
        <div className="glass p-12 text-center">
          <p style={{ color: 'var(--t2)' }}>No bookings found{filter !== 'all' ? ` with status "${filter}"` : ''}.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="glass overflow-x-auto">
          <table className="glass-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Service</th>
                <th>Scheduled</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((booking) => {
                const user = bookingUser(booking);
                return (
                  <tr key={booking.id}>
                    <td>
                      <div className="font-semibold text-white">{user.name}</div>
                      {user.memberCode && <div style={{ fontSize: 11, color: 'var(--t2)' }}>{user.memberCode}</div>}
                      {user.email && <div style={{ fontSize: 11, color: 'var(--t3)' }}>{user.email}</div>}
                      {user.phone && <div style={{ fontSize: 11, color: 'var(--t3)' }}>{user.phone}</div>}
                    </td>
                    <td style={{ color: 'var(--t)' }}>{bookingServiceName(booking)}</td>
                    <td style={{ color: 'var(--t2)', fontSize: 12 }}>{formatDate(bookingScheduledAt(booking))}</td>
                    <td style={{ color: 'var(--t)', fontWeight: 600 }}>
                      {booking.amount != null ? formatCurrency(booking.amount) : '\u2014'}
                    </td>
                    <td>{statusBadge(booking.status)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        {booking.status === 'confirmed' && (
                          <button
                            onClick={() => updateStatus(booking.id, 'completed')}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition"
                            title="Complete"
                            style={{ background: 'rgba(0,175,255,0.1)', color: '#00AFFF', border: '1px solid rgba(0,175,255,0.2)' }}>
                            <Clock size={12} /> Complete
                          </button>
                        )}
                        {(booking.status === 'pending' || booking.status === 'confirmed') && (
                          <button
                            onClick={() => updateStatus(booking.id, 'cancelled')}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition"
                            title="Cancel"
                            style={{ background: 'rgba(255,60,60,0.1)', color: '#FF6060', border: '1px solid rgba(255,60,60,0.2)' }}>
                            <XCircle size={12} /> Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
