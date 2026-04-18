'use client';

import { useMemo, useState, useEffect } from 'react';
import { TASKS, PHASES, getStats, type Task, type TaskStatus, type TaskPhase } from '@/lib/tasks';
import { PREVIEWS } from '@/lib/previews';
import { Icon } from '@/components/Icons';

type Filters = { search: string; phase: TaskPhase | 'all'; status: TaskStatus | 'all'; app: string };

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; IconCmp: any }> = {
  done: { label: 'Done', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', IconCmp: Icon.Check },
  in_progress: { label: 'In Progress', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', IconCmp: Icon.Clock },
  pending: { label: 'Pending', color: 'text-white/35', bg: 'bg-white/5 border-white/10', IconCmp: Icon.Circle },
  blocked: { label: 'Blocked', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30', IconCmp: Icon.Alert },
};

const AREA_ICONS: Record<string, any> = {
  backend: Icon.Server, mobile: Icon.Mobile, web: Icon.Desktop,
  devops: Icon.Shield, design: Icon.Brand, qa: Icon.TestTube,
};

export default function TasklistDashboard() {
  const [filters, setFilters] = useState<Filters>({ search: '', phase: 'all', status: 'all', app: 'all' });
  const [, setTick] = useState(0);

  // Gentle auto-refresh every 30s so percentages stay fresh as tasks.ts is edited
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => TASKS.filter((t) => {
    if (filters.phase !== 'all' && t.phase !== filters.phase) return false;
    if (filters.status !== 'all' && t.status !== filters.status) return false;
    if (filters.app !== 'all' && t.app !== filters.app) return false;
    if (filters.search && !`${t.id} ${t.title} ${t.epic}`.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  }), [filters]);

  const globalStats = getStats();
  const filteredStats = getStats(filtered);
  const phaseStats = useMemo(() => (Object.keys(PHASES) as TaskPhase[]).map((p) => ({ phase: p, ...getStats(TASKS.filter((t) => t.phase === p)) })), []);
  const appStats = useMemo(() => (['mobile', 'admin', 'gym', 'corporate', 'backend'] as const).map((a) => ({ app: a, ...getStats(TASKS.filter((t) => t.app === a)) })), []);

  return (
    <div className="min-h-screen px-6 md:px-10 py-8 max-w-[1500px] mx-auto">
      <Header stats={globalStats} />
      <PreviewBar />
      <PhaseGrid phaseStats={phaseStats} />
      <AppGrid appStats={appStats} />
      <FiltersBar filters={filters} setFilters={setFilters} resultCount={filtered.length} stats={filteredStats} />
      <TaskTable tasks={filtered} />
      <Footer />
    </div>
  );
}

function Header({ stats }: { stats: ReturnType<typeof getStats> }) {
  return (
    <header className="mb-8">
      <div className="flex items-start justify-between gap-6 flex-wrap mb-6">
        <div>
          <div className="text-[10px] font-semibold tracking-[4px] uppercase text-white/20 mb-2">
            Qwegle Technologies · Design System v1.0
          </div>
          <h1 className="serif text-5xl md:text-6xl font-black tracking-[-3px] leading-none">
            Book<em className="italic font-normal text-white/40">My</em>Fit
          </h1>
          <div className="text-sm text-white/55 mt-3 max-w-lg">
            Live development tracker across all five applications. Updates as code is shipped.
          </div>
        </div>
        <div className="text-right">
          <div className="text-5xl font-bold tracking-tight" style={{ color: '#3DFF54' }}>{stats.progressPct}%</div>
          <div className="text-[10px] tracking-[2px] uppercase text-white/30 mt-1">Overall</div>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="text-white/55">{stats.done} of {stats.total} tasks completed</span>
          <span className="text-white/55">{stats.doneHours}h / {stats.totalHours}h estimated</span>
        </div>
        <div className="h-2 bg-black/60 rounded-full overflow-hidden">
          <div className="h-full transition-all duration-700" style={{ width: `${stats.progressPct}%`, background: 'linear-gradient(90deg, #3DFF54 0%, #20d239 100%)' }} />
        </div>
        <div className="grid grid-cols-4 gap-3 mt-5">
          <StatPill label="Done" value={stats.done} color="#3DFF54" />
          <StatPill label="In Progress" value={stats.inProgress} color="#fbbf24" />
          <StatPill label="Pending" value={stats.pending} color="rgba(255,255,255,.4)" />
          <StatPill label="Blocked" value={stats.blocked} color="#fb7185" />
        </div>
      </div>
    </header>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="surface rounded-xl p-4 text-center">
      <div className="text-3xl font-bold" style={{ color, fontFamily: 'DM Sans' }}>{value}</div>
      <div className="text-[10px] tracking-[1.5px] uppercase text-white/35 mt-1">{label}</div>
    </div>
  );
}

function PreviewBar() {
  return (
    <section className="mb-8">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="serif text-2xl font-bold tracking-tight">Live Previews</h2>
        <span className="text-[10px] tracking-[2px] uppercase text-white/30">Click to open in new tab</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {PREVIEWS.map((p) => (
          <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer"
            className="glass glass-hover rounded-xl p-4 transition group">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs accent-pill rounded-full px-2 py-0.5 font-semibold tracking-wide">:{p.port}</div>
              <Icon.External className="w-4 h-4 text-white/30 group-hover:text-white transition" />
            </div>
            <div className="serif text-lg font-bold leading-tight">{p.label}</div>
            <div className="text-xs text-white/50 mt-1">{p.description}</div>
            <div className="text-[10px] text-white/25 mt-2 tracking-wide uppercase">{p.tech}</div>
          </a>
        ))}
      </div>
    </section>
  );
}

function PhaseGrid({ phaseStats }: { phaseStats: Array<{ phase: TaskPhase } & ReturnType<typeof getStats>> }) {
  return (
    <section className="mb-8">
      <h2 className="serif text-2xl font-bold tracking-tight mb-4">Phase Progress</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {phaseStats.map((ps) => {
          const meta = PHASES[ps.phase];
          return (
            <div key={ps.phase} className="surface rounded-xl p-4 glass-hover transition">
              <div className="text-[10px] font-semibold tracking-[1.5px] uppercase text-white/35 mb-2 truncate">{meta.name}</div>
              <div className="text-3xl font-bold mb-1" style={{ color: '#3DFF54', fontFamily: 'DM Sans' }}>{ps.progressPct}%</div>
              <div className="text-xs text-white/45 mb-3">{ps.done}/{ps.total} · {meta.weeks}</div>
              <div className="h-1.5 bg-black/60 rounded-full overflow-hidden">
                <div className="h-full transition-all duration-700" style={{ width: `${ps.progressPct}%`, background: '#3DFF54' }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AppGrid({ appStats }: { appStats: Array<{ app: string } & ReturnType<typeof getStats>> }) {
  const appMeta: Record<string, { name: string; Icn: any }> = {
    mobile: { name: 'Mobile App', Icn: Icon.Mobile },
    admin: { name: 'Admin Panel', Icn: Icon.Desktop },
    gym: { name: 'Gym Partner', Icn: Icon.Desktop },
    corporate: { name: 'Corporate HR', Icn: Icon.Desktop },
    backend: { name: 'Backend API', Icn: Icon.Server },
  };
  return (
    <section className="mb-8">
      <h2 className="serif text-2xl font-bold tracking-tight mb-4">Per-Application</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {appStats.map((as) => {
          const meta = appMeta[as.app];
          const { Icn } = meta;
          return (
            <div key={as.app} className="surface rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Icn className="w-4 h-4 text-white/55" />
                <span className="text-xs text-white/35">{as.done}/{as.total}</span>
              </div>
              <div className="text-sm font-medium text-white/80 mb-2 truncate">{meta.name}</div>
              <div className="text-2xl font-bold mb-2" style={{ fontFamily: 'DM Sans', color: '#3DFF54' }}>{as.progressPct}%</div>
              <div className="h-1.5 bg-black/60 rounded-full overflow-hidden">
                <div className="h-full transition-all duration-700" style={{ width: `${as.progressPct}%`, background: '#3DFF54' }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FiltersBar({ filters, setFilters, resultCount, stats }: {
  filters: Filters; setFilters: (f: Filters) => void; resultCount: number; stats: ReturnType<typeof getStats>;
}) {
  return (
    <section className="glass rounded-2xl p-4 mb-5 sticky top-3 z-10">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-white/55">
          <Icon.Filter className="w-4 h-4" />
          <span className="text-xs font-medium tracking-wide">Filter</span>
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Icon.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input value={filters.search} onChange={(e: any) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search tasks…"
            className="w-full pl-9 pr-3 py-2 bg-black/30 border border-white/5 rounded-lg text-sm outline-none focus:border-emerald-500/50 text-white placeholder-white/30" />
        </div>
        <select value={filters.phase} onChange={(e: any) => setFilters({ ...filters, phase: e.target.value })}
          className="px-3 py-2 bg-black/30 border border-white/5 rounded-lg text-sm outline-none focus:border-emerald-500/50 text-white">
          <option value="all">All Phases</option>
          {(Object.keys(PHASES) as TaskPhase[]).map((p) => <option key={p} value={p}>{PHASES[p].name}</option>)}
        </select>
        <select value={filters.status} onChange={(e: any) => setFilters({ ...filters, status: e.target.value })}
          className="px-3 py-2 bg-black/30 border border-white/5 rounded-lg text-sm outline-none focus:border-emerald-500/50 text-white">
          <option value="all">All Statuses</option>
          <option value="done">Done</option><option value="in_progress">In Progress</option>
          <option value="pending">Pending</option><option value="blocked">Blocked</option>
        </select>
        <select value={filters.app} onChange={(e: any) => setFilters({ ...filters, app: e.target.value })}
          className="px-3 py-2 bg-black/30 border border-white/5 rounded-lg text-sm outline-none focus:border-emerald-500/50 text-white">
          <option value="all">All Apps</option>
          <option value="mobile">Mobile</option><option value="admin">Admin</option>
          <option value="gym">Gym</option><option value="corporate">Corporate</option>
          <option value="backend">Backend</option><option value="shared">Shared</option>
        </select>
        <div className="text-sm text-white/55 ml-auto">
          <span className="text-emerald-400 font-semibold">{resultCount}</span> tasks · {stats.done} done, {stats.inProgress} in progress
        </div>
      </div>
    </section>
  );
}

function TaskTable({ tasks }: { tasks: Task[] }) {
  const grouped = useMemo(() => {
    const g: Record<string, Task[]> = {};
    tasks.forEach((t) => { const key = `${PHASES[t.phase].name} — ${t.epic}`; (g[key] ||= []).push(t); });
    return g;
  }, [tasks]);
  if (tasks.length === 0) return <div className="glass rounded-2xl p-12 text-center text-white/55">No tasks match your filters.</div>;
  return (
    <section className="space-y-5">
      {Object.entries(grouped).map(([group, groupTasks]) => (
        <div key={group} className="glass rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/8 bg-white/5 flex items-center justify-between">
            <div className="font-semibold text-sm text-white/85">{group}</div>
            <div className="text-xs text-white/45">{groupTasks.filter((t) => t.status === 'done').length} / {groupTasks.length} done</div>
          </div>
          <div className="divide-y divide-white/5">
            {groupTasks.map((t) => <TaskRow key={t.id} task={t} />)}
          </div>
        </div>
      ))}
    </section>
  );
}

function TaskRow({ task }: { task: Task }) {
  const cfg = STATUS_CONFIG[task.status];
  const AreaIcon = AREA_ICONS[task.area] || Icon.Circle;
  const { IconCmp: StatusIcon } = cfg;
  return (
    <div className="px-5 py-3 flex items-center gap-4 hover:bg-white/3 transition">
      <StatusIcon className={`w-5 h-5 flex-shrink-0 ${cfg.color}`} />
      <span className="font-mono text-[11px] text-white/35 w-20 flex-shrink-0">{task.id}</span>
      <AreaIcon className="w-4 h-4 text-white/30 flex-shrink-0" />
      <span className="flex-1 text-sm text-white/85">{task.title}</span>
      {task.app && <span className="text-[10px] px-2 py-0.5 rounded-md bg-black/30 text-white/45 border border-white/8 tracking-wide uppercase">{task.app}</span>}
      <span className={`text-[10px] px-2 py-0.5 rounded-md border ${cfg.bg} ${cfg.color} font-semibold tracking-wide uppercase`}>{cfg.label}</span>
      <span className="text-xs text-white/35 w-12 text-right flex-shrink-0" style={{ fontFamily: 'DM Sans' }}>{task.estimateHours}h</span>
      <span className={`text-[10px] font-semibold w-16 text-right flex-shrink-0 tracking-wide uppercase ${
        task.priority === 'high' ? 'text-rose-400' : task.priority === 'medium' ? 'text-amber-400' : 'text-white/30'
      }`}>{task.priority}</span>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-12 pt-6 border-t border-white/8 text-xs text-white/35 flex items-center justify-between flex-wrap gap-4">
      <div>BookMyFit Dev Tracker · Auto-refreshes every 30s · Source: <code className="text-emerald-400">lib/tasks.ts</code></div>
      <div className="text-[10px] tracking-[2px] uppercase">Qwegle Technologies</div>
    </footer>
  );
}
