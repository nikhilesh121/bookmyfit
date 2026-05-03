'use client';
import { useCallback, useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { Activity, CheckCircle, Building2, Calendar, Tag } from 'lucide-react';
import { api } from '../../lib/api';
import Pagination from '../../components/Pagination';

interface CheckIn {
  id: string;
  user: string;
  gym: string;
  gymId?: string;
  checkedInAt: string;
  method: string;
  status: string;
  planType?: string;
}

const PLAN_TYPES = [
  { value: '', label: 'All Plans' },
  { value: 'day_pass', label: 'Day Pass' },
  { value: 'same_gym', label: 'Same Gym' },
  { value: 'multi_gym', label: 'Multi Gym' },
];

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'valid', label: 'Valid' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'failed_expired', label: 'Expired' },
  { value: 'failed_daily_limit', label: 'Daily Limit' },
];

function SkeletonRow() {
  return (
    <tr style={{ opacity: 0.4 }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i}><div style={{ height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.08)', animation: 'pulse 1.5s ease-in-out infinite' }} /></td>
      ))}
    </tr>
  );
}

export default function CheckinsPage() {
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [gymFilter, setGymFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (gymFilter) qs.set('gymId', gymFilter);
      if (dateFilter) qs.set('date', dateFilter);
      if (planFilter) qs.set('planType', planFilter);
      if (statusFilter) qs.set('status', statusFilter);
      const res = await api.get<any>(`/checkins?${qs.toString()}`);
      const rows: CheckIn[] = Array.isArray(res) ? res : (res as any)?.data ?? [];
      const mapped = rows.map((c: any) => ({
        id: c.id ?? '--',
        user: c.user?.name ?? c.user ?? '--',
        gym: c.gym?.name ?? c.gym ?? '--',
        gymId: c.gymId ?? c.gym?.id,
        checkedInAt: c.checkedInAt ?? c.createdAt ?? '',
        method: c.method ?? 'QR',
        status: c.status ?? 'valid',
        planType: c.subscription?.planType ?? c.planType ?? '--',
      }));
      setCheckins(mapped);
      setTotal((res as any)?.total ?? mapped.length);
      setPages((res as any)?.pages ?? 1);
    } catch {
      setCheckins([]);
      setTotal(0);
      setPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, limit, gymFilter, dateFilter, planFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [gymFilter, dateFilter, planFilter, statusFilter]);

  const selectStyle = {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10, color: 'var(--t)', padding: '8px 12px', fontSize: 13, outline: 'none',
    minWidth: 140,
  };

  return (
    <Shell title="Check-ins">
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Check-ins', value: total, icon: Activity, color: 'var(--accent)' },
          { label: 'Valid', value: checkins.filter(c => c.status === 'valid').length, icon: CheckCircle, color: 'var(--accent)' },
          { label: 'Flagged / Failed', value: checkins.filter(c => c.status !== 'valid').length, icon: Calendar, color: '#FF3C3C' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card stat-glow p-5">
              <div className="flex items-center gap-3 mb-2">
                <Icon size={16} style={{ color: s.color }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--t2)' }}>{s.label}</span>
              </div>
              <div className="text-2xl font-bold">{s.value}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        {/* Gym ID filter */}
        <div className="flex items-center gap-2 glass-input" style={{ flex: '1 1 180px', minWidth: 160, padding: '8px 12px' }}>
          <Building2 size={14} style={{ color: 'var(--t3)', flexShrink: 0 }} />
          <input
            value={gymFilter}
            onChange={(e) => setGymFilter(e.target.value)}
            placeholder="Filter by gym ID…"
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--t)', flex: 1, fontSize: 13 }}
          />
        </div>

        {/* Date filter */}
        <div className="flex items-center gap-2 glass-input" style={{ padding: '8px 12px' }}>
          <Calendar size={14} style={{ color: 'var(--t3)', flexShrink: 0 }} />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', color: dateFilter ? 'var(--t)' : 'var(--t3)', fontSize: 13, colorScheme: 'dark' }}
          />
          {dateFilter && (
            <button onClick={() => setDateFilter('')}
              style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
          )}
        </div>

        {/* Plan type filter */}
        <div className="flex items-center gap-2 glass-input" style={{ padding: '8px 12px' }}>
          <Tag size={14} style={{ color: 'var(--t3)', flexShrink: 0 }} />
          <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--t)', fontSize: 13, cursor: 'pointer' }}>
            {PLAN_TYPES.map(p => <option key={p.value} value={p.value} style={{ background: '#111' }}>{p.label}</option>)}
          </select>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2 glass-input" style={{ padding: '8px 12px' }}>
          <CheckCircle size={14} style={{ color: 'var(--t3)', flexShrink: 0 }} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--t)', fontSize: 13, cursor: 'pointer' }}>
            {STATUSES.map(s => <option key={s.value} value={s.value} style={{ background: '#111' }}>{s.label}</option>)}
          </select>
        </div>

        {/* Clear all */}
        {(gymFilter || dateFilter || planFilter || statusFilter) && (
          <button
            onClick={() => { setGymFilter(''); setDateFilter(''); setPlanFilter(''); setStatusFilter(''); }}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--t2)', cursor: 'pointer', fontSize: 12 }}>
            Clear Filters
          </button>
        )}
      </div>

      <div className="glass overflow-hidden">
        <table className="glass-table">
          <thead>
            <tr>
              <th>Check-in ID</th><th>User</th><th>Gym</th><th>Plan</th><th>Time</th><th>Method</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              : checkins.length === 0
                ? <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--t2)', padding: '40px 0' }}>No check-ins found</td></tr>
                : checkins.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--t3)' }}>{c.id.slice(0, 8)}…</td>
                    <td style={{ fontWeight: 600, color: '#fff' }}>{c.user}</td>
                    <td style={{ color: 'var(--t2)' }}>{c.gym}</td>
                    <td>
                      <span style={{ background: 'rgba(61,255,84,0.1)', color: 'var(--accent)', padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>
                        {c.planType?.replace(/_/g, ' ') || '—'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--t2)', fontSize: 12 }}>
                      {c.checkedInAt ? new Date(c.checkedInAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td>
                      <span style={{ background: 'rgba(100,160,255,0.15)', color: '#64A0FF', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                        {c.method}
                      </span>
                    </td>
                    <td>
                      <span className={c.status === 'valid' ? 'badge-active' : 'badge-danger'}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pages={pages} total={total} limit={limit} onPage={setPage} onLimit={(l) => { setLimit(l); setPage(1); }} />
    </Shell>
  );
}
