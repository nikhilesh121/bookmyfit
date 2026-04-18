'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api, getPartnerId } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

type Booking = {
  id: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  serviceName?: string;
  scheduledAt?: string;
  amount?: number;
  status?: string;
};

function statusBadge(s?: string) {
  if (s === 'confirmed') return <span className="badge-active">confirmed</span>;
  if (s === 'completed') return <span className="badge-active">completed</span>;
  if (s === 'cancelled') return <span className="badge-danger">cancelled</span>;
  return <span className="badge-pending">{s || 'pending'}</span>;
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const { toast } = useToast();
  const partnerId = getPartnerId();

  const load = async () => {
    if (!partnerId) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await api.get<Booking[]>(`/wellness/${partnerId}/bookings`);
      setBookings(data ?? []);
    } catch {
      toast('Failed to load bookings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    if (!partnerId) return;
    try {
      await api.patch(`/wellness/${partnerId}/bookings/${id}`, { status });
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
      toast(`Booking marked as ${status}`);
    } catch (err: any) {
      toast(err.message || 'Failed to update status', 'error');
    }
  };

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

  const counts = {
    all: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  };

  const FILTERS = ['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const;

  return (
    <Shell title="Bookings">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="btn text-xs"
            style={{
              background: filter === f ? 'var(--accent)' : 'var(--glass-bg)',
              color: filter === f ? '#000' : 'rgba(255,255,255,0.6)',
              border: filter === f ? 'none' : '1px solid var(--border-strong)',
              fontWeight: filter === f ? 700 : 400,
            }}>
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>

      {loading && <p style={{ color: 'var(--t2)', fontSize: 13 }}>Loading bookings…</p>}

      {!loading && filtered.length === 0 && (
        <div className="glass p-12 text-center">
          <p style={{ color: 'var(--t2)' }}>No bookings found{filter !== 'all' ? ` with status "${filter}"` : ''}.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="glass overflow-hidden">
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
              {filtered.map(b => (
                <tr key={b.id}>
                  <td>
                    <div className="font-semibold text-white">{b.userName || 'Guest'}</div>
                    {b.userEmail && <div style={{ fontSize: 11, color: 'var(--t3)' }}>{b.userEmail}</div>}
                    {b.userPhone && <div style={{ fontSize: 11, color: 'var(--t3)' }}>{b.userPhone}</div>}
                  </td>
                  <td style={{ color: 'var(--t)' }}>{b.serviceName || '—'}</td>
                  <td style={{ color: 'var(--t2)', fontSize: 12 }}>{formatDate(b.scheduledAt)}</td>
                  <td style={{ color: 'var(--t)', fontWeight: 600 }}>
                    {b.amount != null ? `₹${b.amount.toLocaleString()}` : '—'}
                  </td>
                  <td>{statusBadge(b.status)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      {b.status === 'pending' && (
                        <button
                          onClick={() => updateStatus(b.id, 'confirmed')}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition"
                          title="Confirm"
                          style={{ background: 'rgba(61,255,84,0.1)', color: 'var(--accent)', border: '1px solid rgba(61,255,84,0.2)' }}>
                          <CheckCircle size={12} /> Confirm
                        </button>
                      )}
                      {b.status === 'confirmed' && (
                        <button
                          onClick={() => updateStatus(b.id, 'completed')}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition"
                          title="Complete"
                          style={{ background: 'rgba(0,175,255,0.1)', color: '#00AFFF', border: '1px solid rgba(0,175,255,0.2)' }}>
                          <Clock size={12} /> Complete
                        </button>
                      )}
                      {(b.status === 'pending' || b.status === 'confirmed') && (
                        <button
                          onClick={() => updateStatus(b.id, 'cancelled')}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition"
                          title="Cancel"
                          style={{ background: 'rgba(255,60,60,0.1)', color: '#FF6060', border: '1px solid rgba(255,60,60,0.2)' }}>
                          <XCircle size={12} /> Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
