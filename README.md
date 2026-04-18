# BookMyFit — Full-Stack Monorepo

Enterprise fitness subscription marketplace with **4 applications** + **1 backend** in a pnpm workspace monorepo.

---

## ✅ What's Built

### Fully runnable
- **📊 Tasklist Tracker** (`apps/tasklist`) — Next.js dashboard showing live progress across all phases. **→ http://localhost:3100**

### Scaffolded & runnable (core pages + working auth flows)
- **🔧 Backend API** (`backend`) — NestJS with 9 modules: auth (OTP + JWT), users, gyms, subscriptions, check-ins, **QR engine with Redis lock**, **settlement engine with revenue buckets**, corporate, health. **→ http://localhost:3003**
- **🖥️ Admin Panel** (`apps/admin-panel`) — Next.js with 16 pages + login + sidebar shell. **→ http://localhost:3000**
- **🏋️ Gym Partner Panel** (`apps/gym-panel`) — Next.js with 12 pages + **functional QR scanner** that hits backend. **→ http://localhost:3001**
- **💼 Corporate Panel** (`apps/corporate-panel`) — Next.js with 7 pages + login. **→ http://localhost:3002**
- **📱 Mobile App** (`apps/mobile`) — Expo with 11 screens: splash, login, OTP, home, explore, gym detail, subscriptions, plans, store, profile, **QR code generator** that calls backend.

### Shared
- **📦 `packages/types`** — Shared TypeScript interfaces across all apps.

---

## 🚀 Quick Start

### 0. Prerequisites
- Node.js 18.17+
- pnpm 8+ (`npm i -g pnpm`)
- Docker (for PostgreSQL & Redis) OR native Postgres/Redis installs
- Expo Go app on phone (for mobile)

### 1. Install dependencies

```bash
cd bookmyfit
pnpm install
```

### 2. Start Postgres + Redis

```bash
docker compose up -d
```

(Starts Postgres on :5432, Redis on :6379)

### 3. Copy env

```bash
cp .env.example .env
```

### 4. Run the Tasklist Tracker (already tested ✅)

```bash
pnpm --filter tasklist dev
# open http://localhost:3100
```

### 5. Run the Backend API

```bash
pnpm --filter backend start:dev
# API on http://localhost:3003
# Swagger docs on http://localhost:3003/api/docs
```

### 6. Run the Admin Panel

```bash
pnpm --filter admin-panel dev
# http://localhost:3000
```

### 7. Run the Gym Partner Panel

```bash
pnpm --filter gym-panel dev
# http://localhost:3001
```

### 8. Run the Corporate Panel

```bash
pnpm --filter corporate-panel dev
# http://localhost:3002
```

### 9. Run the Mobile App

```bash
pnpm --filter mobile start
# Scan QR code with Expo Go on your phone
```

### Run everything at once

```bash
pnpm dev
```

---

## 🏗️ Repo Structure

```
bookmyfit/
├── apps/
│   ├── tasklist/          # ✅ Dev progress tracker (Next.js :3100)
│   ├── admin-panel/       # Super admin portal (Next.js :3000)
│   ├── gym-panel/         # Gym partner portal (Next.js :3001)
│   ├── corporate-panel/   # Corporate HR portal (Next.js :3002)
│   └── mobile/            # User mobile app (Expo)
├── backend/               # NestJS API (:3003)
│   └── src/
│       ├── modules/
│       │   ├── auth/           # ✅ OTP + JWT + refresh
│       │   ├── users/          # ✅ CRUD
│       │   ├── gyms/           # ✅ CRUD + approval + tier
│       │   ├── subscriptions/  # ✅ plans + purchase
│       │   ├── checkins/       # ✅ audit log
│       │   ├── qr/             # ✅ Generate + validate (JWT+HMAC+Redis lock)
│       │   ├── settlements/    # ✅ Revenue buckets + monthly cron
│       │   ├── corporate/      # ✅ Accounts + bulk assign
│       │   └── health/
│       └── database/entities/
├── packages/
│   └── types/             # Shared TypeScript types
├── docker-compose.yml
├── pnpm-workspace.yaml
└── README.md              # You are here
```

---

## 🔑 Key Backend Features (implemented)

### 🔐 Authentication
- **`POST /api/v1/auth/otp/send`** — Dev mode returns `123456` for easy testing
- **`POST /api/v1/auth/otp/verify`** — Creates user, issues JWT + refresh token, stores device ID
- **`POST /api/v1/auth/admin/login`** — Email+password login for admin/gym/corporate panels
- **`POST /api/v1/auth/refresh`** — Refresh token rotation

