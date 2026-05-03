'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api, getPartnerId } from '../../lib/api';
import { DollarSign, TrendingUp, TrendingDown, Calendar, CheckCircle, Clock } from 'lucide-react';

type MonthlyStat = {
  month: string;
  revenue: number;
  commission: number;
  net: number;
  bookings: number;
};

type EarningsSummary = {
  totalRevenue: number;
  totalCommission: number;
  netEarnings: number;
  thisMonthRevenue: number;
  thisMonthNet: number;
  lastMonthNet: number;
  totalBookings: number;
  completedBookings: number;
};

type RecentBooking = {
  id: string;
  status: string;
  bookingDate: string;
  amount: number;
  platformCommission: number;
  net: number;
};

type EarningsData = {
  summary: EarningsSummary;
  monthly: MonthlyStat[];
  recentBookings: RecentBooking[];
};

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function monthLabel(key: string) {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') return <span className="badge-active">completed</span>;
  if (status === 'confirmed') return <span className="badge-active">confirmed</span>;
  if (status === 'cancelled') return <span className="badge-danger">cancelled</span>;
  return <span className="badge-pending">{status}</span>;
}

function BarChart({ data }: { data: MonthlyStat[] }) {
  const max = Math.max(...data.map(d => d.revenue), 1);
  return (
    <div className="flex items-end gap-2 h-32 w-full">
      {data.map((d) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex flex-col items-center gap-0.5 justify-end" style={{ height: 100 }}>
            <div
              title={`Revenue: ${fmt(d.revenue)}\nNet: ${fmt(d.net)}`}
              style={{
                width: '100%',
                height: `${Math.max((d.revenue / max) * 100, 2)}%`,
                background: 'linear-gradient(180deg, #3DFF54 0%, rgba(61,255,84,0.3) 100%)',
                borderRadius: '4px 4px 0 0',
                minHeight: 4,
              }}
            />
          </div>
          <span style={{ fontSize: 10, color: 'var(--t3)' }}>{monthLabel(d.month)}</span>
        </div>
      ))}
    </div>
  );
}

export default function EarningsPage() {
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const partnerId = getPartnerId();

  useEffect(() => {
    if (!partnerId) { setLoading(false); setError('No partner ID found. Please log in again.'); return; }
    api.get<EarningsData>(`/wellness/${partnerId}/earnings`)
      .then(setData)
      .catch(() => setError('Failed to load earnings data'))
      .finally(() => setLoading(false));
  }, [partnerId]);

  const s = data?.summary;
  const growth = s && s.lastMonthNet > 0
    ? (((s.thisMonthNet - s.lastMonthNet) / s.lastMonthNet) * 100).toFixed(1)
    : null;

  return (
    <Shell title="Earnings">
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl" style={{ height: 80, background: 'var(--surface)' }} />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="glass p-6" style={{ borderColor: 'rgba(255,100,100,0.3)' }}>
          <p style={{ color: '#FF6464', fontSize: 14 }}>{error}</p>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
                  <DollarSign size={16} style={{ color: 'var(--accent)' }} />
                </div>
                <span className="accent-pill">all time</span>
              </div>
              <div className="text-2xl font-bold">{fmt(s!.netEarnings)}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--t2)' }}>Total Net Earnings</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>
                Revenue: {fmt(s!.totalRevenue)} · Fees: {fmt(s!.totalCommission)}
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
                  <TrendingUp size={16} style={{ color: 'var(--accent)' }} />
                </div>
                {growth !== null && (
                  <span className={`text-xs font-semibold ${Number(growth) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {Number(growth) >= 0 ? '+' : ''}{growth}% vs last mo.
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold">{fmt(s!.thisMonthNet)}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--t2)' }}>This Month (Net)</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>
                Gross: {fmt(s!.thisMonthRevenue)}
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,180,0,0.12)' }}>
                  <Calendar size={16} style={{ color: '#FFB400' }} />
                </div>
                <span className="accent-pill">MTD</span>
              </div>
              <div className="text-2xl font-bold">{s!.completedBookings}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--t2)' }}>Completed Bookings</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>of {s!.totalBookings} total</div>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(100,180,255,0.12)' }}>
                  <Clock size={16} style={{ color: '#64B4FF' }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: 'var(--t2)' }}>platform fee</span>
              </div>
              <div className="text-2xl font-bold">{fmt(s!.totalCommission)}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--t2)' }}>Total Platform Fees</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>
                {s!.totalRevenue > 0 ? ((s!.totalCommission / s!.totalRevenue) * 100).toFixed(1) : 0}% avg rate
              </div>
            </div>
          </div>

          {/* Monthly Chart + Recent Bookings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <div className="glass p-6">
              <h3 className="serif text-lg mb-5">Monthly Revenue (6 months)</h3>
              {data.monthly.length > 0 ? (
                <>
                  <BarChart data={data.monthly} />
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr style={{ color: 'var(--t3)' }}>
                          <th className="text-left pb-2">Month</th>
                          <th className="text-right pb-2">Revenue</th>
                          <th className="text-right pb-2">Fees</th>
                          <th className="text-right pb-2">Net</th>
                          <th className="text-right pb-2">Bookings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...data.monthly].reverse().map((m) => (
                          <tr key={m.month} style={{ borderTop: '1px solid var(--border)' }}>
                            <td className="py-2 font-medium">{monthLabel(m.month)}</td>
                            <td className="py-2 text-right" style={{ color: 'var(--t2)' }}>{fmt(m.revenue)}</td>
                            <td className="py-2 text-right" style={{ color: 'rgba(255,100,100,0.7)' }}>-{fmt(m.commission)}</td>
                            <td className="py-2 text-right font-semibold" style={{ color: 'var(--accent)' }}>{fmt(m.net)}</td>
                            <td className="py-2 text-right" style={{ color: 'var(--t2)' }}>{m.bookings}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p style={{ color: 'var(--t3)', fontSize: 13 }}>No revenue data yet.</p>
              )}
            </div>

            <div className="glass p-6">
              <h3 className="serif text-lg mb-4">Recent Transactions</h3>
              {data.recentBookings.length === 0 ? (
                <p style={{ color: 'var(--t3)', fontSize: 13 }}>No transactions yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.recentBookings.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge status={b.status} />
                          <span style={{ fontSize: 11, color: 'var(--t3)' }}>{fmtDate(b.bookingDate)}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--t2)' }}>
                          Gross: {fmt(b.amount)} · Fee: -{fmt(b.platformCommission)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold" style={{ color: b.net > 0 ? 'var(--accent)' : 'rgba(255,100,100,0.8)', fontSize: 15 }}>
                          {fmt(b.net)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--t3)' }}>net</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Earnings note */}
          <div className="glass p-4" style={{ borderColor: 'rgba(61,255,84,0.15)' }}>
            <div className="flex items-start gap-3">
              <CheckCircle size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.6 }}>
                Earnings shown above are calculated after platform commission. Settlements are processed
                monthly by the BookMyFit admin team. Funds are disbursed to your registered bank account
                by the 7th of each month for the previous month's completed bookings.
              </p>
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
