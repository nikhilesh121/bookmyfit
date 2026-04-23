'use client';

import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { useEffect, useState, useCallback } from 'react';
import { ClipboardCheck, TrendingUp, Users, Building2, Download } from 'lucide-react';

type AttendanceRow = {
  id: string;
  sessionDate: string;
  sessionTypeName: string;
  sessionKind: 'standard' | 'special';
  checkinAt: string;
  commissionAmount: number;
  settlementId?: string;
  gym?: { id: string; name: string };
  user?: { id: string; name: string; phone?: string };
};

type SummaryRow = {
  gymId: string;
  totalAttendance: string;
  totalCommission: string;
  gym?: { name: string };
};

const pill = (color: string) => ({
  display: 'inline-block' as const,
  background: `${color}22`, border: `1px solid ${color}44`,
  borderRadius: 20, padding: '3px 10px', fontSize: 11,
  fontWeight: 700, color, letterSpacing: 0.5,
});

export default function AttendancePage() {
  const [tab, setTab] = useState<'log' | 'summary'>('log');
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [gymFilter, setGymFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [summaryMonth, setSummaryMonth] = useState(new Date().toISOString().substring(0, 7));

  const loadLog = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '50' });
      if (gymFilter) params.append('gymId', gymFilter);
      if (dateFilter) params.append('date', dateFilter);
      const data = await api.get(`/sessions/admin/attendance?${params}`);
      setRows(data?.data || []);
      setTotal(data?.total || 0);
      setPage(p);
    } catch { setRows([]); }
    setLoading(false);
  }, [gymFilter, dateFilter]);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get(`/sessions/admin/attendance/summary?month=${summaryMonth}`);
      setSummary(Array.isArray(data) ? data : []);
    } catch { setSummary([]); }
    setLoading(false);
  }, [summaryMonth]);

  useEffect(() => {
    if (tab === 'log') loadLog(1); else loadSummary();
  }, [tab, loadLog, loadSummary]);

  const totalCommission = summary.reduce((acc, r) => acc + parseFloat(r.totalCommission || '0'), 0);
  const totalVisits = summary.reduce((acc, r) => acc + parseInt(r.totalAttendance || '0'), 0);

  return (
    <Shell title="Attendance">
      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Visits', value: tab === 'summary' ? totalVisits.toLocaleString('en-IN') : total.toLocaleString('en-IN'), icon: <ClipboardCheck size={18} color="var(--accent)" />, color: 'var(--accent)' },
          { label: 'Est. Commission', value: `₹${totalCommission.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: <TrendingUp size={18} color="#00D4FF" />, color: '#00D4FF' },
          { label: 'Gyms', value: tab === 'summary' ? summary.length : '—', icon: <Building2 size={18} color="#6C63FF" />, color: '#6C63FF' },
        ].map((s) => (
          <div key={s.label} className="glass" style={{ borderRadius: 16, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, minWidth: 180, borderColor: `${s.color}33` }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}18`, border: `1px solid ${s.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
            <div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 22, fontWeight: 700, color: '#fff' }}>{s.value}</div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.5 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {(['log', 'summary'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: tab === t ? 'rgba(61,255,84,0.15)' : 'transparent',
            color: tab === t ? 'var(--accent)' : 'rgba(255,255,255,0.5)',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 14,
            borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
          }}>
            {t === 'log' ? 'Attendance Log' : 'Monthly Summary'}
          </button>
        ))}
      </div>

      {/* ── ATTENDANCE LOG TAB ── */}
      {tab === 'log' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Date</label>
              <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#fff', padding: '8px 14px', colorScheme: 'dark', fontSize: 14, cursor: 'pointer' }} />
            </div>
            <button onClick={() => loadLog(1)} className="btn-primary" style={{ padding: '9px 22px', borderRadius: 20, fontSize: 13, alignSelf: 'flex-end' }}>Search</button>
            <button onClick={() => { setDateFilter(''); setGymFilter(''); }} style={{ padding: '9px 18px', borderRadius: 20, fontSize: 13, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', alignSelf: 'flex-end' }}>Clear</button>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', alignSelf: 'flex-end' }}>{total.toLocaleString('en-IN')} total records</span>
          </div>

          <div className="glass" style={{ borderRadius: 16, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Loading…</div>
            ) : rows.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No attendance records found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {['Date', 'Gym', 'Member', 'Session', 'Check-in', 'Commission', 'Settled'].map((h) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{r.sessionDate}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#fff' }}>{r.gym?.name ?? '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                        {r.user?.name ?? '—'}
                        {r.user?.phone && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{r.user.phone}</div>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={pill(r.sessionKind === 'standard' ? 'var(--accent)' : '#6C63FF')}>{r.sessionTypeName}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                        {r.checkinAt ? new Date(r.checkinAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>₹{Number(r.commissionAmount).toFixed(0)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {r.settlementId
                          ? <span style={pill('#00D4FF')}>SETTLED</span>
                          : <span style={pill('rgba(255,255,255,0.3)')}>PENDING</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {total > 50 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20 }}>
              <button disabled={page <= 1} onClick={() => loadLog(page - 1)} className="btn-ghost" style={{ padding: '8px 18px', borderRadius: 20, fontSize: 13 }}>← Prev</button>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, padding: '8px 0' }}>Page {page} of {Math.ceil(total / 50)}</span>
              <button disabled={page * 50 >= total} onClick={() => loadLog(page + 1)} className="btn-ghost" style={{ padding: '8px 18px', borderRadius: 20, fontSize: 13 }}>Next →</button>
            </div>
          )}
        </>
      )}

      {/* ── MONTHLY SUMMARY TAB ── */}
      {tab === 'summary' && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Month</label>
              <input type="month" value={summaryMonth} onChange={(e) => setSummaryMonth(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#fff', padding: '8px 14px', colorScheme: 'dark', fontSize: 14 }} />
            </div>
            <button onClick={loadSummary} className="btn-primary" style={{ padding: '9px 22px', borderRadius: 20, fontSize: 13, alignSelf: 'flex-end' }}>Load</button>
          </div>

          {loading ? (
            <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 40 }}>Loading…</div>
          ) : summary.length === 0 ? (
            <div className="glass" style={{ borderRadius: 16, padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No data for this month.</div>
          ) : (
            <div className="glass" style={{ borderRadius: 16, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {['Gym', 'Total Visits', 'Commission Owed', 'Avg/Visit'].map((h) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.sort((a, b) => parseInt(b.totalAttendance) - parseInt(a.totalAttendance)).map((r) => {
                    const visits = parseInt(r.totalAttendance || '0');
                    const commission = parseFloat(r.totalCommission || '0');
                    return (
                      <tr key={r.gymId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '14px 16px', fontSize: 15, fontWeight: 600, color: '#fff' }}>{r.gym?.name ?? '—'}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{visits.toLocaleString('en-IN')}</span>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginLeft: 6 }}>visits</span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 16, fontWeight: 700, color: '#00D4FF' }}>
                          ₹{commission.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                          ₹{visits > 0 ? (commission / visits).toFixed(2) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  <tr style={{ borderTop: '2px solid rgba(255,255,255,0.12)', background: 'rgba(61,255,84,0.04)' }}>
                    <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: 1 }}>TOTAL</td>
                    <td style={{ padding: '14px 16px', fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>{totalVisits.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '14px 16px', fontSize: 18, fontWeight: 700, color: '#00D4FF' }}>₹{totalCommission.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
