'use client';

import { useState, useEffect } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { Bell, TrendingUp, Clock, Send, CheckCircle, Radio } from 'lucide-react';

interface NotificationRow {
  id: string;
  title: string;
  body?: string;
  target: string;
  type: string;
  sentAt: string;
  status: string;
  recipients: number;
  isRead?: boolean;
}

function formatDate(d: string) {
  if (!d) return '--';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'delivered' || status === 'read') return <span className="badge-active">{status}</span>;
  if (status === 'pending') return <span className="badge-pending">{status}</span>;
  return <span className="badge-danger">{status}</span>;
}

export default function NotificationsPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [activeTab, setActiveTab] = useState<'send' | 'broadcast'>('broadcast');

  const [sendForm, setSendForm] = useState({ userId: '', title: '', body: '' });
  const [broadcastForm, setBroadcastForm] = useState({ title: '', body: '', role: '' });

  const load = async () => {
    try {
      const res: any = await api.get('/notifications');
      const arr = Array.isArray(res) ? res : res?.data ?? [];
      setNotifications(arr.length ? arr.map((n: any) => ({
        id: n.id ?? n._id,
        title: n.title ?? n.message ?? '--',
        body: n.body ?? n.message,
        target: n.target ?? n.role ?? 'All',
        type: n.type ?? 'info',
        sentAt: n.sentAt ?? n.createdAt ?? '',
        status: n.isRead ? 'read' : (n.status ?? 'delivered'),
        recipients: n.recipients ?? 1,
        isRead: n.isRead ?? false,
      })) : []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSendToUser = async () => {
    if (!sendForm.userId.trim() || !sendForm.title.trim() || !sendForm.body.trim()) {
      toast('Fill all fields', 'error'); return;
    }
    setSending(true);
    try {
      await api.post('/notifications/send', { userId: sendForm.userId, title: sendForm.title, body: sendForm.body });
      toast('Notification sent to user');
      setSendForm({ userId: '', title: '', body: '' });
      load();
    } catch (e: any) {
      toast(e.message || 'Failed to send', 'error');
    } finally { setSending(false); }
  };

  const handleBroadcast = async () => {
    if (!broadcastForm.title.trim() || !broadcastForm.body.trim()) {
      toast('Fill title and body', 'error'); return;
    }
    setBroadcasting(true);
    try {
      const payload: any = { title: broadcastForm.title, body: broadcastForm.body };
      if (broadcastForm.role) payload.role = broadcastForm.role;
      await api.post('/notifications/broadcast', payload);
      toast('Broadcast sent successfully');
      setBroadcastForm({ title: '', body: '', role: '' });
      load();
    } catch (e: any) {
      toast(e.message || 'Failed to broadcast', 'error');
    } finally { setBroadcasting(false); }
  };

  const markRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true, status: 'read' } : n));
      toast('Marked as read', 'info');
    } catch (e: any) {
      toast(e.message || 'Failed', 'error');
    }
  };

  return (
    <Shell title="Push Notifications">
      <div style={{ maxWidth: 1100 }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Bell size={22} color="var(--accent)" />
            <div>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Notifications</p>
              <p className="stat-glow" style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700 }}>{notifications.length}</p>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <TrendingUp size={22} color="var(--accent)" />
            <div>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unread</p>
              <p className="stat-glow" style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700 }}>{notifications.filter((n) => !n.isRead).length}</p>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Clock size={22} color="var(--t2)" />
            <div>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recipients (Total)</p>
              <p className="stat-glow" style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700 }}>{notifications.reduce((a, n) => a + (n.recipients || 0), 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Send / Broadcast Tabs */}
        <div className="glass p-6 mb-6">
          <div className="flex gap-2 mb-5">
            {(['broadcast', 'send'] as const).map((t) => (
              <button key={t} onClick={() => setActiveTab(t)}
                className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
                style={{ background: activeTab === t ? 'var(--accent)' : 'var(--surface)', color: activeTab === t ? 'var(--bg)' : 'var(--t2)', border: '1px solid var(--border)' }}>
                {t === 'broadcast' ? '📡 Broadcast to All' : '🎯 Send to User'}
              </button>
            ))}
          </div>

          {activeTab === 'broadcast' && (
            <div>
              <h3 className="serif text-base mb-4">Broadcast Notification</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="kicker block mb-1">Title</label>
                  <input className="glass-input w-full" placeholder="Notification title..." value={broadcastForm.title}
                    onChange={(e) => setBroadcastForm((f) => ({ ...f, title: e.target.value }))} />
                </div>
                <div>
                  <label className="kicker block mb-1">Role (optional)</label>
                  <select className="glass-input w-full" value={broadcastForm.role}
                    onChange={(e) => setBroadcastForm((f) => ({ ...f, role: e.target.value }))}>
                    <option value="">All Users</option>
                    <option value="user">Users Only</option>
                    <option value="gym_owner">Gym Owners</option>
                    <option value="corporate">Corporate</option>
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="kicker block mb-1">Message Body</label>
                <textarea className="glass-input w-full" style={{ height: '5rem', resize: 'none' }}
                  placeholder="Write your broadcast message..."
                  value={broadcastForm.body}
                  onChange={(e) => setBroadcastForm((f) => ({ ...f, body: e.target.value }))} />
              </div>
              <button className="btn btn-primary flex items-center gap-2" onClick={handleBroadcast} disabled={broadcasting}>
                <Radio size={15} /> {broadcasting ? 'Sending...' : 'Broadcast Now'}
              </button>
            </div>
          )}

          {activeTab === 'send' && (
            <div>
              <h3 className="serif text-base mb-4">Send to Specific User</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="kicker block mb-1">User ID</label>
                  <input className="glass-input w-full" placeholder="User ID..." value={sendForm.userId}
                    onChange={(e) => setSendForm((f) => ({ ...f, userId: e.target.value }))} />
                </div>
                <div>
                  <label className="kicker block mb-1">Title</label>
                  <input className="glass-input w-full" placeholder="Notification title..." value={sendForm.title}
                    onChange={(e) => setSendForm((f) => ({ ...f, title: e.target.value }))} />
                </div>
              </div>
              <div className="mb-4">
                <label className="kicker block mb-1">Message Body</label>
                <textarea className="glass-input w-full" style={{ height: '5rem', resize: 'none' }}
                  placeholder="Write your message..."
                  value={sendForm.body}
                  onChange={(e) => setSendForm((f) => ({ ...f, body: e.target.value }))} />
              </div>
              <button className="btn btn-primary flex items-center gap-2" onClick={handleSendToUser} disabled={sending}>
                <Send size={15} /> {sending ? 'Sending...' : 'Send Notification'}
              </button>
            </div>
          )}
        </div>

        {/* Notifications Table */}
        <h3 className="serif" style={{ fontSize: '1.1rem', color: 'var(--t)', marginBottom: '0.9rem' }}>All Notifications</h3>
        <div className="glass" style={{ borderRadius: 12, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse" style={{ height: 40, borderRadius: 6, background: 'var(--surface)' }} />
              ))}
            </div>
          ) : (
            <table className="glass-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  {['Title', 'Target', 'Type', 'Sent At', 'Status', 'Actions'].map((col) => (
                    <th key={col} style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {notifications.map((n, i) => (
                  <tr key={n.id} style={{ borderBottom: i < notifications.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.88rem', color: 'var(--t)', fontWeight: 500 }}>{n.title || '--'}</td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.88rem', color: 'var(--t2)' }}>{n.target || '--'}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span className="accent-pill" style={{ textTransform: 'capitalize', fontSize: '0.75rem' }}>{n.type || '--'}</span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--t3)' }}>{formatDate(n.sentAt)}</td>
                    <td style={{ padding: '0.85rem 1rem' }}><StatusBadge status={n.status} /></td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {!n.isRead && (
                        <button onClick={() => markRead(n.id)} style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: 6, background: 'rgba(61,255,84,0.1)', border: '1px solid rgba(61,255,84,0.2)', color: 'var(--accent)', cursor: 'pointer' }}>
                          Mark Read
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {notifications.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--t3)', fontSize: '0.88rem' }}>No notifications found</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Shell>
  );
}

