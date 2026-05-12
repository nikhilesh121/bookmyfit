'use client';
import { useState, useEffect, useCallback } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { Star, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import Pagination from '../../components/Pagination';

type Rating = {
  id: string;
  userId: string;
  targetId: string;
  stars: number;
  review: string;
  createdAt: string;
  status?: string;
};

type FilterTab = 'pending' | 'approved' | 'rejected';

function StarDisplay({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          fill={i < count ? '#FFB400' : 'none'}
          color={i < count ? '#FFB400' : 'rgba(255,255,255,0.2)'}
          strokeWidth={1.5}
        />
      ))}
      <span style={{ fontSize: 12, marginLeft: 6, color: 'var(--t2)', fontWeight: 600 }}>{count}/5</span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass p-5" style={{ opacity: 0.4, animation: 'pulse 1.5s ease-in-out infinite' }}>
      <div style={{ height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.08)', marginBottom: 10, width: '60%' }} />
      <div style={{ height: 40, borderRadius: 6, background: 'rgba(255,255,255,0.06)', marginBottom: 10 }} />
      <div style={{ height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.06)', width: '40%' }} />
    </div>
  );
}

export default function RatingsPage() {
  const { toast } = useToast();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FilterTab>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [weekStats, setWeekStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const load = useCallback(async (status: FilterTab) => {
    setLoading(true);
    try {
      const path = status === 'pending'
        ? `/ratings/pending?page=${page}&limit=${limit}`
        : `/ratings?status=${status}&page=${page}&limit=${limit}`;
      const res = await api.get<any>(path);
      const list: Rating[] = Array.isArray(res) ? res : (res as any)?.data ?? [];
      setRatings(list);
      setTotal((res as any)?.total ?? list.length);
      setPages((res as any)?.pages ?? 1);
      if (status === 'pending') {
        setWeekStats((prev) => ({ ...prev, pending: (res as any)?.total ?? list.length }));
      }
    } catch {
      setRatings([]);
      setTotal(0);
      setPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => { load(tab); }, [load, tab]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await api.post(`/ratings/${id}/approve`);
      toast('Rating approved');
      setRatings((prev) => prev.filter((r) => r.id !== id));
      setWeekStats((prev) => ({ ...prev, approved: prev.approved + 1, pending: Math.max(0, prev.pending - 1) }));
    } catch (e: any) {
      toast(e.message || 'Approval failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await api.post(`/ratings/${id}/reject`);
      toast('Rating rejected');
      setRatings((prev) => prev.filter((r) => r.id !== id));
      setWeekStats((prev) => ({ ...prev, rejected: prev.rejected + 1, pending: Math.max(0, prev.pending - 1) }));
    } catch (e: any) {
      toast(e.message || 'Rejection failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  return (
    <Shell title="Ratings Moderation">
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Pending', value: weekStats.pending, icon: MessageSquare, color: '#FFB400' },
          { label: 'Approved This Week', value: weekStats.approved, icon: CheckCircle, color: 'var(--accent)' },
          { label: 'Rejected This Week', value: weekStats.rejected, icon: XCircle, color: '#FF3C3C' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card p-5">
              <div className="flex items-center gap-3 mb-2">
                <Icon size={16} style={{ color: s.color }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--t2)' }}>{s.label}</span>
              </div>
              <div className="text-2xl font-bold">{s.value}</div>
            </div>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setPage(1); }}
            className="btn text-xs"
            style={{
              background: tab === t.key ? 'var(--accent)' : 'var(--glass-bg)',
              color: tab === t.key ? '#000' : 'var(--t)',
              border: `1px solid ${tab === t.key ? 'transparent' : 'var(--border-strong)'}`,
              padding: '6px 14px',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Rating cards */}
      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : ratings.length === 0 ? (
        <div className="glass" style={{ padding: '60px 0', textAlign: 'center' }}>
          <MessageSquare size={40} style={{ margin: '0 auto 16px', opacity: 0.25 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t2)' }}>
            {tab === 'pending' ? 'No pending reviews — all caught up!' : `No ${tab} ratings found`}
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {ratings.map((r) => (
            <div key={r.id} className="glass p-5" style={{ borderRadius: 16 }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <StarDisplay count={r.stars} />
                    <span style={{ fontSize: 12, color: 'var(--t3)' }}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {r.review && (
                    <p style={{ fontSize: 13, color: 'var(--t)', lineHeight: 1.6, marginBottom: 12 }}>
                      &quot;{r.review}&quot;
                    </p>
                  )}
                  <div className="flex items-center gap-4" style={{ fontSize: 11, color: 'var(--t3)' }}>
                    <span>User: <span style={{ color: 'var(--t2)', fontFamily: 'monospace' }}>{r.userId?.slice(0, 12)}…</span></span>
                    <span>Gym: <span style={{ color: 'var(--t2)', fontFamily: 'monospace' }}>{r.targetId?.slice(0, 12)}…</span></span>
                  </div>
                </div>
                {tab === 'pending' && (
                  <div className="flex flex-col gap-2" style={{ flexShrink: 0 }}>
                    <button
                      onClick={() => handleApprove(r.id)}
                      disabled={actionLoading === r.id}
                      className="btn btn-primary text-xs"
                      style={{ padding: '6px 14px', fontSize: 12 }}>
                      {actionLoading === r.id ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(r.id)}
                      disabled={actionLoading === r.id}
                      className="btn text-xs"
                      style={{ padding: '6px 14px', fontSize: 12, background: 'rgba(255,60,60,0.15)', color: '#FF3C3C', border: '1px solid rgba(255,60,60,0.3)' }}>
                      Reject
                    </button>
                  </div>
                )}
                {tab !== 'pending' && (
                  <span
                    className={tab === 'approved' ? 'badge-active' : 'badge-danger'}
                    style={{ flexShrink: 0 }}>
                    {tab}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} pages={pages} total={total} limit={limit} onPage={(p) => setPage(p)} onLimit={(l) => { setLimit(l); setPage(1); }} />
    </Shell>
  );
}
