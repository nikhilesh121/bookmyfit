'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { AlertTriangle, Calendar, CreditCard, Dumbbell, Hash, ReceiptText, Search, User, Users } from 'lucide-react';

type TrainerAddon = {
  id?: string;
  trainerId?: string;
  trainerName?: string;
  specialization?: string | null;
  status?: string;
  sessionDate?: string;
  durationMonths?: number;
  sessions?: number;
  amount?: number;
  platformCommission?: number;
  monthlyPrice?: number;
  gymAmount?: number;
  cashfreeOrderId?: string | null;
};

type MemberHistoryItem = {
  id: string;
  memberId?: string;
  subscriptionId?: string;
  userId: string;
  memberCode?: string;
  name: string;
  phone?: string | null;
  planType: string;
  planName?: string | null;
  gymPlanId?: string | null;
  gymIds?: string[];
  durationMonths?: number;
  gymType: string;
  gymCount?: number;
  status: string;
  subscriptionStatus?: string;
  startDate: string;
  endDate: string;
  gymAmount?: number;
  amountPaid?: number;
  userPaidAmount?: number;
  subscriptionGymAmount?: number;
  trainerGymAmount?: number;
  trainerAddons?: TrainerAddon[];
  trainerSummary?: string | null;
  checkinsAtGym?: number;
  lastVisitAt?: string;
  cashfreeOrderId?: string | null;
  cashfreePaymentId?: string | null;
  invoiceNumber?: string | null;
  planBaseAmount?: number | null;
  createdAt?: string;
};

type MemberRow = MemberHistoryItem & {
  subscriptionCount?: number;
  lifetimeGymAmount?: number;
  totalCheckinsAtGym?: number;
  lastVisit?: string;
  history?: MemberHistoryItem[];
};

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'pending', label: 'Pending' },
  { key: 'expired', label: 'Expired' },
  { key: 'cancelled', label: 'Deactivated' },
] as const;

function formatMoney(value: any) {
  return `Rs ${Number(value || 0).toLocaleString('en-IN')}`;
}

