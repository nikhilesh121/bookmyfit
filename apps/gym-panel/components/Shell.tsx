'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, QrCode, Calendar, Users, Building2, CreditCard, UserSquare2, Sparkles, DollarSign, FileBarChart, Settings, LogOut, ShieldCheck } from 'lucide-react';

const NAV = [
  { group: 'Main', items: [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/scanner', label: 'Check-in Scanner', icon: QrCode },
    { href: '/sessions', label: 'Sessions', icon: Calendar },
    { href: '/members', label: 'Members', icon: Users },
  ]},
  { group: 'Gym Setup', items: [
    { href: '/profile', label: 'Profile', icon: Building2 },
    { href: '/plans', label: 'Plans', icon: CreditCard },
    { href: '/trainers', label: 'Trainers', icon: UserSquare2 },
    { href: '/amenities', label: 'Amenities', icon: Sparkles },
    { href: '/kyc', label: 'KYC', icon: ShieldCheck },
  ]},
  { group: 'Finance', items: [
    { href: '/settlement', label: 'Settlement', icon: DollarSign },
    { href: '/reports', label: 'Reports', icon: FileBarChart },
  ]},
  { group: 'System', items: [
    { href: '/settings', label: 'Settings', icon: Settings },
  ]},
];

export default function Shell({ children, title }: { children: React.ReactNode; title: string }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen text-white">
      <aside className="w-64 border-r flex flex-col" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
        <div className="p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="serif" style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-1px' }}>
            Book<em style={{ fontStyle: 'italic', fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>My</em>Fit
          </div>
          <div className="kicker mt-1" style={{ color: 'var(--accent)', opacity: 0.7 }}>Gym Partner</div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {NAV.map((g) => (
            <div key={g.group} className="mb-5">
              <div className="px-5 mb-2 kicker" style={{ color: 'rgba(255,255,255,0.3)' }}>{g.group}</div>
              {g.items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}
                    className="flex items-center gap-3 px-5 py-2.5 text-[13px] transition"
                    style={{
                      color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                      background: active ? 'rgba(61,255,84,0.08)' : 'transparent',
                      borderLeft: active ? '2px solid #3DFF54' : '2px solid transparent',
                      fontWeight: active ? 600 : 400,
                    }}>
                    <Icon size={15} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => { localStorage.removeItem('bmf_gym_token'); localStorage.removeItem('bmf_gym_user'); window.location.href = '/login'; }}
            className="flex items-center gap-2 text-[12px] w-full px-3 py-2 rounded-lg transition hover:bg-red-500/10"
            style={{ color: 'rgba(255,100,100,0.8)' }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col">
        <header className="h-16 border-b px-8 flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(16px)' }}>
          <h1 className="serif" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>{title}</h1>
          <div className="accent-pill">Live</div>
        </header>
        <div className="flex-1 p-8">{children}</div>
      </main>
    </div>
  );
}
