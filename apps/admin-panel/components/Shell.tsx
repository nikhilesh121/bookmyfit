'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard, BarChart3, Building2, Users, CreditCard, Briefcase, UserCheck, Calendar,
  DollarSign, Percent, Home as HomeIcon, Package, Tags, Bell, Settings, ShieldAlert, LogOut,
  ShieldCheck, Star, Award, ClipboardCheck, ListChecks, Sparkles, Activity, Smartphone, Menu, X,
} from 'lucide-react';

const NAV = [
  { group: 'Overview', items: [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  ]},
  { group: 'Management', items: [
    { href: '/gyms', label: 'Gym Management', icon: Building2 },
    { href: '/kyc', label: 'KYC Review', icon: ShieldCheck },
    { href: '/tiers', label: 'Tier Management', icon: Award },
    { href: '/users', label: 'Users', icon: Users },
    { href: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
    { href: '/plans', label: 'Plan Management', icon: ListChecks },
    { href: '/wellness', label: 'Wellness Services', icon: Sparkles },
    { href: '/corporate', label: 'Corporate', icon: Briefcase },
    { href: '/corporate/employees', label: 'Corporate Employees', icon: UserCheck },
    { href: '/bookings', label: 'Bookings', icon: Calendar },
    { href: '/checkins', label: 'Check-in Records', icon: Activity },
    { href: '/attendance', label: 'Attendance', icon: ClipboardCheck },
  ]},
  { group: 'Revenue', items: [
    { href: '/settlements', label: 'Settlements', icon: DollarSign },
    { href: '/commission', label: 'Commission Overview', icon: Percent },
  ]},
  { group: 'Content', items: [
    { href: '/homepage', label: 'Homepage Builder', icon: HomeIcon },
    { href: '/app-launch', label: 'App Launch', icon: Smartphone },
    { href: '/store', label: 'Store Products', icon: Package },
    { href: '/categories', label: 'Categories & Amenities', icon: Tags },
  ]},
  { group: 'Platform', items: [
    { href: '/ratings', label: 'Ratings', icon: Star },
  ]},
  { group: 'System', items: [
    { href: '/notifications', label: 'Push Notifications', icon: Bell },
    { href: '/fraud', label: 'Fraud Monitoring', icon: ShieldAlert },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]},
];

const RAW_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';
const API = RAW_API.replace(/\/api\/v1\/?$/i, '').replace(/\/$/, '');

type Branding = { logoUrl?: string; logoText?: string; shortText?: string };

export default function Shell({ children, title }: { children: React.ReactNode; title: string }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement | null>(null);
  const [branding, setBranding] = useState<Branding>({ logoText: 'BookMyFit.in', shortText: 'BookMyFit' });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/v1/branding`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data) setBranding(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const key = 'bmf_admin_sidebar_scroll';
    const saved = sessionStorage.getItem(key);
    if (saved) nav.scrollTop = Number(saved) || 0;
    const saveScroll = () => sessionStorage.setItem(key, String(nav.scrollTop));
    nav.addEventListener('scroll', saveScroll, { passive: true });
    return () => nav.removeEventListener('scroll', saveScroll);
  }, []);

  const logoUrl = String(branding.logoUrl || '').trim();
  const logoText = String(branding.logoText || branding.shortText || 'BookMyFit.in');
  return (
    <div className="flex min-h-screen text-white">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed z-50 inset-y-0 left-0 h-screen w-72 border-r flex flex-col min-h-0 transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{
          borderColor: 'rgba(255,255,255,0.06)',
          background: 'linear-gradient(180deg, rgba(14,14,14,0.98), rgba(5,5,5,0.98))',
          boxShadow: '18px 0 40px rgba(0,0,0,0.28)',
        }}
      >
        <div className="p-5 border-b flex items-center justify-between gap-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="min-w-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={logoText}
                style={{
                  width: 205,
                  maxWidth: '100%',
                  maxHeight: 58,
                  objectFit: 'contain',
                  objectPosition: 'left center',
                  display: 'block',
                }}
              />
            ) : (
              <div className="serif flex items-center gap-2 truncate" style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.7px' }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--accent)', boxShadow: '0 0 18px rgba(61,255,84,0.75)', flexShrink: 0 }} />
                <span className="truncate">{logoText}</span>
              </div>
            )}
            <div className="kicker mt-1" style={{ color: 'var(--accent)', opacity: 0.78 }}>Admin Console</div>
          </div>
          <button className="lg:hidden p-2 rounded-lg transition hover:bg-white/10" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
            <X size={16} />
          </button>
        </div>
        <nav ref={navRef} className="flex-1 min-h-0 overflow-y-auto py-3">
          {NAV.map((group) => (
            <div key={group.group} className="mb-5">
              <div className="px-5 mb-2 kicker" style={{ color: 'rgba(255,255,255,0.34)' }}>{group.group}</div>
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== '/' && pathname?.startsWith(`${item.href}/`));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-3 px-5 py-2.5 text-[13px] transition hover:bg-white/5"
                    style={{
                      color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                      background: active ? 'linear-gradient(90deg, rgba(61,255,84,0.12), rgba(61,255,84,0.02))' : 'transparent',
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
            onClick={() => { localStorage.removeItem('bmf_admin_token'); localStorage.removeItem('bmf_admin_user'); window.location.href = '/login'; }}
            className="flex items-center gap-2 text-[12px] w-full px-3 py-2 rounded-lg transition hover:bg-red-500/10"
            style={{ color: 'rgba(255,100,100,0.8)' }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 w-full lg:pl-72">
        <header className="h-16 border-b px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.86)', backdropFilter: 'blur(16px)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <button className="lg:hidden p-2 rounded-lg transition hover:bg-white/10" style={{ background: 'rgba(255,255,255,0.06)' }} onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
              <Menu size={17} />
            </button>
            <h1 className="serif truncate" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>{title}</h1>
          </div>
          <div className="accent-pill">Super Admin</div>
        </header>
        <div className="flex-1 p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
