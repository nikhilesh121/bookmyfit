'use client';
import { Fragment, useState, useEffect } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { Building2, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, X } from 'lucide-react';

type Gym = {
  id: string;
  name: string;
  ownerName?: string;
  city: string;
  tier: string;
  status: string;
  createdAt?: string;
  address?: string;
  lat?: number;
  lng?: number;
  description?: string;
  amenities?: string[];
  commissionRate?: number;
  kycStatus?: string;
  kycReviewNote?: string;
  kycDocuments?: Array<{ type: string; name: string; url?: string; fields?: Record<string, any>; uploadedAt?: string; status?: string; reviewNote?: string; reviewedAt?: string; fileName?: string; mimeType?: string }>;
};

type FilterTab = 'pending' | 'approved' | 'rejected' | 'all';

function SkeletonRow() {
  return (
    <tr style={{ opacity: 0.4 }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i}>
          <div style={{ height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.08)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </td>
      ))}
    </tr>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'active' || status === 'approved') return <span className="badge-active">Approved</span>;
  if (status === 'in_review') return <span className="badge-pending">In Review</span>;
  if (status === 'rejected') return <span className="badge-danger">Rejected</span>;
  return <span className="badge-pending">Pending</span>;
}

function latestSubmittedAt(gym: Gym) {
  const dates = (gym.kycDocuments || [])
    .map((doc) => doc.uploadedAt)
    .filter(Boolean)
    .map((date) => new Date(String(date)).getTime())
    .filter((time) => Number.isFinite(time));
  const latest = dates.length ? Math.max(...dates) : (gym.createdAt ? new Date(gym.createdAt).getTime() : NaN);
  return Number.isFinite(latest) ? new Date(latest).toLocaleDateString() : '—';
}

