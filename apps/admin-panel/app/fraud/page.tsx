'use client';

import { useState, useEffect, useCallback } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { Shield, AlertTriangle, Eye, CheckCircle, Search, UserX } from 'lucide-react';
import Pagination from '../../components/Pagination';

interface FraudAlert {
  id: string;
  user: string;
  eventType: string;
  gym: string;
  riskScore: number;
  device: string;
  time: string;
}

function getRiskBadgeStyle(score: number) {
  if (score > 80) return { background: 'rgba(255,60,60,0.15)', color: '#FF3C3C' };
  if (score >= 60) return { background: 'rgba(255,140,0,0.15)', color: '#FF8C00' };
  return { background: 'rgba(255,180,0,0.15)', color: '#FFB400' };
}

export default function FraudPage() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const dismissAlert = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
    toast('Alert dismissed', 'info');
  };

  const flagAlert = (id: string) => {
    setFlagged((prev) => new Set([...prev, id]));
    toast('User flagged for review', 'error');
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<any>(`/fraud/alerts?page=${page}&limit=${limit}`);
      const arr = Array.isArray(res) ? res : (res as any)?.data ?? [];
      const mapped: FraudAlert[] = arr.map((a: any) => ({
        id: a.id ?? '--',
        user: a.user ?? a.userId ?? '--',
        eventType: a.eventType ?? a.type ?? '--',
        gym: a.gym?.name ?? a.gym ?? '--',
        riskScore: a.riskScore ?? a.score ?? 0,
        device: a.device ?? '--',
        time: a.time ?? a.createdAt ?? '--',
      }));
      setAlerts(mapped);
      setTotal((res as any)?.total ?? mapped.length);
      setPages((res as any)?.pages ?? 1);
    } catch {
      setAlerts([]);
      setTotal(0);
      setPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => { load(); }, [load]);

  const suspicious = alerts.length;
  const highRisk = alerts.filter(a => a.riskScore > 80).length;
  const investigated = alerts.filter(a => a.riskScore >= 60 && a.riskScore <= 80).length;
  const cleared = alerts.filter(a => a.riskScore < 60).length;

  return (
    <Shell title="Fraud Monitoring">
      <div style={{ padding: '2rem', maxWidth: 1200 }}>
        <div style={{ marginBottom: '1.75rem' }}>
          <p className="kicker">Admin</p>
          <h1 className="serif" style={{ fontSize: '2rem', color: 'var(--t)', margin: 0 }}>Fraud Monitoring</h1>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse" style={{ height: 90, borderRadius: 8, background: 'var(--surface)' }} />
          )) : (
            <>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Shield size={22} color="var(--t2)" />
                <div>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Suspicious Events</p>
                  <p className="stat-glow" style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700 }}>{suspicious}</p>
                </div>
              </div>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <AlertTriangle size={22} color="var(--error)" />
                <div>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>High Risk</p>
                  <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: 'var(--error)' }}>{highRisk}</p>
                </div>
              </div>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Eye size={22} color="#F59E0B" />
                <div>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Investigated</p>
                  <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#F59E0B' }}>{investigated}</p>
                </div>
              </div>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle size={22} color="var(--accent)" />
                <div>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cleared</p>
                  <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent)' }}>{cleared}</p>
                </div>
              </div>
            </>
          )}
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
                  {['User', 'Event Type', 'Gym', 'Risk Score', 'Device', 'Time', 'Actions'].map(col => (
                    <th key={col} style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alerts.filter((a) => !dismissed.has(a.id)).map((a, i) => (
                  <tr key={a.id} style={{ borderBottom: i < alerts.length - 1 ? '1px solid var(--border)' : 'none', opacity: flagged.has(a.id) ? 0.6 : 1 }}>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.88rem', color: 'var(--t)', fontFamily: 'monospace' }}>{a.user}</td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.88rem', color: 'var(--t2)' }}>{a.eventType}</td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.88rem', color: 'var(--t2)' }}>{a.gym || '--'}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{
                        ...getRiskBadgeStyle(a.riskScore),
                        padding: '0.2rem 0.6rem',
                        borderRadius: 6,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                      }}>
                        {a.riskScore}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--t3)' }}>{a.device || '--'}</td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--t3)' }}>{a.time || '--'}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button className="btn-ghost" onClick={() => toast(`Investigating ${a.user}`, 'info')} style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Search size={11} /> Investigate
                        </button>
                        <button className="btn-ghost" onClick={() => dismissAlert(a.id)} style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', color: 'var(--accent)', borderColor: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={11} /> Dismiss
                        </button>
                        <button className="btn-ghost" onClick={() => flagAlert(a.id)} disabled={flagged.has(a.id)} style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', color: 'var(--error)', borderColor: 'var(--error)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <UserX size={11} /> {flagged.has(a.id) ? 'Flagged' : 'Flag'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {alerts.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--t3)', fontSize: '0.88rem' }}>No fraud alerts</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <Pagination page={page} pages={pages} total={total} limit={limit} onPage={setPage} onLimit={(l) => { setLimit(l); setPage(1); }} />
      </div>
    </Shell>
  );
}
