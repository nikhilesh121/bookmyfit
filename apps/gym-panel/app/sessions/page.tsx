'use client'

import Shell from '../../components/Shell'
import { api } from '../../lib/api'
import { useEffect, useState } from 'react'
import { Calendar, Clock, Users, Activity, Plus, X, ChevronDown, AlertTriangle } from 'lucide-react'

type Trainer = { id: string; name: string; specialization?: string }

type Session = {
  id: string;
  name: string;
  trainer: string;
  type: string;
  date: string;
  time: string;
  capacity: number;
  enrolled: number;
  status: string;
}

const TYPE_COLORS: Record<string, { background: string; color: string }> = {
  Yoga:     { background: 'rgba(180,120,255,0.18)', color: '#B478FF' },
  HIIT:     { background: 'rgba(255,60,60,0.15)',   color: '#FF6432' },
  Strength: { background: 'rgba(100,160,255,0.15)', color: '#64A0FF' },
  Cardio:   { background: 'rgba(61,255,84,0.12)',   color: 'var(--accent)' },
  Spin:     { background: 'rgba(255,220,0,0.15)',   color: '#FFDC00' },
  CrossFit: { background: 'rgba(255,140,0,0.15)',   color: '#FF8C00' },
}

function TypeBadge({ type }: { type: string }) {
  const s = TYPE_COLORS[type] ?? { background: 'rgba(255,255,255,0.08)', color: 'var(--t)' }
  return (
    <span style={{ ...s, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
      {type}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'Active')    return <span className="badge-active">{status}</span>
  if (status === 'Full')      return <span className="badge-pending">{status}</span>
  if (status === 'Draft')     return <span className="badge-danger">{status}</span>
  if (status === 'Completed') return <span className="badge-suspended">{status}</span>
  return <span>{status}</span>
}

function SkeletonRow() {
  const cell: React.CSSProperties = {
    height: 14,
    borderRadius: 6,
    background: 'rgba(255,255,255,0.08)',
    animation: 'pulse 1.5s ease-in-out infinite',
  }
  return (
    <tr>
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i}><div style={cell} /></td>
      ))}
    </tr>
  )
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [showForm, setShowForm] = useState(false)
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [gymId, setGymId]       = useState('')

  const [fName,     setFName]     = useState('')
  const [fType,     setFType]     = useState('Yoga')
  const [fTrainer,  setFTrainer]  = useState('')
  const [fDate,     setFDate]     = useState('')
  const [fTime,     setFTime]     = useState('')
  const [fCapacity, setFCapacity] = useState('')

  useEffect(() => {
    const init = async () => {
      try {
        const gymData = await api.get<any>('/gyms/my-gym');
        const gid = gymData?.id ?? gymData?.data?.id ?? '';
        setGymId(gid);
        if (gid) {
          const trainerRes = await api.get<any>(`/trainers?gymId=${gid}&limit=100`);
          const trainerList: Trainer[] = Array.isArray(trainerRes) ? trainerRes : (trainerRes?.data ?? []);
          setTrainers(trainerList.map((t: any) => ({ id: t.id, name: t.name, specialization: t.specialization })));
          if (trainerList.length > 0) setFTrainer(trainerList[0].id);
        }
      } catch { /* gym/trainer fetch failed, continue */ }

      try {
        const data = await api.get<any>('/sessions/my-gym');
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        setSessions(list);
      } catch {
        setError('API unavailable.')
        setSessions([])
      } finally {
        setLoading(false)
      }
    };
    init();
  }, [])

  const today         = new Date().toISOString().slice(0, 10)
  const todayCount    = sessions.filter(s => s.date === today).length
  const totalEnrolled = sessions.reduce((acc, s) => acc + s.enrolled, 0)
  const upcoming      = sessions.filter(s => s.status === 'Active' || s.status === 'Full').length
  const completed     = sessions.filter(s => s.status === 'Completed').length

  async function handleCreate() {
    if (!fName.trim() || !fDate || !fTime || !fCapacity) return
    const trainerName = trainers.find(t => t.id === fTrainer)?.name ?? fTrainer
    const newSession: Session = {
      id:       's' + Date.now(),
      name:     fName,
      trainer:  trainerName,
      type:     fType,
      date:     fDate,
      time:     fTime,
      capacity: parseInt(fCapacity) || 0,
      enrolled: 0,
      status:   'Active',
    }
    try {
      await api.post('/sessions/my-gym', {
        name: fName, type: fType, trainerId: fTrainer, trainerName,
        date: fDate, time: fTime, capacity: parseInt(fCapacity) || 0,
        gymId, status: 'Active',
      });
    } catch { /* stored in-memory fallback */ }
    setSessions(prev => [newSession, ...prev])
    setFName(''); setFType('Yoga'); setFTrainer(trainers[0]?.id ?? ''); setFDate(''); setFTime(''); setFCapacity('')
    setShowForm(false)
  }

  const statCards = [
    { label: "Today's Sessions",       value: todayCount,    icon: <Calendar size={18} /> },
    { label: 'Total Members Attended', value: totalEnrolled, icon: <Users size={18} /> },
    { label: 'Upcoming',               value: upcoming,      icon: <Clock size={18} /> },
    { label: 'Completed',              value: completed,     icon: <Activity size={18} /> },
  ]

  return (
    <Shell title="Sessions & Classes">
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,60,60,0.1)', border: '1px solid rgba(255,60,60,0.25)',
          borderRadius: 10, padding: '10px 16px', marginBottom: 20,
          color: 'var(--error)', fontSize: 13,
        }}>
          <AlertTriangle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {statCards.map(stat => (
          <div key={stat.label} className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--t3)', fontSize: 12, marginBottom: 8 }}>
              {stat.icon}
              <span className="kicker">{stat.label}</span>
            </div>
            <div className="stat-glow" style={{ fontSize: 28, fontWeight: 700, color: 'var(--t)' }}>
              {loading ? '\u2014' : stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Action row */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={15} />
          Schedule Session
        </button>
      </div>

      {/* Inline schedule form */}
      {showForm && (
        <div className="card glass" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--t)' }}>New Session</span>
            <button
              className="btn btn-ghost"
              onClick={() => setShowForm(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <X size={14} /> Cancel
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--t3)', display: 'block', marginBottom: 5 }}>Session Name</label>
              <input
                className="glass-input"
                style={{ width: '100%' }}
                placeholder="e.g. Morning Yoga"
                value={fName}
                onChange={e => setFName(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--t3)', display: 'block', marginBottom: 5 }}>Type</label>
              <div style={{ position: 'relative' }}>
                <select
                  className="glass-input"
                  style={{ width: '100%', appearance: 'none' }}
                  value={fType}
                  onChange={e => setFType(e.target.value)}
                >
                  {['Yoga', 'HIIT', 'Strength', 'Cardio', 'Spin', 'CrossFit'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--t3)' }}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--t3)', display: 'block', marginBottom: 5 }}>Trainer</label>
              {trainers.length > 0 ? (
                <div style={{ position: 'relative' }}>
                  <select
                    className="glass-input"
                    style={{ width: '100%', appearance: 'none' }}
                    value={fTrainer}
                    onChange={e => setFTrainer(e.target.value)}
                  >
                    {trainers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}{t.specialization ? ` — ${t.specialization}` : ''}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--t3)' }} />
                </div>
              ) : (
                <input
                  className="glass-input"
                  style={{ width: '100%' }}
                  placeholder="Trainer name (add trainers first)"
                  value={fTrainer}
                  onChange={e => setFTrainer(e.target.value)}
                />
              )}
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--t3)', display: 'block', marginBottom: 5 }}>Date</label>
              <input
                className="glass-input"
                style={{ width: '100%' }}
                type="date"
                value={fDate}
                onChange={e => setFDate(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--t3)', display: 'block', marginBottom: 5 }}>Time</label>
              <input
                className="glass-input"
                style={{ width: '100%' }}
                type="time"
                value={fTime}
                onChange={e => setFTime(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--t3)', display: 'block', marginBottom: 5 }}>Capacity</label>
              <input
                className="glass-input"
                style={{ width: '100%' }}
                type="number"
                placeholder="20"
                value={fCapacity}
                onChange={e => setFCapacity(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
            <button className="btn btn-primary" onClick={handleCreate}>Create Session</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass overflow-hidden" style={{ borderRadius: 12 }}>
        <table className="glass-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Session Name</th>
              <th>Trainer</th>
              <th>Type</th>
              <th>Time</th>
              <th>Capacity</th>
              <th>Enrolled</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              : sessions.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600, color: 'var(--t)' }}>{s.name}</td>
                    <td>{s.trainer}</td>
                    <td><TypeBadge type={s.type} /></td>
                    <td>{s.time}</td>
                    <td>{s.capacity}</td>
                    <td>{s.enrolled} / {s.capacity}</td>
                    <td><StatusBadge status={s.status} /></td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>
    </Shell>
  )
}