function hasValidGymLocation(gym: Pick<Gym, 'lat' | 'lng'>) {
  const lat = Number(gym.lat);
  const lng = Number(gym.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
}

const REQUIRED_KYC_TYPES = [
  ['business_registration', 'Business Registration'],
  ['gst_certificate', 'GST Certificate'],
  ['identity_document', 'Owner Identity Document'],
  ['bank_details', 'Bank Details'],
] as const;

function fieldLabel(key: string) {
  return String(key || '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function isLinkValue(value: any) {
  return /^(https?:\/\/|data:)/i.test(String(value || '').trim());
}

function isImageDoc(url?: string, mimeType?: string) {
  const u = String(url || '').toLowerCase();
  if (String(mimeType || '').startsWith('image/')) return true;
  return /\.(png|jpe?g|webp|gif|bmp|heic)(\?|$)/i.test(u) || u.startsWith('data:image/');
}

function isPdfDoc(url?: string, mimeType?: string) {
  const u = String(url || '').toLowerCase();
  return String(mimeType || '') === 'application/pdf' || /\.pdf(\?|$)/i.test(u);
}

function KycDocPreview({ url, mimeType, fileName }: { url: string; mimeType?: string; fileName?: string }) {
  if (isImageDoc(url, mimeType)) {
    return (
      <a href={url} target="_blank" rel="noreferrer" style={{ display: 'block', marginBottom: 8 }} title="Open full image">
        <img
          src={url}
          alt={fileName || 'KYC document'}
          style={{
            width: '100%', maxWidth: 240, maxHeight: 180, objectFit: 'contain',
            borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)',
          }}
        />
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      style={{ color: 'var(--accent)', fontSize: 12, display: 'inline-flex', marginBottom: 8, fontWeight: 700 }}
    >
      {isPdfDoc(url, mimeType) ? 'Open PDF' : 'Open'} {fileName || 'document'}
    </a>
  );
}

function missingKycDetails(gym: Gym, requireApproved = false) {
  const docs = new Map((gym.kycDocuments || []).map((doc) => [doc.type, doc]));
  return REQUIRED_KYC_TYPES
    .filter(([type]) => {
      const doc = docs.get(type);
      return requireApproved ? doc?.status !== 'approved' : !doc;
    })
    .map(([, label]) => label);
}

export default function KYCPage() {
  const { toast } = useToast();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FilterTab>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = async (status?: string) => {
    setLoading(true);
    try {
      const path = status && status !== 'all' ? `/gyms/admin/list?kycStatus=${status}&page=1&limit=100` : '/gyms/admin/list?page=1&limit=100';
      const data = await api.get<any>(path);
      setGyms(Array.isArray(data) ? data : data?.data ?? []);
    } catch {
      setGyms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(tab === 'pending' ? 'in_review' : tab);
  }, [tab]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await api.post(`/gyms/${id}/approve`);
      toast('Gym approved');
      setGyms((prev) => prev.filter((g) => g.id !== id));
    } catch (e: any) {
      toast(e.message || 'Approval failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal.id);
    try {
      await api.post(`/gyms/${rejectModal.id}/reject`, { reason: rejectReason });
      toast('Gym rejected');
      setGyms((prev) => prev.filter((g) => g.id !== rejectModal.id));
      setRejectModal(null);
      setRejectReason('');
    } catch (e: any) {
      toast(e.message || 'Rejection failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const reviewDocument = async (gymId: string, type: string, status: 'approved' | 'rejected') => {
    const reason = status === 'rejected' ? window.prompt('Reason for rejecting this document?') || 'Rejected by admin' : '';
    const key = `${gymId}:${type}`;
    setActionLoading(key);
    try {
      const updated: any = await api.patch(`/gyms/${gymId}/kyc-documents/${type}/review`, { status, reason });
      setGyms((prev) => prev.map((g) => g.id === gymId ? {
        ...g,
        kycStatus: updated?.kycStatus || g.kycStatus,
        kycReviewNote: updated?.kycReviewNote || null,
        kycDocuments: updated?.kycDocuments || g.kycDocuments,
      } : g));
      toast(status === 'approved' ? 'Document approved' : 'Document rejected');
    } catch (e: any) {
      toast(e.message || 'Document review failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const pending = gyms.filter((g) => (g.kycStatus || g.status) === 'in_review').length;
  const approved = gyms.filter((g) => (g.kycStatus || g.status) === 'approved').length;
  const rejected = gyms.filter((g) => (g.kycStatus || g.status) === 'rejected').length;

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'all', label: 'All' },
  ];

  return (
    <Shell title="KYC Review">
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .kyc-detail-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 24px;
        }
        @media (min-width: 1024px) {
          .kyc-detail-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
        }
      `}</style>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Pending', value: pending, icon: Clock, color: '#FFB400' },
          { label: 'Approved Loaded', value: approved, icon: CheckCircle, color: 'var(--accent)' },
          { label: 'Rejected Loaded', value: rejected, icon: XCircle, color: '#FF3C3C' },
          { label: 'Loaded Gyms', value: gyms.length, icon: Building2, color: '#00AFFF' },
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
      <div className="flex gap-2 mb-5 flex-wrap">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
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

      {/* Table */}
      <div className="glass overflow-hidden">
        <table className="glass-table">
          <thead>
            <tr>
              <th>Gym Name</th>
              <th>Owner</th>
              <th>City</th>
              <th>Tier</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              : gyms.length === 0
                ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--t2)', padding: '60px 0' }}>
                      <Building2 size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                      <div style={{ fontSize: 14 }}>No gyms found for this filter</div>
                    </td>
                  </tr>
                )
                : gyms.map((g) => {
                  const locationReady = hasValidGymLocation(g);
                  const missingKyc = missingKycDetails(g);
                  const approveBlocked = actionLoading === g.id || !locationReady || missingKyc.length > 0;
                  const approveTitle = !locationReady
                    ? 'Set valid gym coordinates before approval'
                    : missingKyc.length > 0
                      ? `Missing required KYC: ${missingKyc.join(', ')}`
                      : undefined;
                  return (
                  <Fragment key={g.id}>
                    <tr>
                      <td className="font-semibold" style={{ color: '#fff' }}>{g.name}</td>
                      <td style={{ color: 'var(--t2)' }}>{g.ownerName || '—'}</td>
                      <td>{g.city}</td>
                      <td>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.08)', color: 'var(--t)' }}>
                          {g.tier || 'Standard'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--t2)', fontSize: 12 }}>
                        {latestSubmittedAt(g)}
                      </td>
                      <td><StatusBadge status={g.kycStatus || g.status} /></td>
                      <td>
                        <div className="flex items-center gap-2">
                          {(g.kycStatus === 'in_review' || g.status === 'pending') && (
                            <>
                              <button
                                onClick={() => handleApprove(g.id)}
                                disabled={approveBlocked}
                                title={approveTitle}
                                className="btn btn-primary text-xs"
                                style={{ padding: '4px 10px', fontSize: 11, opacity: approveBlocked ? 0.55 : 1 }}>
                                {actionLoading === g.id ? '…' : 'Approve'}
                              </button>
                              <button
                                onClick={() => { setRejectModal({ id: g.id, name: g.name }); setRejectReason(''); }}
                                disabled={actionLoading === g.id}
                                className="btn text-xs"
                                style={{ padding: '4px 10px', fontSize: 11, background: 'rgba(255,60,60,0.15)', color: '#FF3C3C', border: '1px solid rgba(255,60,60,0.3)' }}>
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setExpandedId(expandedId === g.id ? null : g.id)}
                            className="btn btn-ghost text-xs"
                            style={{ padding: '4px 10px', fontSize: 11 }}>
                            Details {expandedId === g.id ? <ChevronUp size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> : <ChevronDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === g.id && (
                      <tr key={`${g.id}-expanded`} style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <td colSpan={7} style={{ padding: '16px 24px' }}>
                          <div className="kyc-detail-grid" style={{ fontSize: 13, alignItems: 'start', maxWidth: '100%', overflow: 'hidden' }}>
                            <div style={{ minWidth: 0 }}>
                              <div className="kicker mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>KYC Status</div>
                              <div style={{ color: 'var(--t)', marginBottom: 12 }}>{g.kycStatus || g.status || 'not_started'}</div>
                              {missingKyc.length > 0 && (
                                <div style={{ color: '#FFB400', marginBottom: 12, fontSize: 12 }}>
                                  Missing required KYC: {missingKyc.join(', ')}
                                </div>
                              )}
                              {g.kycReviewNote && (
                                <>
                                  <div className="kicker mt-4 mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Review Note</div>
                                  <div style={{ color: 'var(--t2)', overflowWrap: 'anywhere' }}>{g.kycReviewNote}</div>
                                </>
                              )}
                              <div className="kicker mt-4 mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Address</div>
                              <div style={{ color: 'var(--t)', overflowWrap: 'anywhere' }}>{g.address || 'Not provided'}</div>
                              <div className="kicker mt-4 mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Nearby Location</div>
                              <div style={{ color: locationReady ? 'var(--t)' : '#FFB400' }}>
                                {locationReady ? `${Number(g.lat).toFixed(6)}, ${Number(g.lng).toFixed(6)}` : 'Coordinates required before approval'}
                              </div>
                              <div className="kicker mt-4 mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Description</div>
                              <div
                                style={{
                                  color: 'var(--t2)', lineHeight: 1.6,
                                  overflowWrap: 'anywhere', wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                                  maxHeight: 160, overflowY: 'auto',
                                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                                  borderRadius: 10, padding: '10px 12px',
                                }}
                              >
                                {g.description || 'No description'}
                              </div>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div className="kicker mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Tier</div>
                              <div style={{ color: 'var(--t)' }}>{g.tier || 'Standard'}</div>
                              <div className="kicker mt-4 mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Amenities</div>
                              {g.amenities && g.amenities.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {g.amenities.map((a) => (
                                    <span key={a} style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, background: 'rgba(61,255,84,0.1)', color: 'var(--accent)', border: '1px solid rgba(61,255,84,0.2)' }}>
                                      {a}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div style={{ color: 'var(--t3)' }}>None listed</div>
                              )}
                              <div className="kicker mt-4 mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Submitted KYC Details</div>
                              {g.kycDocuments && g.kycDocuments.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
                                  {g.kycDocuments.map((doc) => (
                                    <div key={doc.type} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 10, minWidth: 0, overflow: 'hidden' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 6 }}>
                                        <div style={{ color: '#fff', fontWeight: 700, minWidth: 0, overflowWrap: 'anywhere' }}>{doc.name}</div>
                                        <StatusBadge status={doc.status || 'in_review'} />
                                      </div>
                                      {doc.url && (
                                        <KycDocPreview url={doc.url} mimeType={doc.mimeType} fileName={doc.fileName} />
                                      )}
                                      {doc.fields && Object.entries(doc.fields).map(([key, value]) => (
                                        <div key={key} style={{ display: 'grid', gridTemplateColumns: '130px minmax(0, 1fr)', gap: 12, fontSize: 12, marginTop: 6, alignItems: 'start', minWidth: 0 }}>
                                          <span style={{ color: 'var(--t3)', minWidth: 0, overflowWrap: 'anywhere' }}>{fieldLabel(key)}</span>
                                          {isLinkValue(value) ? (
                                            isImageDoc(String(value)) ? (
                                              <a href={String(value)} target="_blank" rel="noreferrer" style={{ minWidth: 0 }} title="Open full image">
                                                <img
                                                  src={String(value)}
                                                  alt={fieldLabel(key)}
                                                  style={{ width: '100%', maxWidth: 200, maxHeight: 140, objectFit: 'contain', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)' }}
                                                />
                                              </a>
                                            ) : (
                                              <a
                                                href={String(value)}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{ color: 'var(--accent)', minWidth: 0, overflowWrap: 'anywhere' }}
                                              >
                                                Open link
                                              </a>
                                            )
                                          ) : (
                                          <span style={{ color: 'var(--t2)', minWidth: 0, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{String(value || '—')}</span>
                                          )}
                                        </div>
                                      ))}
                                      {doc.reviewNote && (
                                        <div style={{ color: '#ff9f9f', fontSize: 12, marginTop: 8 }}>Note: {doc.reviewNote}</div>
                                      )}
                                      <div className="flex gap-2 mt-3">
                                        <button
                                          onClick={() => reviewDocument(g.id, doc.type, 'approved')}
                                          disabled={actionLoading === `${g.id}:${doc.type}` || doc.status === 'approved'}
                                          className="btn btn-primary text-xs"
                                          style={{ padding: '4px 10px', fontSize: 11, opacity: doc.status === 'approved' ? 0.5 : 1 }}
                                        >
                                          Approve Form
                                        </button>
                                        <button
                                          onClick={() => reviewDocument(g.id, doc.type, 'rejected')}
                                          disabled={actionLoading === `${g.id}:${doc.type}` || doc.status === 'rejected'}
                                          className="btn text-xs"
                                          style={{ padding: '4px 10px', fontSize: 11, background: 'rgba(255,60,60,0.15)', color: '#FF3C3C', border: '1px solid rgba(255,60,60,0.3)', opacity: doc.status === 'rejected' ? 0.5 : 1 }}
                                        >
                                          Reject Form
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div style={{ color: 'var(--t3)' }}>No KYC documents submitted</div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="glass" style={{ width: 440, padding: 32, borderRadius: 20 }}>
            <div className="flex items-center justify-between mb-5">
              <div className="serif" style={{ fontSize: 18, fontWeight: 700 }}>Reject Gym</div>
              <button onClick={() => setRejectModal(null)} style={{ background: 'none', color: 'var(--t2)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ color: 'var(--t2)', fontSize: 13, marginBottom: 16 }}>
              Please provide a reason for rejecting <strong style={{ color: '#fff' }}>{rejectModal.name}</strong>.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="glass-input"
              placeholder="Enter rejection reason..."
              rows={4}
              style={{ width: '100%', resize: 'vertical' }}
            />
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setRejectModal(null)} className="btn btn-ghost text-sm">Cancel</button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading === rejectModal.id}
                className="btn text-sm"
                style={{ background: 'rgba(255,60,60,0.2)', color: '#FF3C3C', border: '1px solid rgba(255,60,60,0.4)', opacity: !rejectReason.trim() ? 0.5 : 1 }}>
                {actionLoading === rejectModal.id ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