### 🎫 QR Check-in Engine
Implements the LLR's fraud-prevention system:
- **JWT + HMAC-SHA256** with 30-second expiry
- **Redis idempotency key** (`jti`) — prevents token reuse
- **Redis daily lock** (`checkin:daily:{userId}:{date}`) — prevents multi-gym same-day abuse
- **Subscription validation** — plan-to-gym matching for Individual plans
- Full audit log of all attempts (success & failure with reason)

### 💰 Settlement Engine
Implements the LLR's revenue-bucket model:
- **Individual commission**: Platform % × individual revenue → gym gets remainder
- **Elite pool**: Platform keeps 20%, 80% split by visit ratio across all gyms
- **Pro pool**: Platform keeps 15%, 85% split by weighted visit ratio
- **Monthly cron** runs automatically on 1st of month (NestJS `@Cron`)
- **Approve → Pay** workflow with audit trail

### 🏢 Corporate Management
- Create corporate accounts with seats
- Bulk employee assignment
- Per-company employee isolation (HR sees only their employees; admin sees all)

---

## 🧪 Try it End-to-End

1. Start Postgres + Redis: `docker compose up -d`
2. Start backend: `pnpm --filter backend start:dev`
3. Open Swagger: http://localhost:3003/api/docs
4. Call `/auth/otp/send` with `{"phone":"9999999999"}` — you'll get `devOtp: "123456"` in the response
5. Call `/auth/otp/verify` with `{"phone":"9999999999","code":"123456","deviceId":"test"}` → receives JWT
6. Start mobile app and sign in with the same phone → get QR code that rotates every 30s
7. Start gym panel and paste the QR token into the scanner → see the full validation flow with Redis daily lock

---

## 📋 Progress Tracking

All tasks (90+) are tracked at **http://localhost:3100** with:
- Filters by phase, status, app, area
- Per-app progress bars
- Per-phase progress bars
- Search & group-by-epic

**Current overall progress: ~25%** (scaffolding + core backend engines done; most frontend pages are stubs that need real UI work).

---

## 📝 What Each Developer Should Do Next

### Backend devs
- [ ] Wire up Razorpay webhook in `subscriptions.module.ts`
- [ ] Complete KYC upload with S3 in `gyms.module.ts`
- [ ] Add PT, Wellness, Store, Notifications modules (stubs exist in the tasklist)
- [ ] Write seed data (`src/database/seeds/`)
- [ ] Write unit tests for settlement engine (critical — money math)

### Next.js devs
- [ ] Replace `PlaceholderPage` components with real UI using:
  - Design references in `../admin.html`, `../gym.html`, `../corporate.html`
  - shadcn/ui components (`pnpm dlx shadcn-ui@latest init` inside each panel)
  - TanStack Table for data grids
  - Recharts for charts (admin analytics)
- [ ] Add NextAuth.js for session management
- [ ] Build RTK Query / TanStack Query hooks for API calls

### Mobile (Expo) dev
- [ ] Replace simple screens with glassmorphism UI matching `../bmf-complete.html`
- [ ] Add Redux Toolkit + RTK Query (packages already in `package.json`)
- [ ] Install Razorpay SDK and wire subscription purchase flow
- [ ] Add FCM for push notifications
- [ ] Integrate `expo-camera` for scanner fallback

### DevOps
- [ ] Add GitHub Actions CI (`.github/workflows/`)
- [ ] Setup EAS Build for mobile
- [ ] Terraform for AWS infra (EC2, RDS, ElastiCache, S3, CloudFront)
- [ ] Sentry + Datadog integration

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Mobile | Expo SDK 50, React Native 0.73, Expo Router, react-native-qrcode-svg |
| Web | Next.js 14 (App Router), React 18, TailwindCSS, lucide-react |
| Backend | NestJS 10, TypeScript, TypeORM, PostgreSQL, Redis, JWT, class-validator |
| Shared | pnpm workspaces, TypeScript 5 |
| Infra | Docker Compose (dev), AWS (prod target) |

---

## 📚 Documentation

- `../plan.md` — Original 32-week development plan
- `../requirements.md` — Gap analysis & LLR corrections (20 gaps identified)
- `../PROJECT_STRUCTURE.md` — Detailed folder structure guide
- `../admin.html`, `../gym.html`, `../corporate.html`, `../bmf-complete.html` — Design references

---

## 🙏 Scope Note

This monorepo is **a substantial head start** for a 32-week, 10-person project. The core business-logic modules (QR engine, settlement engine, auth, corporate) are implemented and functional. The web panels have complete navigation + login + dashboard, with feature pages as scaffolded placeholders. The mobile app has a working auth → QR flow.

**It will NOT be production-ready out of the box** — real features (payments integration with live Razorpay keys, pixel-perfect UIs matching the HTML prototypes, comprehensive test coverage, error handling edge cases, CI/CD, actual SMS via Twilio) remain team work. The scaffold lets your team jump directly to feature work without spending 2-3 weeks on setup.
