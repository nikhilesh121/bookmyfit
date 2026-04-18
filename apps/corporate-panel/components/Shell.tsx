'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, UserPlus, BarChart3, FileText, Settings, LogOut, Building2 } from 'lucide-react';
import { logout } from '../lib/api';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/employees', label: 'Employees', icon: Users },
  { href: '/assign', label: 'Assign Plans', icon: UserPlus },
  { href: '/usage', label: 'Usage Reports', icon: BarChart3 },
  { href: '/billing', label: 'Billing & Invoices', icon: FileText },
  { href: '/analytics', label: 'Department Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
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
          <div className="kicker mt-1" style={{ color: 'var(--accent)', opacity: 0.7 }}>Corporate HR</div>
        </div>
        <nav className="flex-1 py-3">
          {NAV.map((item) => {
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
                <Icon size={15} strokeWidth={1.8} /><span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button onClick={logout} className="flex items-center gap-2 text-[12px] w-full px-3 py-2" style={{ color: 'rgba(255,100,100,0.8)' }}>
            <LogOut size={14}/> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col">
        <header className="h-16 border-b px-8 flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(16px)' }}>
          <h1 className="serif" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>{title}</h1>
          <div className="accent-pill">HR Admin</div>
        </header>
        <div className="flex-1 p-8">{children}</div>
      </main>
    </div>
  );
}
