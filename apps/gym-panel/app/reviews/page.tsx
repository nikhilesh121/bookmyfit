'use client';

import { useCallback, useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { AlertTriangle, RefreshCw, Star, User } from 'lucide-react';

type ReviewRow = {
  id: string;
  userName: string;
  memberCode?: string;
  stars: number;
  review?: string;
  status: string;
  createdAt?: string;
};

type ReviewStats = { total: number; approved: number; pending: number; rejected: number; average: number };

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusStyle(status: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    approved: { color: '#22c55e', background: 'rgba(34,197,94,0.14)', borderColor: 'rgba(34,197,94,0.26)' },
    pending: { color: '#FFB400', background: 'rgba(255,180,0,0.12)', borderColor: 'rgba(255,180,0,0.24)' },
    rejected: { color: '#ef4444', background: 'rgba(239,68,68,0.13)', borderColor: 'rgba(239,68,68,0.25)' },
  };
  return map[status] || map.pending;
}

function StarRow({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const active = index < Math.round(value || 0);
        return <Star key={index} size={13} color="#FFB400" fill={active ? '#FFB400' : 'transparent'} style={{ opacity: active ? 1 : 0.32 }} />;
      })}
      <span className="text-xs font-semibold ml-1" style={{ color: 'var(--t2)' }}>{Number(value || 0).toFixed(1)}</span>
    </div>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ total: 0, approved: 0, pending: 0, rejected: 0, average: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.get<any>('/gyms/my-reviews');
      setReviews(Array.isArray(result?.data) ? result.data : []);
      setStats({
        total: Number(result?.stats?.total || 0),
        approved: Number(result?.stats?.approved || 0),
        pending: Number(result?.stats?.pending || 0),
        rejected: Number(result?.stats?.rejected || 0),
        average: Number(result?.stats?.average || 0),
      });
    } catch (e: any) {
      setReviews([]);
      setError(e?.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Shell title="Reviews">
      {error && (
        <div className="card p-3 mb-4 text-xs" style={{ color: '#FFB400', background: 'rgba(255,180,0,0.05)', borderColor: 'rgba(255,180,0,0.3)' }}>
          <AlertTriangle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-5">
        {[
          { label: 'Average', value: stats.average ? stats.average.toFixed(1) : '-', accent: '#FFB400' },
          { label: 'Total Reviews', value: stats.total, accent: 'var(--accent)' },
          { label: 'Approved', value: stats.approved, accent: '#22c55e' },
          { label: 'Pending', value: stats.pending, accent: '#FFB400' },
          { label: 'Rejected', value: stats.rejected, accent: '#ef4444' },
        ].map((item) => (
          <div key={item.label} className="card p-4">
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--t2)' }}>{item.label}</div>
            <div className="text-2xl font-bold" style={{ color: item.accent }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className="flex justify-end mb-4">
        <button className="btn btn-ghost text-sm flex items-center gap-2" onClick={load}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="glass overflow-hidden">
        <table className="glass-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Rating</th>
              <th>Review</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index}>
                  {Array.from({ length: 5 }).map((__, cell) => (
                    <td key={cell}><div className="animate-pulse h-4 rounded" style={{ background: 'rgba(255,255,255,0.08)' }} /></td>
                  ))}
                </tr>
              ))
            ) : reviews.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--t2)', padding: '40px 0' }}>No reviews yet</td></tr>
            ) : reviews.map((review) => {
              const badge = statusStyle(review.status);
              return (
                <tr key={review.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center rounded-full" style={{ width: 30, height: 30, background: 'rgba(204,255,0,0.10)', color: 'var(--accent)' }}>
                        <User size={14} />
                      </span>
                      <div>
                        <div className="font-semibold text-white text-[13px]">{review.userName || 'Member'}</div>
                        <div className="text-[11px]" style={{ color: 'var(--t2)', fontFamily: 'monospace' }}>{review.memberCode || 'BMF-UNKNOWN'}</div>
                      </div>
                    </div>
                  </td>
                  <td><StarRow value={review.stars} /></td>
                  <td className="text-[12px]" style={{ color: review.review ? 'var(--t)' : 'var(--t3)', maxWidth: 520 }}>
                    {review.review || 'No written review'}
                  </td>
                  <td>
                    <span className="text-[11px] rounded-full px-2 py-1 capitalize font-semibold" style={{ ...badge, border: `1px solid ${badge.borderColor}` }}>
                      {review.status}
                    </span>
                  </td>
                  <td className="text-[12px]" style={{ color: 'var(--t2)' }}>{formatDate(review.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