function formatDate(value: any) {
  if (!value) return '-';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(value: any) {
  if (!value) return '-';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '-';
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function shortRef(value?: string | null) {
  if (!value) return '-';
  return value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
}

function memberCode(member?: Pick<MemberHistoryItem, 'memberCode' | 'memberId' | 'userId' | 'id'> | null) {
  if (!member) return 'BMF-UNKNOWN';
  return member.memberCode || `BMF-${String(member.memberId || member.userId || member.id || '').replace(/-/g, '').slice(0, 10).toUpperCase()}`;
}

function trainerLabel(item: MemberHistoryItem) {
  const addons = item.trainerAddons || [];
  if (!addons.length) return item.trainerSummary || 'No trainer selected';
  return addons.map((addon) => addon.trainerName || 'Assigned trainer').join(', ');
}

function planLabel(value: string) {
  const labels: Record<string, string> = { same_gym: 'Same Gym', day_pass: 'Day Pass', multi_gym: 'Multi Gym' };
  return labels[String(value || '').toLowerCase()] || value || 'Plan';
}

function statusStyle(status: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    active: { color: '#22c55e', background: 'rgba(34,197,94,0.15)' },
    pending: { color: '#64A0FF', background: 'rgba(100,160,255,0.15)' },
    expired: { color: '#FFB400', background: 'rgba(255,180,0,0.15)' },
    cancelled: { color: '#ef4444', background: 'rgba(239,68,68,0.15)' },
  };
  return map[status] || map.pending;
}

function MemberHistoryContent() {
  const params = useSearchParams();
  const initialMember = params.get('memberId') || '';
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [selectedId, setSelectedId] = useState(initialMember);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<any>(
        `/gyms/my-members?page=1&limit=100${search ? `&search=${encodeURIComponent(search)}` : ''}${status !== 'all' ? `&status=${status}` : ''}`,
      );
      const rows: MemberRow[] = Array.isArray(res) ? res : res?.data ?? [];
      setMembers(rows);
      setSelectedId((current) => current || (rows[0] ? rows[0].memberId || rows[0].userId || rows[0].id : ''));
    } catch (e: any) {
      setMembers([]);
      setError(e?.message || 'Failed to load member history');
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => { load(); }, [load]);

  const selected = useMemo(() => {
    return members.find((member) => (member.memberId || member.userId || member.id) === selectedId) || members[0] || null;
  }, [members, selectedId]);

  const history = useMemo(() => {
    return [...(selected?.history || (selected ? [selected] : []))]
      .sort((a, b) => new Date(b.createdAt || b.startDate || 0).getTime() - new Date(a.createdAt || a.startDate || 0).getTime());
  }, [selected]);

  const activePlan = history.find((item) => item.status === 'active');

  return (
    <Shell title="Member History">
      {error && (
        <div className="card p-3 mb-4 text-xs" style={{ color: '#FFB400', background: 'rgba(255,180,0,0.05)', borderColor: 'rgba(255,180,0,0.3)' }}>
          <AlertTriangle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-5 min-w-0">
        <div className="glass p-4 min-w-0">
          <div className="relative mb-3">
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)' }} />
            <input
              className="glass-input w-full"
              placeholder="Search member name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
          </div>
          <div className="flex gap-2 flex-wrap mb-4">
            {STATUS_FILTERS.map((item) => (
              <button
                key={item.key}
                className="btn text-xs"
                onClick={() => setStatus(item.key)}
                style={{
                  background: status === item.key ? 'var(--accent)' : 'var(--glass-bg)',
                  color: status === item.key ? '#000' : 'var(--t)',
                  padding: '6px 12px',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
              ))
            ) : members.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--t3)' }}>No member history found.</p>
            ) : members.map((member) => {
              const id = member.memberId || member.userId || member.id;
              const active = selected && id === (selected.memberId || selected.userId || selected.id);
              return (
                <button
                  key={id}
                  className="w-full text-left rounded-xl p-3 transition"
                  onClick={() => setSelectedId(id)}
                  style={{
                    background: active ? 'rgba(204,255,0,0.12)' : 'rgba(255,255,255,0.04)',
                    border: active ? '1px solid rgba(204,255,0,0.28)' : '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[13px] text-white truncate">{member.name}</span>
                    <span className="text-[11px]" style={{ color: 'var(--t2)' }}>{member.subscriptionCount || 1} plans</span>
                  </div>
                  <div className="text-[11px] mt-1" style={{ color: 'var(--t2)', fontFamily: 'monospace' }}>ID {memberCode(member)}</div>
                  <div className="text-[10px] mt-1" style={{ color: 'var(--t3)' }}>
                    Earned {formatMoney(member.lifetimeGymAmount || member.gymAmount || 0)} / {member.totalCheckinsAtGym || 0} visits
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-5 min-w-0">
          {!selected ? (
            <div className="glass p-8 text-center" style={{ color: 'var(--t2)' }}>
              Select a member to view subscription and check-in history.
            </div>
          ) : (
            <>
              <div
                className="min-w-0"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}
              >
                {[
                  { label: 'Member', value: selected.name, icon: User },
                  { label: 'Member ID', value: memberCode(selected), icon: Hash },
                  { label: 'Subscriptions', value: String(selected.subscriptionCount || history.length || 1), icon: CreditCard },
                  { label: 'Gym Earned', value: formatMoney(selected.lifetimeGymAmount || history.reduce((sum, item) => sum + Number(item.gymAmount || item.amountPaid || 0), 0)), icon: Calendar },
                  { label: 'Check-ins', value: String(selected.totalCheckinsAtGym || history.reduce((sum, item) => sum + Number(item.checkinsAtGym || 0), 0)), icon: Users },
                  { label: 'Active Trainer', value: trainerLabel(activePlan || history[0] || selected), icon: Dumbbell },
                  { label: 'Last Visit', value: formatDateTime(selected.lastVisitAt), icon: Hash },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="card p-3 min-w-0">
                      <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--t2)' }}>
                        <Icon size={14} color="var(--accent)" style={{ flexShrink: 0 }} />
                        <span className="text-[11px] font-semibold truncate">{item.label}</span>
                      </div>
                      <div className="text-[15px] font-bold text-white leading-snug" style={{ overflowWrap: 'anywhere' }}>
                        {item.value}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="glass p-5 min-w-0" style={{ overflow: 'hidden' }}>
                <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                  <div className="min-w-0">
                    <h3 className="serif text-lg">Subscription Timeline</h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--t2)' }}>
                      Shows only this gym's subscriptions, day passes, trainer add-ons, and multi-gym visits for this member.
                    </p>
                  </div>
                  {activePlan && (
                    <span className="accent-pill text-xs" style={{ flexShrink: 0 }}>Current: {planLabel(activePlan.planType)}</span>
                  )}
                </div>

                <div className="overflow-x-auto" style={{ maxWidth: '100%', paddingBottom: 4 }}>
                  <table className="glass-table" style={{ minWidth: 860, tableLayout: 'fixed' }}>
                    <thead>
                      <tr>
                        <th style={{ width: 120 }}>Plan</th>
                        <th style={{ width: 130 }}>Period</th>
                        <th style={{ width: 105 }}>Status</th>
                        <th style={{ width: 150 }}>Trainer</th>
                        <th style={{ width: 145 }}>Gym Amount</th>
                        <th style={{ width: 120 }}>Visits</th>
                        <th style={{ width: 155 }}>Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((item) => {
                        const style = statusStyle(item.status);
                        const trainerAddons = item.trainerAddons || [];
                        return (
                          <tr key={item.id}>
                            <td>
                              <div className="text-[12px] font-bold text-white">{planLabel(item.planType)}</div>
                              <div className="text-[11px] mt-1" style={{ color: 'var(--t2)' }}>
                                {item.planName || (item.durationMonths ? `${item.durationMonths} month package` : 'Membership')}
                              </div>
                            </td>
                            <td className="text-[11px]" style={{ color: 'var(--t2)' }}>
                              <div><span style={{ color: 'var(--t3)' }}>Start</span> {formatDate(item.startDate)}</div>
                              <div><span style={{ color: 'var(--t3)' }}>End</span> {formatDate(item.endDate)}</div>
                            </td>
                            <td>
                              <span className="text-[11px] rounded-full px-2 py-1 font-semibold capitalize" style={style}>{item.status}</span>
                            </td>
                            <td className="text-[11px]" style={{ color: 'var(--t2)' }}>
                              {trainerAddons.length ? trainerAddons.map((addon) => (
                                <div key={addon.id || addon.trainerId || addon.trainerName} className="mb-2">
                                  <div className="font-semibold text-white">{addon.trainerName || 'Assigned trainer'}</div>
                                  <div>{addon.specialization || 'Trainer'} / {addon.durationMonths || item.durationMonths || 1} mo</div>
                                  <div>{formatMoney(addon.gymAmount || 0)} gym amount</div>
                                </div>
                              )) : (
                                <span style={{ color: 'var(--t3)' }}>No trainer selected</span>
                              )}
                            </td>
                            <td className="text-[11px]">
                              <div className="font-bold text-white">{formatMoney(item.gymAmount || item.amountPaid || 0)}</div>
                              {Number(item.trainerGymAmount || 0) > 0 && (
                                <>
                                  <div style={{ color: 'var(--t2)' }}>Plan {formatMoney(item.subscriptionGymAmount || 0)}</div>
                                  <div style={{ color: 'var(--t2)' }}>Trainer {formatMoney(item.trainerGymAmount || 0)}</div>
                                </>
                              )}
                            </td>
                            <td className="text-[11px]" style={{ color: 'var(--t2)' }}>
                              <div>{item.checkinsAtGym || 0} check-ins</div>
                              <div>Last {formatDateTime(item.lastVisitAt)}</div>
                            </td>
                            <td className="text-[11px]" style={{ color: 'var(--t2)' }}>
                              <div className="flex items-center gap-1 text-white">
                                <ReceiptText size={12} color="var(--accent)" /> {item.invoiceNumber || 'No invoice'}
                              </div>
                              <div>Sub {shortRef(item.subscriptionId || item.id)}</div>
                              {item.cashfreeOrderId && <div>Order {shortRef(item.cashfreeOrderId)}</div>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}

export default function MemberHistoryPage() {
  return (
    <Suspense fallback={<Shell title="Member History"><div className="glass p-8 text-center" style={{ color: 'var(--t2)' }}>Loading member history...</div></Shell>}>
      <MemberHistoryContent />
    </Suspense>
  );
}
