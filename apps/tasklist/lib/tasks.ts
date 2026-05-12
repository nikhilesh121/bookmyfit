export type TaskStatus = 'done' | 'in_progress' | 'pending' | 'blocked';
export type TaskArea = 'backend' | 'mobile' | 'web' | 'devops' | 'design' | 'qa';
export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskPhase = 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'phase5' | 'scaffold';

export interface Task {
  id: string;
  title: string;
  description?: string;
  phase: TaskPhase;
  epic: string;
  area: TaskArea;
  priority: TaskPriority;
  estimateHours: number;
  status: TaskStatus;
  app?: 'mobile' | 'admin' | 'gym' | 'corporate' | 'wellness' | 'backend' | 'shared';
}

export const PHASES: Record<TaskPhase, { name: string; weeks: string; color: string }> = {
  scaffold: { name: 'Phase 0 — Scaffolding', weeks: 'Week 0', color: 'bg-slate-500' },
  phase1: { name: 'Phase 1 — MVP Foundation', weeks: 'Weeks 1-10', color: 'bg-brand-600' },
  phase2: { name: 'Phase 2 — Multi-Gym Platform', weeks: 'Weeks 11-18', color: 'bg-blue-600' },
  phase3: { name: 'Phase 3 — Full Marketplace', weeks: 'Weeks 19-26', color: 'bg-purple-600' },
  phase4: { name: 'Phase 4 — Growth & Scale', weeks: 'Weeks 27-32', color: 'bg-amber-600' },
  phase5: { name: 'Phase 5 — Mobile Overhaul & Production', weeks: 'Weeks 33-36', color: 'bg-rose-600' },
};

