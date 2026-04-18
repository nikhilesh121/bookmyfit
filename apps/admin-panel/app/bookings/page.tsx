'use client';

import { useState, useEffect, useCallback } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { BookOpen, CheckCircle, Clock, XCircle, Eye, X, Download } from 'lucide-react';
import Pagination from '../../components/Pagination';

type BookingStatus = 'active' | 'pending' | 'cancelled' | 'expired';

interface Booking {
  id: string;
  user: string;
  gym: string;
  planType: string;
  amount: number;
  status: BookingStatus;
  createdAt: string;
  startDate?: string;
  endDate?: string;
}

type FilterTab = 'all' | BookingStatus;

function formatDate(d: string) {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status: BookingStatus }) {
  if (status === 'active') return <span className="badge-active">{status}</span>;
  if (status === 'pending') return <span className="badge-pending">{status}</span>;
  return <span className="badge-danger">{status}</span>;
}

function BookingDetailModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 28, width: 460, maxWidth: '90vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: 20, color: '#fff', margin: 0 }}>Booking Details</h3>
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
          {[
            { label: 'Booking ID', value: booking.id },
            { label: 'Status', value: <StatusBadge status={booking.status} /> },
            { label: 'User', value: booking.user },
            { label: 'Gym', value: booking.gym },
            { label: 'Plan Type', value: booking.planType },
            { label: 'Amount', value: `₹${booking.amount.toLocaleString('en-IN')}` },
            { label: 'Start Date', value: formatDate(booking.startDate ?? '') },
            { label: 'End Date', value: formatDate(booking.endDate ?? '') },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="kicker" style={{ marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 14, color: 'var(--t)', fontWeight: 500 }}>{value}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24 }}>
          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function BookingsPage() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [viewBooking, setViewBooking] = useState<Booking | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<any>(`/subscriptions/all?page=${page}&limit=${limit}`);
      const arr = Array.isArray(res) ? res : (res as any)?.data ?? [];
      const mapped: Booking[] = arr.map((s: any) => ({
        id: s.id ?? '--',
        user: s.user?.name ?? s.user?.email ?? '--',
        gym: s.gym?.name ?? '--',
        planType: s.plan?.name ?? s.planType ?? '--',
        amount: s.amount ?? 0,
        status: s.status ?? 'pending',
        createdAt: s.createdAt ?? '',
        startDate: s.startDate ?? s.createdAt ?? '',
        endDate: s.endDate ?? s.expiresAt ?? '',
      }));
      setBookings(mapped);
      setTotal((res as any)?.total ?? mapped.length);
      setPages((res as any)?.pages ?? 1);
    } catch {
      setBookings([]);
      setTotal(0);
      setPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      await api.post(`/subscriptions/${id}/cancel`);
      toast('Booking cancelled');
      load();
    } catch (e: any) {
      toast(e.message || 'Failed to cancel booking', 'error');
    }
  };

  const exportCSV = () => {
    const rows = [['ID','User','Gym','Plan','Amount','Status','Date']];
    filtered.forEach((b) => rows.push([b.id, b.user, b.gym, b.planType, String(b.amount), b.status, b.createdAt]));
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'bookings.csv'; a.click();
    URL.revokeObjectURL(url);
    toast('CSV exported');
  };

  const tabs: FilterTab[] = ['all', 'active', 'pending', 'cancelled', 'expired'];
  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

  const activeCount = bookings.filter(b => b.status === 'active').length;
  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const cancelledCount = bookings.filter(b => b.status === 'cancelled' || b.status === 'expired').length;

  return (
    <Shell title="Bookings">
      <div style={{ padding: '2rem', maxWidth: 1200 }}>
        <div style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <p className="kicker">Admin</p>
            <h1 className="serif" style={{ fontSize: '2rem', color: 'var(--t)', margin: 0 }}>Bookings</h1>
          </div>
          <button className="btn btn-ghost flex items-center gap-2" onClick={exportCSV} disabled={loading}>
            <Download size={14} /> Export CSV
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse h-8 rounded" style={{ background: 'var(--surface)', height: 90 }} />
          )) : (
            <>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <BookOpen size={22} color="var(--t2)" />
                <div>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Bookings</p>
                  <p className="stat-glow" style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700 }}>{total}</p>
                </div>
              </div>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle size={22} color="var(--accent)" />
                <div>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active</p>
                  <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent)' }}>{activeCount}</p>
                </div>
              </div>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Clock size={22} color="#F59E0B" />
                <div>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending</p>
                  <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#F59E0B' }}>{pendingCount}</p>
                </div>
              </div>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <XCircle size={22} color="var(--error)" />
                <div>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cancelled</p>
                  <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: 'var(--error)' }}>{cancelledCount}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => { setFilter(tab); setPage(1); }}
              style={{
                padding: '0.35rem 1rem',
                borderRadius: 999,
                fontSize: '0.8rem',
                fontWeight: 500,
                border: '1px solid var(--border)',
                cursor: 'pointer',
                textTransform: 'capitalize',
                background: filter === tab ? 'var(--accent)' : 'transparent',
                color: filter === tab ? '#000' : 'var(--t2)',
                transition: 'all 0.15s',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="glass" style={{ borderRadius: 12, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse" style={{ height: 40, borderRadius: 6, background: 'var(--surface)' }} />
              ))}
            </div>
          ) : (
            <table className="glass-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  {['ID', 'User', 'Gym', 'Plan Type', 'Amount', 'Status', 'Date', 'Actions'].map(col => (
                    <th key={col} style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => (
                  <tr key={b.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--t3)', fontFamily: 'monospace' }}>{b.id}</td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.88rem', color: 'var(--t)' }}>{b.user || '--'}</td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.88rem', color: 'var(--t2)' }}>{b.gym || '--'}</td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.88rem', color: 'var(--t2)' }}>{b.planType || '--'}</td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.88rem', color: 'var(--t)', fontWeight: 600 }}>&#8377;{b.amount.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '0.85rem 1rem' }}><StatusBadge status={b.status} /></td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--t3)' }}>{formatDate(b.createdAt)}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button className="btn-ghost" style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setViewBooking(b)}>
                          <Eye size={12} /> View
                        </button>
                        {b.status === 'active' && (
                          <button className="btn-ghost" style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', color: 'var(--error)', borderColor: 'var(--error)', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => handleCancel(b.id)}>
                            <X size={12} /> Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--t3)', fontSize: '0.88rem' }}>No bookings found</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <Pagination page={page} pages={pages} total={total} limit={limit} onPage={setPage} onLimit={(l) => { setLimit(l); setPage(1); }} />
      </div>

      {viewBooking && (
        <BookingDetailModal booking={viewBooking} onClose={() => setViewBooking(null)} />
      )}
    </Shell>
  );
}