export const TASKS: Task[] = [
  // ============ PHASE 0 — SCAFFOLDING (Already Done by Cascade) ============
  { id: 'S-01', title: 'Setup monorepo structure (pnpm workspaces)', phase: 'scaffold', epic: 'Infrastructure', area: 'devops', priority: 'high', estimateHours: 2, status: 'done' },
  { id: 'S-02', title: 'Configure Docker Compose for PostgreSQL + Redis', phase: 'scaffold', epic: 'Infrastructure', area: 'devops', priority: 'high', estimateHours: 1, status: 'done' },
  { id: 'S-03', title: 'Initialize NestJS backend', phase: 'scaffold', epic: 'Backend Setup', area: 'backend', priority: 'high', estimateHours: 2, status: 'done', app: 'backend' },
  { id: 'S-04', title: 'Initialize Admin Panel (Next.js)', phase: 'scaffold', epic: 'Frontend Setup', area: 'web', priority: 'high', estimateHours: 2, status: 'done', app: 'admin' },
  { id: 'S-05', title: 'Initialize Gym Panel (Next.js)', phase: 'scaffold', epic: 'Frontend Setup', area: 'web', priority: 'high', estimateHours: 2, status: 'done', app: 'gym' },
  { id: 'S-06', title: 'Initialize Corporate Panel (Next.js)', phase: 'scaffold', epic: 'Frontend Setup', area: 'web', priority: 'high', estimateHours: 2, status: 'done', app: 'corporate' },
  { id: 'S-07', title: 'Initialize Mobile App (Expo)', phase: 'scaffold', epic: 'Frontend Setup', area: 'mobile', priority: 'high', estimateHours: 2, status: 'done', app: 'mobile' },
  { id: 'S-08', title: 'Build Tasklist Tracker dashboard', phase: 'scaffold', epic: 'Project Management', area: 'web', priority: 'high', estimateHours: 4, status: 'done' },
  { id: 'S-09', title: 'Shared TypeScript types package', phase: 'scaffold', epic: 'Shared Packages', area: 'devops', priority: 'medium', estimateHours: 2, status: 'done', app: 'shared' },
  { id: 'S-10', title: 'Shared UI component library', phase: 'scaffold', epic: 'Shared Packages', area: 'web', priority: 'medium', estimateHours: 3, status: 'done', app: 'shared' },

  // ============ PHASE 1 — MVP FOUNDATION (Weeks 1-10) ============
  // Epic 1.1: Auth & User Management
  { id: 'T-1.1.01', title: 'Phone OTP send API (Twilio)', phase: 'phase1', epic: 'Auth & Users', area: 'backend', priority: 'high', estimateHours: 4, status: 'done', app: 'backend' },
  { id: 'T-1.1.02', title: 'Phone OTP verify + JWT issuance', phase: 'phase1', epic: 'Auth & Users', area: 'backend', priority: 'high', estimateHours: 4, status: 'done', app: 'backend' },
  { id: 'T-1.1.03', title: 'Refresh token rotation', phase: 'phase1', epic: 'Auth & Users', area: 'backend', priority: 'high', estimateHours: 3, status: 'done', app: 'backend' },
  { id: 'T-1.1.04', title: 'Device binding at registration', phase: 'phase1', epic: 'Auth & Users', area: 'backend', priority: 'high', estimateHours: 3, status: 'done', app: 'backend' },
  { id: 'T-1.1.05', title: 'User profile CRUD APIs', phase: 'phase1', epic: 'Auth & Users', area: 'backend', priority: 'high', estimateHours: 4, status: 'done', app: 'backend' },
  { id: 'T-1.1.06', title: 'Mobile: Splash + Onboarding (brand applied)', phase: 'phase1', epic: 'Auth & Users', area: 'mobile', priority: 'high', estimateHours: 6, status: 'done', app: 'mobile' },
  { id: 'T-1.1.07', title: 'Mobile: Login + OTP screens (brand applied + API)', phase: 'phase1', epic: 'Auth & Users', area: 'mobile', priority: 'high', estimateHours: 6, status: 'done', app: 'mobile' },
  { id: 'T-1.1.08', title: 'Mobile: Profile screen (API wired)', phase: 'phase1', epic: 'Auth & Users', area: 'mobile', priority: 'medium', estimateHours: 5, status: 'done', app: 'mobile' },
  { id: 'T-1.1.09', title: 'Admin login page', phase: 'phase1', epic: 'Auth & Users', area: 'web', priority: 'high', estimateHours: 3, status: 'done', app: 'admin' },
  { id: 'T-1.1.10', title: 'Gym Partner login page', phase: 'phase1', epic: 'Auth & Users', area: 'web', priority: 'high', estimateHours: 3, status: 'done', app: 'gym' },
  { id: 'T-1.1.11', title: 'Corporate login page', phase: 'phase1', epic: 'Auth & Users', area: 'web', priority: 'high', estimateHours: 3, status: 'done', app: 'corporate' },
  { id: 'T-1.1.12', title: 'Mobile: API client (lib/api.ts) with SecureStore auth', phase: 'phase1', epic: 'Auth & Users', area: 'mobile', priority: 'high', estimateHours: 3, status: 'done', app: 'mobile' },

  // Epic 1.2: Gym Management
  { id: 'T-1.2.01', title: 'Gym CRUD APIs (create, read, update, delete)', phase: 'phase1', epic: 'Gym Management', area: 'backend', priority: 'high', estimateHours: 6, status: 'done', app: 'backend' },
  { id: 'T-1.2.02', title: 'Gym KYC upload + S3 integration', phase: 'phase1', epic: 'Gym Management', area: 'backend', priority: 'high', estimateHours: 4, status: 'done', app: 'backend' },
  { id: 'T-1.2.03', title: 'Gym approval/rejection workflow', phase: 'phase1', epic: 'Gym Management', area: 'backend', priority: 'high', estimateHours: 3, status: 'done', app: 'backend' },
  { id: 'T-1.2.04', title: 'Gym tier assignment logic', phase: 'phase1', epic: 'Gym Management', area: 'backend', priority: 'high', estimateHours: 4, status: 'done', app: 'backend' },
  { id: 'T-1.2.05', title: 'Admin: Gym listing + detail pages (API wired)', phase: 'phase1', epic: 'Gym Management', area: 'web', priority: 'high', estimateHours: 10, status: 'done', app: 'admin' },
  { id: 'T-1.2.06', title: 'Admin: KYC review page', phase: 'phase1', epic: 'Gym Management', area: 'web', priority: 'high', estimateHours: 6, status: 'done', app: 'admin' },
  { id: 'T-1.2.07', title: 'Mobile: Gym discovery (home + featured + API)', phase: 'phase1', epic: 'Gym Management', area: 'mobile', priority: 'high', estimateHours: 8, status: 'done', app: 'mobile' },
  { id: 'T-1.2.08', title: 'Mobile: Gym detail screen (API wired)', phase: 'phase1', epic: 'Gym Management', area: 'mobile', priority: 'high', estimateHours: 8, status: 'done', app: 'mobile' },
  { id: 'T-1.2.09', title: 'Gym Panel: Profile management (brand shell)', phase: 'phase1', epic: 'Gym Management', area: 'web', priority: 'high', estimateHours: 8, status: 'done', app: 'gym' },
  { id: 'T-1.2.10', title: 'Location-based search (PostGIS)', phase: 'phase1', epic: 'Gym Management', area: 'backend', priority: 'high', estimateHours: 6, status: 'blocked', app: 'backend' },

  // Epic 1.3: Subscription Engine
  { id: 'T-1.3.01', title: 'Subscription plans schema + seeds', phase: 'phase1', epic: 'Subscriptions', area: 'backend', priority: 'high', estimateHours: 3, status: 'done', app: 'backend' },
  { id: 'T-1.3.02', title: 'Subscription purchase API', phase: 'phase1', epic: 'Subscriptions', area: 'backend', priority: 'high', estimateHours: 6, status: 'done', app: 'backend' },
  { id: 'T-1.3.03', title: 'Cashfree order creation + webhook', phase: 'phase1', epic: 'Subscriptions', area: 'backend', priority: 'high', estimateHours: 8, status: 'done', app: 'backend' },
  { id: 'T-1.3.04', title: 'Subscription activation on payment success', phase: 'phase1', epic: 'Subscriptions', area: 'backend', priority: 'high', estimateHours: 4, status: 'done', app: 'backend' },
  { id: 'T-1.3.05', title: 'Mobile: Plan selection screen (API wired)', phase: 'phase1', epic: 'Subscriptions', area: 'mobile', priority: 'high', estimateHours: 6, status: 'done', app: 'mobile' },
  { id: 'T-1.3.06', title: 'Mobile: Duration selection screen', phase: 'phase1', epic: 'Subscriptions', area: 'mobile', priority: 'high', estimateHours: 4, status: 'done', app: 'mobile' },
  { id: 'T-1.3.07', title: 'Mobile: Order summary + Cashfree payment', phase: 'phase1', epic: 'Subscriptions', area: 'mobile', priority: 'high', estimateHours: 8, status: 'done', app: 'mobile' },
  { id: 'T-1.3.08', title: 'Mobile: My Subscriptions screen (API wired)', phase: 'phase1', epic: 'Subscriptions', area: 'mobile', priority: 'high', estimateHours: 5, status: 'done', app: 'mobile' },
  { id: 'T-1.3.09', title: 'Mobile: Payment success screen', phase: 'phase1', epic: 'Subscriptions', area: 'mobile', priority: 'high', estimateHours: 3, status: 'done', app: 'mobile' },

  // Epic 1.4: QR Check-in System
  { id: 'T-1.4.01', title: 'Dynamic QR generation API (JWT + HMAC)', phase: 'phase1', epic: 'QR Check-in', area: 'backend', priority: 'high', estimateHours: 6, status: 'done', app: 'backend' },
  { id: 'T-1.4.02', title: 'QR validation API + Redis daily lock', phase: 'phase1', epic: 'QR Check-in', area: 'backend', priority: 'high', estimateHours: 8, status: 'done', app: 'backend' },
  { id: 'T-1.4.03', title: 'Duplicate scan detection (idempotency)', phase: 'phase1', epic: 'QR Check-in', area: 'backend', priority: 'high', estimateHours: 3, status: 'done', app: 'backend' },
  { id: 'T-1.4.04', title: 'Check-in audit log', phase: 'phase1', epic: 'QR Check-in', area: 'backend', priority: 'high', estimateHours: 3, status: 'done', app: 'backend' },
  { id: 'T-1.4.05', title: 'Mobile: QR code generator screen', phase: 'phase1', epic: 'QR Check-in', area: 'mobile', priority: 'high', estimateHours: 6, status: 'done', app: 'mobile' },
  { id: 'T-1.4.06', title: 'Mobile: Check-in result screen', phase: 'phase1', epic: 'QR Check-in', area: 'mobile', priority: 'high', estimateHours: 4, status: 'done', app: 'mobile' },
  { id: 'T-1.4.07', title: 'Gym Panel: QR scanner (functional web camera)', phase: 'phase1', epic: 'QR Check-in', area: 'web', priority: 'high', estimateHours: 8, status: 'done', app: 'gym' },
  { id: 'T-1.4.08', title: 'Mobile: Visit history screen (API wired)', phase: 'phase1', epic: 'QR Check-in', area: 'mobile', priority: 'medium', estimateHours: 5, status: 'done', app: 'mobile' },
  { id: 'T-1.4.09', title: 'Screenshot blur on QR screen (iOS/Android)', phase: 'phase1', epic: 'QR Check-in', area: 'mobile', priority: 'high', estimateHours: 4, status: 'done', app: 'mobile' },

  // Epic 1.5: Admin Dashboard
  { id: 'T-1.5.01', title: 'Admin dashboard KPIs API', phase: 'phase1', epic: 'Admin Dashboard', area: 'backend', priority: 'high', estimateHours: 4, status: 'done', app: 'backend' },
  { id: 'T-1.5.02', title: 'Admin: Dashboard overview (real API — gyms, subs, analytics)', phase: 'phase1', epic: 'Admin Dashboard', area: 'web', priority: 'high', estimateHours: 8, status: 'done', app: 'admin' },
  { id: 'T-1.5.03', title: 'Admin: Users management (API wired)', phase: 'phase1', epic: 'Admin Dashboard', area: 'web', priority: 'high', estimateHours: 6, status: 'done', app: 'admin' },
  { id: 'T-1.5.04', title: 'Admin: Subscriptions management (API wired)', phase: 'phase1', epic: 'Admin Dashboard', area: 'web', priority: 'high', estimateHours: 6, status: 'done', app: 'admin' },
  { id: 'T-1.5.05', title: 'Admin: Bookings management page', phase: 'phase1', epic: 'Admin Dashboard', area: 'web', priority: 'high', estimateHours: 6, status: 'done', app: 'admin' },
  { id: 'T-1.5.06', title: 'Gym Panel: Dashboard (API wired)', phase: 'phase1', epic: 'Admin Dashboard', area: 'web', priority: 'high', estimateHours: 5, status: 'done', app: 'gym' },
  { id: 'T-1.5.07', title: 'Gym Panel: Members list (API wired)', phase: 'phase1', epic: 'Admin Dashboard', area: 'web', priority: 'high', estimateHours: 4, status: 'done', app: 'gym' },


  // Gym panel completed pages
  { id: 'T-1.6.01', title: 'Gym Panel: Sessions & Classes page', phase: 'phase1', epic: 'Gym Management', area: 'web', priority: 'high', estimateHours: 5, status: 'done', app: 'gym' },
  { id: 'T-1.6.02', title: 'Gym Panel: Settings page (general, notifications, security)', phase: 'phase1', epic: 'Gym Management', area: 'web', priority: 'medium', estimateHours: 5, status: 'done', app: 'gym' },
  { id: 'T-1.6.03', title: 'Gym Panel: Reports page with CSV export', phase: 'phase1', epic: 'Gym Management', area: 'web', priority: 'medium', estimateHours: 5, status: 'done', app: 'gym' },
  { id: 'T-1.6.04', title: 'Gym Panel: Plans & Pricing page (API wired)', phase: 'phase1', epic: 'Gym Management', area: 'web', priority: 'high', estimateHours: 4, status: 'done', app: 'gym' },
  { id: 'T-1.6.05', title: 'Gym Panel: Profile edit page (API wired)', phase: 'phase1', epic: 'Gym Management', area: 'web', priority: 'high', estimateHours: 5, status: 'done', app: 'gym' },

  // Mobile gym portal screens (Sprint: Gym partner mobile screens)
  { id: 'T-1.6.06', title: 'Mobile: Gym Portal — Dashboard screen (API wired)', phase: 'phase1', epic: 'Gym Management', area: 'mobile', priority: 'high', estimateHours: 5, status: 'done', app: 'mobile' },
  { id: 'T-1.6.07', title: 'Mobile: Gym Portal — QR Scanner/Validator screen', phase: 'phase1', epic: 'Gym Management', area: 'mobile', priority: 'high', estimateHours: 4, status: 'done', app: 'mobile' },
  { id: 'T-1.6.08', title: 'Mobile: Gym Portal — Members list screen (API wired)', phase: 'phase1', epic: 'Gym Management', area: 'mobile', priority: 'high', estimateHours: 4, status: 'done', app: 'mobile' },
  { id: 'T-1.6.09', title: 'Mobile: Gym Portal — KYC Tracker screen', phase: 'phase1', epic: 'Gym Management', area: 'mobile', priority: 'high', estimateHours: 3, status: 'done', app: 'mobile' },
  { id: 'T-1.6.10', title: 'Mobile: Gym Portal — Earnings screen (API wired)', phase: 'phase1', epic: 'Gym Management', area: 'mobile', priority: 'high', estimateHours: 4, status: 'done', app: 'mobile' },
  { id: 'T-1.6.11', title: 'Mobile: Role-based routing (gym staff vs member)', phase: 'phase1', epic: 'Gym Management', area: 'mobile', priority: 'high', estimateHours: 3, status: 'done', app: 'mobile' },

  // API path fixes
  { id: 'T-1.7.09', title: 'Mobile API path fixes (checkins, subscriptions, notifications, videos, ratings, coupons)', phase: 'phase1', epic: 'Admin Dashboard', area: 'mobile', priority: 'high', estimateHours: 2, status: 'done', app: 'mobile' },


  { id: 'T-1.7.01', title: 'Admin: Bookings management (API wired)', phase: 'phase1', epic: 'Admin Dashboard', area: 'web', priority: 'high', estimateHours: 6, status: 'done', app: 'admin' },
  { id: 'T-1.7.02', title: 'Admin: Fraud monitoring page', phase: 'phase1', epic: 'Admin Dashboard', area: 'web', priority: 'high', estimateHours: 6, status: 'done', app: 'admin' },
  { id: 'T-1.7.03', title: 'Admin: Notifications send panel', phase: 'phase1', epic: 'Admin Dashboard', area: 'web', priority: 'medium', estimateHours: 5, status: 'done', app: 'admin' },
  { id: 'T-1.7.04', title: 'Admin: Analytics dashboard (KPIs + chart + top tables)', phase: 'phase1', epic: 'Admin Dashboard', area: 'web', priority: 'high', estimateHours: 8, status: 'done', app: 'admin' },
  { id: 'T-1.7.05', title: 'Admin: Commission settings (inline editable)', phase: 'phase1', epic: 'Admin Dashboard', area: 'web', priority: 'high', estimateHours: 5, status: 'done', app: 'admin' },
  { id: 'T-1.7.06', title: 'Admin: Store management (products + orders tabs)', phase: 'phase1', epic: 'Admin Dashboard', area: 'web', priority: 'high', estimateHours: 6, status: 'done', app: 'admin' },
  { id: 'T-1.7.07', title: 'Admin: Corporate accounts page (API wired)', phase: 'phase1', epic: 'Admin Dashboard', area: 'web', priority: 'high', estimateHours: 5, status: 'done', app: 'admin' },
  { id: 'T-1.7.08', title: 'Emoji audit + icon standardisation (mobile + web panels)', phase: 'phase1', epic: 'Admin Dashboard', area: 'web', priority: 'high', estimateHours: 2, status: 'done' },

  // Production polish — this session
  { id: 'T-1.8.01', title: 'Admin: Categories management (API wired, add/delete/approve)', phase: 'phase1', epic: 'Admin Dashboard', area: 'web', priority: 'high', estimateHours: 4, status: 'done', app: 'admin' },
  { id: 'T-1.8.02', title: 'Admin: Settings page (commission, settlement config, feature flags)', phase: 'phase1', epic: 'Admin Dashboard', area: 'web', priority: 'high', estimateHours: 5, status: 'done', app: 'admin' },
  { id: 'T-1.8.03', title: 'Gym Panel: Amenities (real API toggle + request new)', phase: 'phase1', epic: 'Gym Management', area: 'web', priority: 'high', estimateHours: 4, status: 'done', app: 'gym' },
  { id: 'T-1.8.04', title: 'Gym Panel: Trainers (API CRUD — add, edit, deactivate)', phase: 'phase1', epic: 'Gym Management', area: 'web', priority: 'high', estimateHours: 5, status: 'done', app: 'gym' },
  { id: 'T-1.8.05', title: 'Corporate Panel: Login + token flow', phase: 'phase1', epic: 'Corporate', area: 'web', priority: 'high', estimateHours: 3, status: 'done', app: 'corporate' },
  { id: 'T-1.8.06', title: 'Corporate Panel: Dashboard (live KPIs, seats, check-ins)', phase: 'phase1', epic: 'Corporate', area: 'web', priority: 'high', estimateHours: 5, status: 'done', app: 'corporate' },
  { id: 'T-1.8.07', title: 'Corporate Panel: Employees (add, suspend, search, export CSV)', phase: 'phase1', epic: 'Corporate', area: 'web', priority: 'high', estimateHours: 6, status: 'done', app: 'corporate' },
  { id: 'T-1.8.08', title: 'Corporate Panel: Assign + bulk import (CSV parse + POST bulk)', phase: 'phase1', epic: 'Corporate', area: 'web', priority: 'high', estimateHours: 5, status: 'done', app: 'corporate' },
  { id: 'T-1.8.09', title: 'Corporate Panel: Billing (invoices, download PDF, top-up, pay)', phase: 'phase1', epic: 'Corporate', area: 'web', priority: 'medium', estimateHours: 5, status: 'done', app: 'corporate' },
  { id: 'T-1.8.10', title: 'Corporate Panel: Usage + Analytics (real check-ins, dept charts)', phase: 'phase1', epic: 'Corporate', area: 'web', priority: 'medium', estimateHours: 5, status: 'done', app: 'corporate' },
  { id: 'T-1.8.11', title: 'Corporate Panel: Settings (company profile, notifications, deactivate)', phase: 'phase1', epic: 'Corporate', area: 'web', priority: 'low', estimateHours: 3, status: 'done', app: 'corporate' },
  { id: 'T-1.8.12', title: 'Mobile: Edit Profile screen (API wired PUT /users/me)', phase: 'phase1', epic: 'Auth & Users', area: 'mobile', priority: 'high', estimateHours: 3, status: 'done', app: 'mobile' },
  { id: 'T-1.8.13', title: 'Mobile: QR uses real subscription ID (not hardcoded mock)', phase: 'phase1', epic: 'QR Check-in', area: 'mobile', priority: 'high', estimateHours: 2, status: 'done', app: 'mobile' },
  { id: 'T-1.8.14', title: 'Mobile: Notifications — mark-as-read tap (POST /notifications/:id/read)', phase: 'phase1', epic: 'Notifications', area: 'mobile', priority: 'medium', estimateHours: 2, status: 'done', app: 'mobile' },
  { id: 'T-1.8.15', title: 'Seed workout categories (Yoga, CrossFit, HIIT etc.) via API', phase: 'phase1', epic: 'Gym Management', area: 'backend', priority: 'medium', estimateHours: 1, status: 'done', app: 'backend' },
  { id: 'T-1.8.16', title: 'Admin dashboard real-time data (live gyms, subs, analytics)', phase: 'phase1', epic: 'Admin Dashboard', area: 'web', priority: 'high', estimateHours: 4, status: 'done', app: 'admin' },
  { id: 'T-1.8.17', title: 'Toast notification system added to all 3 web panels', phase: 'phase1', epic: 'Admin Dashboard', area: 'web', priority: 'high', estimateHours: 3, status: 'done' },


  { id: 'T-2.1.01', title: 'Pro/Max multi-gym subscription logic', phase: 'phase2', epic: 'Multi-Gym Plans', area: 'backend', priority: 'high', estimateHours: 6, status: 'done', app: 'backend' },
  { id: 'T-2.1.02', title: 'Visit tracking & limits enforcement', phase: 'phase2', epic: 'Multi-Gym Plans', area: 'backend', priority: 'high', estimateHours: 4, status: 'done', app: 'backend' },
  { id: 'T-2.1.03', title: 'Mobile: Pro/Max plan flows (gym picker for multi-gym plans)', phase: 'phase2', epic: 'Multi-Gym Plans', area: 'mobile', priority: 'high', estimateHours: 8, status: 'done', app: 'mobile' },
  { id: 'T-2.2.01', title: 'Elite pool revenue distribution engine', phase: 'phase2', epic: 'Settlement Engine', area: 'backend', priority: 'high', estimateHours: 10, status: 'done', app: 'backend' },
  { id: 'T-2.2.02', title: 'Pro pool weighted distribution', phase: 'phase2', epic: 'Settlement Engine', area: 'backend', priority: 'high', estimateHours: 8, status: 'done', app: 'backend' },
  { id: 'T-2.2.03', title: 'Settlement calculation cron job', phase: 'phase2', epic: 'Settlement Engine', area: 'backend', priority: 'high', estimateHours: 6, status: 'done', app: 'backend' },
  { id: 'T-2.2.04', title: 'Admin: Settlement dashboard (API wired)', phase: 'phase2', epic: 'Settlement Engine', area: 'web', priority: 'high', estimateHours: 10, status: 'done', app: 'admin' },
  { id: 'T-2.2.05', title: 'Admin: Commission engine config page', phase: 'phase2', epic: 'Settlement Engine', area: 'web', priority: 'high', estimateHours: 6, status: 'done', app: 'admin' },
  { id: 'T-2.2.06', title: 'Gym Panel: Earnings dashboard (API wired)', phase: 'phase2', epic: 'Settlement Engine', area: 'web', priority: 'high', estimateHours: 8, status: 'done', app: 'gym' },
  { id: 'T-2.3.01', title: 'Gym tier classification auto-logic (POST /gyms/:id/tier)', phase: 'phase2', epic: 'Tier System', area: 'backend', priority: 'high', estimateHours: 6, status: 'done', app: 'backend' },
  { id: 'T-2.3.02', title: 'Tier-based commission rates (commissionRate field on GymEntity)', phase: 'phase2', epic: 'Tier System', area: 'backend', priority: 'high', estimateHours: 3, status: 'done', app: 'backend' },
  { id: 'T-2.3.03', title: 'Admin: Tier management page', phase: 'phase2', epic: 'Tier System', area: 'web', priority: 'high', estimateHours: 5, status: 'done', app: 'admin' },
  { id: 'T-2.4.01', title: 'Rating submission + eligibility check', phase: 'phase2', epic: 'Rating & Reviews', area: 'backend', priority: 'high', estimateHours: 4, status: 'done', app: 'backend' },
  { id: 'T-2.4.02', title: 'Admin rating moderation', phase: 'phase2', epic: 'Rating & Reviews', area: 'backend', priority: 'high', estimateHours: 3, status: 'done', app: 'backend' },
  { id: 'T-2.4.03', title: 'Mobile: Rate & Review screen', phase: 'phase2', epic: 'Rating & Reviews', area: 'mobile', priority: 'high', estimateHours: 6, status: 'done', app: 'mobile' },
  { id: 'T-2.4.04', title: 'Admin: Ratings moderation page', phase: 'phase2', epic: 'Rating & Reviews', area: 'web', priority: 'medium', estimateHours: 6, status: 'done', app: 'admin' },
  { id: 'T-2.5.01', title: 'Suspicious activity velocity check (real FraudAlertEntity in DB)', phase: 'phase2', epic: 'Fraud Prevention', area: 'backend', priority: 'high', estimateHours: 6, status: 'done', app: 'backend' },
  { id: 'T-2.5.02', title: 'Device mismatch fraud alert (real detection on check-in)', phase: 'phase2', epic: 'Fraud Prevention', area: 'backend', priority: 'high', estimateHours: 4, status: 'done', app: 'backend' },
  { id: 'T-2.5.03', title: 'Admin: Fraud monitoring page', phase: 'phase2', epic: 'Fraud Prevention', area: 'web', priority: 'high', estimateHours: 8, status: 'done', app: 'admin' },

  // ============ PHASE 3 — FULL MARKETPLACE (Weeks 19-26) ============
  { id: 'T-3.1.01', title: 'PT profile CRUD API', phase: 'phase3', epic: 'PT Module', area: 'backend', priority: 'high', estimateHours: 4, status: 'done', app: 'backend' },
  { id: 'T-3.1.02', title: 'PT booking API + Cashfree', phase: 'phase3', epic: 'PT Module', area: 'backend', priority: 'high', estimateHours: 6, status: 'done', app: 'backend' },
  { id: 'T-3.1.03', title: 'Gym Panel: PT Management page (trainers page covers this)', phase: 'phase3', epic: 'PT Module', area: 'web', priority: 'high', estimateHours: 10, status: 'done', app: 'gym' },
  { id: 'T-3.1.04', title: 'Mobile: PT selection in subscription', phase: 'phase3', epic: 'PT Module', area: 'mobile', priority: 'high', estimateHours: 8, status: 'done', app: 'mobile' },
  { id: 'T-3.1.05', title: 'Mobile: PT booking standalone', phase: 'phase3', epic: 'PT Module', area: 'mobile', priority: 'high', estimateHours: 6, status: 'done', app: 'mobile' },
  { id: 'T-3.2.01', title: 'Wellness partner registration + KYC', phase: 'phase3', epic: 'Wellness Services', area: 'backend', priority: 'high', estimateHours: 8, status: 'done', app: 'backend' },
  { id: 'T-3.2.02', title: 'Wellness booking API + Cashfree', phase: 'phase3', epic: 'Wellness Services', area: 'backend', priority: 'high', estimateHours: 6, status: 'done', app: 'backend' },
  { id: 'T-3.2.03', title: 'Wellness Partner portal (Next.js)', phase: 'phase3', epic: 'Wellness Services', area: 'web', priority: 'high', estimateHours: 20, status: 'done' },
  { id: 'T-3.2.04', title: 'Mobile: Wellness discovery screen (API wired)', phase: 'phase3', epic: 'Wellness Services', area: 'mobile', priority: 'high', estimateHours: 12, status: 'done', app: 'mobile' },
  { id: 'T-3.3.01', title: 'Corporate account creation API', phase: 'phase3', epic: 'Corporate', area: 'backend', priority: 'high', estimateHours: 4, status: 'done', app: 'backend' },
  { id: 'T-3.3.02', title: 'Bulk seat assignment API', phase: 'phase3', epic: 'Corporate', area: 'backend', priority: 'high', estimateHours: 8, status: 'done', app: 'backend' },
  { id: 'T-3.3.03', title: 'Admin: Corporate accounts page', phase: 'phase3', epic: 'Corporate', area: 'web', priority: 'high', estimateHours: 12, status: 'done', app: 'admin' },
  { id: 'T-3.3.04', title: 'Corporate Panel: HR dashboard (brand shell)', phase: 'phase3', epic: 'Corporate', area: 'web', priority: 'high', estimateHours: 12, status: 'done', app: 'corporate' },
  { id: 'T-3.4.01', title: 'Product CRUD + orders API + Cashfree', phase: 'phase3', epic: 'E-Commerce', area: 'backend', priority: 'high', estimateHours: 10, status: 'done', app: 'backend' },
  { id: 'T-3.4.02', title: 'Admin: Store management pages', phase: 'phase3', epic: 'E-Commerce', area: 'web', priority: 'high', estimateHours: 16, status: 'done', app: 'admin' },
  { id: 'T-3.4.03', title: 'Mobile: Store + cart + checkout (API wired)', phase: 'phase3', epic: 'E-Commerce', area: 'mobile', priority: 'high', estimateHours: 14, status: 'done', app: 'mobile' },
  { id: 'T-3.5.01', title: 'Video upload + S3 + gating', phase: 'phase3', epic: 'Workout Videos', area: 'backend', priority: 'high', estimateHours: 6, status: 'done', app: 'backend' },
  { id: 'T-3.5.02', title: 'Admin: Video management page', phase: 'phase3', epic: 'Workout Videos', area: 'web', priority: 'high', estimateHours: 8, status: 'done', app: 'admin' },
  { id: 'T-3.5.03', title: 'Mobile: Workout videos + player (API wired)', phase: 'phase3', epic: 'Workout Videos', area: 'mobile', priority: 'high', estimateHours: 10, status: 'done', app: 'mobile' },
  { id: 'T-3.6.01', title: 'Notification engine (DB + FCM hook)', phase: 'phase3', epic: 'Notifications', area: 'backend', priority: 'medium', estimateHours: 6, status: 'done', app: 'backend' },
  { id: 'T-3.6.02', title: 'Coupon engine API', phase: 'phase3', epic: 'Notifications', area: 'backend', priority: 'medium', estimateHours: 6, status: 'done', app: 'backend' },
  { id: 'T-3.6.03', title: 'Admin: Notification panel', phase: 'phase3', epic: 'Notifications', area: 'web', priority: 'medium', estimateHours: 6, status: 'done', app: 'admin' },

  // ============ PHASE 4 — GROWTH & SCALE (Weeks 27-32) ============
  { id: 'T-4.01', title: 'Analytics dashboard (peak hours, churn, revenue)', phase: 'phase4', epic: 'Analytics', area: 'web', priority: 'high', estimateHours: 16, status: 'done', app: 'admin' },
  { id: 'T-4.02', title: 'Gym capacity live counter (WebSocket)', phase: 'phase4', epic: 'Real-Time', area: 'backend', priority: 'medium', estimateHours: 10, status: 'done', app: 'backend' },
  { id: 'T-4.03', title: 'Slot booking system', phase: 'phase4', epic: 'Booking', area: 'backend', priority: 'medium', estimateHours: 20, status: 'done', app: 'backend' },
  { id: 'T-4.04', title: 'AI recommendation engine', phase: 'phase4', epic: 'AI', area: 'backend', priority: 'medium', estimateHours: 16, status: 'done', app: 'backend' },
  { id: 'T-4.05', title: 'Membership freeze feature', phase: 'phase4', epic: 'Retention', area: 'backend', priority: 'medium', estimateHours: 8, status: 'done', app: 'backend' },
  { id: 'T-4.06', title: 'Referral system', phase: 'phase4', epic: 'Retention', area: 'backend', priority: 'medium', estimateHours: 10, status: 'done', app: 'backend' },
  { id: 'T-4.07', title: 'Loyalty points system', phase: 'phase4', epic: 'Retention', area: 'backend', priority: 'medium', estimateHours: 12, status: 'done', app: 'backend' },
  { id: 'T-4.08', title: 'Redis caching layer for gym listings', phase: 'phase4', epic: 'Performance', area: 'backend', priority: 'high', estimateHours: 8, status: 'done', app: 'backend' },
  { id: 'T-4.09', title: 'DB query optimization + read replicas', phase: 'phase4', epic: 'Performance', area: 'devops', priority: 'high', estimateHours: 10, status: 'blocked' },
  { id: 'T-4.10', title: 'Load testing with k6 (10k concurrent)', phase: 'phase4', epic: 'QA', area: 'qa', priority: 'high', estimateHours: 8, status: 'blocked' },
  { id: 'T-4.11', title: 'Penetration testing', phase: 'phase4', epic: 'Security', area: 'qa', priority: 'high', estimateHours: 16, status: 'blocked' },
  { id: 'T-4.12', title: 'GST invoice generation', phase: 'phase4', epic: 'Compliance', area: 'backend', priority: 'high', estimateHours: 6, status: 'done', app: 'backend' },
  { id: 'T-4.13', title: 'App Store + Play Store submission', phase: 'phase4', epic: 'Launch', area: 'mobile', priority: 'high', estimateHours: 8, status: 'blocked', app: 'mobile' },
  { id: 'T-4.14', title: 'GDPR compliance audit', phase: 'phase4', epic: 'Compliance', area: 'backend', priority: 'high', estimateHours: 8, status: 'blocked', app: 'backend' },
  // Pagination tasks
  { id: 'T-5.01', title: 'Backend: Paginated list endpoints (page/limit/total)', phase: 'phase4', epic: 'Performance', area: 'backend', priority: 'high', estimateHours: 8, status: 'done', app: 'backend' },
  { id: 'T-5.02', title: 'Admin panel: Pagination UI on all tables', phase: 'phase4', epic: 'Performance', area: 'web', priority: 'high', estimateHours: 6, status: 'done', app: 'admin' },
  { id: 'T-5.03', title: 'Mobile: Infinite scroll on gym explore list', phase: 'phase4', epic: 'Performance', area: 'mobile', priority: 'high', estimateHours: 4, status: 'done', app: 'mobile' },
  { id: 'T-5.04', title: 'Mobile: Recommended gyms on home screen', phase: 'phase4', epic: 'AI', area: 'mobile', priority: 'medium', estimateHours: 3, status: 'done', app: 'mobile' },
  { id: 'T-5.05', title: 'Mobile: Slot booking screen', phase: 'phase4', epic: 'Booking', area: 'mobile', priority: 'medium', estimateHours: 5, status: 'done', app: 'mobile' },
  { id: 'T-5.06', title: 'Mobile: GST invoice view screen', phase: 'phase4', epic: 'Compliance', area: 'mobile', priority: 'medium', estimateHours: 3, status: 'done', app: 'mobile' },
  // Auth guard tasks
  { id: 'T-6.01', title: 'Admin Panel: AuthGuard + ClientLayout route protection', phase: 'phase4', epic: 'Auth & Users', area: 'web', priority: 'high', estimateHours: 2, status: 'done', app: 'admin' },
  { id: 'T-6.02', title: 'Gym Panel: AuthGuard + ClientLayout route protection', phase: 'phase4', epic: 'Auth & Users', area: 'web', priority: 'high', estimateHours: 2, status: 'done', app: 'gym' },
  { id: 'T-6.03', title: 'Corporate Panel: AuthGuard + ClientLayout route protection', phase: 'phase4', epic: 'Auth & Users', area: 'web', priority: 'high', estimateHours: 2, status: 'done', app: 'corporate' },
  { id: 'T-6.04', title: 'Wellness Portal: AuthGuard + ClientLayout route protection', phase: 'phase4', epic: 'Auth & Users', area: 'web', priority: 'high', estimateHours: 2, status: 'done', app: 'wellness' },
  { id: 'T-6.05', title: 'All portals: Shell sign-out button wired to clear token + redirect', phase: 'phase4', epic: 'Auth & Users', area: 'web', priority: 'high', estimateHours: 1, status: 'done', app: 'admin' },
  { id: 'T-6.06', title: 'All portals: Login page redirects already-authenticated users', phase: 'phase4', epic: 'Auth & Users', area: 'web', priority: 'medium', estimateHours: 1, status: 'done', app: 'admin' },
  { id: 'T-6.07', title: 'Admin panel moved to port 3004 (port 3000 conflict resolved)', phase: 'phase4', epic: 'DevOps', area: 'web', priority: 'low', estimateHours: 0, status: 'done', app: 'admin' },
  { id: 'T-6.08', title: 'iOS Simulator: Fix duplicate React (pnpm symlink) — app running in Expo Go SDK 54', phase: 'phase4', epic: 'DevOps', area: 'mobile', priority: 'high', estimateHours: 4, status: 'done', app: 'mobile' },
  { id: 'T-6.09', title: 'Metro config: pnpm monorepo hoisted linker with blockList for singleton React', phase: 'phase4', epic: 'DevOps', area: 'mobile', priority: 'high', estimateHours: 2, status: 'done', app: 'mobile' },
  { id: 'T-6.10', title: 'Back gesture disabled on login/tabs screens to prevent GO_BACK warning', phase: 'phase4', epic: 'DevOps', area: 'mobile', priority: 'low', estimateHours: 0, status: 'done', app: 'mobile' },
  { id: 'T-6.11', title: 'Metro: react-native/* sub-path resolveRequest fix for InitializeCore HMR', phase: 'phase4', epic: 'DevOps', area: 'mobile', priority: 'medium', estimateHours: 1, status: 'done', app: 'mobile' },
  { id: 'T-6.12', title: 'Backend: gym tier filter added to GET /gyms (Elite→corporate_exclusive mapping)', phase: 'phase4', epic: 'API', area: 'backend', priority: 'medium', estimateHours: 1, status: 'done', app: 'backend' },
  { id: 'T-6.13', title: 'Backend: commission/rates endpoint added (in-memory config, admin CRUD)', phase: 'phase4', epic: 'API', area: 'backend', priority: 'medium', estimateHours: 2, status: 'done', app: 'backend' },
  { id: 'T-6.14', title: 'Mobile store: category filter fixed to lowercase (API expects lowercase)', phase: 'phase4', epic: 'API', area: 'mobile', priority: 'medium', estimateHours: 1, status: 'done', app: 'mobile' },
  { id: 'T-6.15', title: 'All portals: Remove MOCK/dummy data fallbacks — replaced with empty states', phase: 'phase4', epic: 'API', area: 'web', priority: 'high', estimateHours: 3, status: 'done', app: 'admin' },
  { id: 'T-6.16', title: 'Mobile _layout.tsx: Register all screens (edit-profile, invoice, trainers, slots, wellness, subscription-detail)', phase: 'phase4', epic: 'DevOps', area: 'mobile', priority: 'medium', estimateHours: 1, status: 'done', app: 'mobile' },

  // Phase 5 — Mobile UI Overhaul + Full API Integration
  { id: 'T-7.01', title: 'Mobile theme: Accent changed from #3DFF54 → #CCFF00 (neon yellow-green); brand.ts updated', phase: 'phase5', epic: 'Design', area: 'mobile', priority: 'high', estimateHours: 1, status: 'done', app: 'mobile' },
  { id: 'T-7.02', title: 'Mobile: AuroraBackground component created with 4 variants (default/gym/premium/store)', phase: 'phase5', epic: 'Design', area: 'mobile', priority: 'high', estimateHours: 2, status: 'done', app: 'mobile' },
  { id: 'T-7.03', title: 'Mobile: GlassCard component created for standardized glassmorphism cards', phase: 'phase5', epic: 'Design', area: 'mobile', priority: 'high', estimateHours: 1, status: 'done', app: 'mobile' },
  { id: 'T-7.04', title: 'Mobile login.tsx: Rewritten with AuroraBackground, glassmorphism, no back button', phase: 'phase5', epic: 'Auth', area: 'mobile', priority: 'high', estimateHours: 2, status: 'done', app: 'mobile' },
  { id: 'T-7.05', title: 'Mobile otp.tsx: Fixed to store user object (setUser) after verify; AuroraBackground added', phase: 'phase5', epic: 'Auth', area: 'mobile', priority: 'high', estimateHours: 1, status: 'done', app: 'mobile' },
  { id: 'T-7.06', title: 'Mobile gym/[id].tsx: Subscription check → Book Slot only if subscribed; Show QR button; AuroraBackground', phase: 'phase5', epic: 'Gym', area: 'mobile', priority: 'high', estimateHours: 3, status: 'done', app: 'mobile' },
  { id: 'T-7.07', title: 'Mobile qr.tsx: Per-gym QR with gymId+subId params; 30s countdown; gym name badge', phase: 'phase5', epic: 'QR', area: 'mobile', priority: 'high', estimateHours: 2, status: 'done', app: 'mobile' },
  { id: 'T-7.08', title: 'Mobile subscriptions.tsx: Show QR + Book Slot action row per subscription', phase: 'phase5', epic: 'Subscriptions', area: 'mobile', priority: 'high', estimateHours: 2, status: 'done', app: 'mobile' },
  { id: 'T-7.09', title: 'Backend: homepage/config GET+PUT endpoint added; mobile home reads config', phase: 'phase5', epic: 'API', area: 'backend', priority: 'high', estimateHours: 2, status: 'done', app: 'backend' },
  { id: 'T-7.10', title: 'Admin panel homepage builder: saves to backend API instead of localStorage', phase: 'phase5', epic: 'Admin', area: 'web', priority: 'medium', estimateHours: 1, status: 'done', app: 'admin' },
  { id: 'T-7.11', title: 'Cashfree payment WebView: payment-webview.tsx screen + order.tsx → WebView flow', phase: 'phase5', epic: 'Payments', area: 'mobile', priority: 'high', estimateHours: 3, status: 'done', app: 'mobile' },
  { id: 'T-7.12', title: 'Product detail screen: app/product/[id].tsx with full design, cart, buy-now', phase: 'phase5', epic: 'Store', area: 'mobile', priority: 'high', estimateHours: 3, status: 'done', app: 'mobile' },
  { id: 'T-7.13', title: 'Mobile store.tsx: Product cards navigate to product detail screen on press', phase: 'phase5', epic: 'Store', area: 'mobile', priority: 'medium', estimateHours: 1, status: 'done', app: 'mobile' },
  { id: 'T-7.14', title: 'AuroraBackground applied to all 13 remaining mobile screens (history, videos, review, plans, success, slots, edit-profile, subscription-detail, trainers, wellness, invoice, duration, checkin-result)', phase: 'phase5', epic: 'Design', area: 'mobile', priority: 'high', estimateHours: 3, status: 'done', app: 'mobile' },
  { id: 'T-7.15', title: 'All portals globals.css: Brand color changed from indigo #6C63FF → neon yellow-green #CCFF00', phase: 'phase5', epic: 'Design', area: 'web', priority: 'high', estimateHours: 1, status: 'done', app: 'admin' },
  { id: 'T-7.16', title: 'All tab screens (explore, index, profile, store, subscriptions): AuroraBackground wrapping added', phase: 'phase5', epic: 'Design', area: 'mobile', priority: 'medium', estimateHours: 1, status: 'done', app: 'mobile' },

  // ── Phase 5 continued — Design Overhaul v2 & Dynamic Home ──
  { id: 'T-8.01', title: 'Mobile plans.tsx: CTA text fixes (Explore Gyms / Browse Gyms); badge → Multi Gym only; dark gym image', phase: 'phase5', epic: 'Design', area: 'mobile', priority: 'high', estimateHours: 1, status: 'done', app: 'mobile' },
  { id: 'T-8.02', title: 'Mobile home index.tsx: Hero images → dark moody Unsplash; "See all"→"View All›"; trust badges with subtitles; compact fonts', phase: 'phase5', epic: 'Design', area: 'mobile', priority: 'high', estimateHours: 2, status: 'done', app: 'mobile' },
  { id: 'T-8.03', title: 'Mobile wellness.tsx: Numeric orange cart badge (count pill); warmer spa images', phase: 'phase5', epic: 'Design', area: 'mobile', priority: 'medium', estimateHours: 1, status: 'done', app: 'mobile' },
  { id: 'T-8.04', title: 'Mobile slots.tsx: Workout type filter chips (All/Gym Workout/Cardio/Yoga); fetches /sessions/types/:gymId; colored accent bars on slot cards', phase: 'phase5', epic: 'Booking', area: 'mobile', priority: 'high', estimateHours: 2, status: 'done', app: 'mobile' },
  { id: 'T-8.05', title: 'Backend misc.module.ts: Homepage config persisted to AppConfigEntity (DB); resolves gym+product refs; expanded default config schema', phase: 'phase5', epic: 'API', area: 'backend', priority: 'high', estimateHours: 4, status: 'done', app: 'backend' },
  { id: 'T-8.06', title: 'Admin homepage/page.tsx: Full Homepage Builder rewrite — section reorder ↑↓, visibility toggle, slide CRUD, gym search+pin, product category picker, live phone preview', phase: 'phase5', epic: 'Admin', area: 'web', priority: 'high', estimateHours: 6, status: 'done', app: 'admin' },
  { id: 'T-8.07', title: 'Mobile index.tsx: Full rewrite — fully dynamic from /homepage/config API; FALLBACK_CONFIG for offline; section switch renderer (hero/categories/featured_gyms/products/trust/testimonials)', phase: 'phase5', epic: 'Design', area: 'mobile', priority: 'high', estimateHours: 5, status: 'done', app: 'mobile' },
  { id: 'T-8.08', title: 'Mobile gyms.tsx: New GLP page — category chips, sort bottom sheet (Top Rated/Nearest/Price), FlatList pagination, no search bar, ?category param support', phase: 'phase5', epic: 'Gym', area: 'mobile', priority: 'high', estimateHours: 4, status: 'done', app: 'mobile' },
  { id: 'T-8.09', title: 'Mobile explore.tsx: Redesigned as navigation hub — 3-col category grid, big Wellness+Store cards, 4 service cards (Trainers/Videos/Corporate/Nearby)', phase: 'phase5', epic: 'Design', area: 'mobile', priority: 'high', estimateHours: 3, status: 'done', app: 'mobile' },
  { id: 'T-8.10', title: 'Mobile nearby.tsx: New map page — dark map style, custom gym pins with tier colors, bottom sheet horizontal cards, user location radius ring, expo-location + react-native-maps', phase: 'phase5', epic: 'Maps', area: 'mobile', priority: 'high', estimateHours: 5, status: 'done', app: 'mobile' },
  { id: 'T-8.11', title: 'Tasklist: Update tasks.ts with all Phase 5 v2 completions (T-8.xx series)', phase: 'phase5', epic: 'Project Management', area: 'devops', priority: 'low', estimateHours: 1, status: 'done' },
];

export function getStats(tasks: Task[] = TASKS) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const pending = tasks.filter((t) => t.status === 'pending').length;
  const blocked = tasks.filter((t) => t.status === 'blocked').length;
  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;
  const totalHours = tasks.reduce((sum, t) => sum + t.estimateHours, 0);
  const doneHours = tasks.filter((t) => t.status === 'done').reduce((sum, t) => sum + t.estimateHours, 0);
  return { total, done, inProgress, pending, blocked, progressPct, totalHours, doneHours };
}
