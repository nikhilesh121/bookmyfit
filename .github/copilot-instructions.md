# BookMyFit — Copilot Instructions

## Monorepo Structure

pnpm workspace monorepo with a single `backend` + five apps + shared types:

| Package | Filter name | Port | Stack |
|---|---|---|---|
| `backend/` | `backend` | 3003 | NestJS 10, TypeORM, PostgreSQL, Redis |
| `apps/admin-panel/` | `admin-panel` | 3000 | Next.js 14 App Router |
| `apps/gym-panel/` | `gym-panel` | 3001 | Next.js 14 App Router |
| `apps/corporate-panel/` | `corporate-panel` | 3002 | Next.js 14 App Router |
| `apps/tasklist/` | `tasklist` | 3100 | Next.js 14 App Router |
| `apps/mobile/` | `mobile` | Expo | Expo SDK 50, Expo Router |
| `packages/types/` | — | — | Shared TypeScript interfaces |

## Dev Commands

```bash
# Start individual apps
pnpm --filter backend start:dev         # API at :3003, auto-reload
pnpm --filter admin-panel dev           # Admin at :3000
pnpm --filter gym-panel dev             # Gym partner at :3001
pnpm --filter corporate-panel dev       # Corporate at :3002
pnpm --filter mobile start              # Expo (scan QR with Expo Go)

# Start all apps in parallel
pnpm dev

# Infrastructure (required before running backend)
docker compose up -d                    # Postgres :5432, Redis :6379
```

## Build / Lint / Test

```bash
# All packages
pnpm build
pnpm lint
pnpm test

# Scoped to one package
pnpm --filter backend build
pnpm --filter backend lint
pnpm --filter backend test              # runs Jest

# Run a single test file (backend)
pnpm --filter backend test -- --testPathPattern=settlements
```

## Backend Architecture

All routes are prefixed `/api/v1`. Swagger UI lives at `http://localhost:3003/api/docs`.

### Module layout (`backend/src/modules/<name>/`)
Each feature module follows:
```
<name>.module.ts      # NestJS @Module, imports TypeORM forFeature
<name>.controller.ts  # Route handlers; DTOs defined inline using class-validator
<name>.service.ts     # Business logic
```

### Entities (`backend/src/database/entities/`)
TypeORM entities. `synchronize: true` in development — schema is auto-migrated. **Never enable `synchronize` in production.**

### Guards & Auth
- `JwtAuthGuard` (`common/guards/jwt-auth.guard.ts`) — applied per route with `@UseGuards(JwtAuthGuard)`
- `RolesGuard` + `@Roles(...)` decorator — combine with `JwtAuthGuard`:
  ```ts
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  ```
- User roles: `super_admin | gym_owner | gym_staff | corporate_admin | wellness_partner | end_user`
- Mobile users authenticate via OTP → JWT. Panel users (admin/gym/corporate) authenticate via email + password.

### Redis usage
- QR `jti` idempotency keys — prevents token reuse
- Daily check-in lock `checkin:daily:{userId}:{date}` — prevents multi-gym same-day abuse
- Redis client is provided by `RedisModule` (`common/redis/redis.module.ts`)

### Settlement engine
Three revenue buckets: `individual_commission`, `elite_pool`, `pro_pool`. Monthly cron fires on the 1st via NestJS `@Cron`. Workflow: pending → approved → paid.

### DTOs
DTOs are declared inline at the top of each controller file using `class-validator` decorators. There is no separate `dto/` subfolder per module.

## Frontend Conventions (Next.js panels)

### `Shell.tsx` wrapper
Every page wraps its content in `<Shell title="...">`. `Shell` renders the sidebar nav and top header. Never bypass it for authenticated pages.

### `lib/api.ts` fetch client
Each panel has its own `lib/api.ts` with a panel-specific localStorage token key (`bmf_admin_token`, `bmf_gym_token`, `bmf_corporate_token`). Use `api.get/post/put/del` for all backend calls — it handles auth headers and 401 redirects automatically.

### Route structure
Pages live under `app/<route>/page.tsx` (Next.js App Router). All page files are Server Components unless they include `'use client'`.

## Design System

The entire platform uses one dark theme. **Do not deviate from these tokens.**

### CSS variables (web panels — defined in `app/globals.css`)
```css
--primary / --accent: #3DFF54   /* neon green */
--bg: #060606
--serif: 'Playfair Display'
--sans: 'DM Sans'
```

### Utility classes (already in globals.css — use these, don't reinvent)
- `.glass` — glassmorphism card (`backdrop-filter: blur(24px)`, semi-transparent border)
- `.card` — standard card (similar to glass with `--surface` background)
- `.serif` — Playfair Display heading font
- `.kicker` — 10px uppercase label with wide letter-spacing
- `.btn-primary` / `.btn-ghost` — action buttons
- `.accent-pill` — small green badge

### Mobile design tokens (`apps/mobile/theme/brand.ts`)
Mobile uses the same palette exported as JS constants (`colors`, `fonts`, `radius`, `spacing`, `glass`). Always import from `theme/brand` instead of hardcoding hex values.

## Shared Types (`packages/types`)

Import domain interfaces from `@bookmyfit/types`:
```ts
import type { User, Gym, Subscription, PlanType, CheckinStatus, Settlement } from '@bookmyfit/types';
```
Core enums: `PlanType = 'individual' | 'pro' | 'max' | 'elite'` — the four subscription tiers.

## Environment

Copy `.env.example` → `.env` in the repo root. The backend reads `.env` or `../.env`. Key vars:
- `DATABASE_URL` — when set, takes priority over individual `DB_*` vars; required for Neon/cloud Postgres (SSL is enabled automatically)
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — must be changed in production
- `CASHFREE_*` — payment gateway (not Razorpay; the original README mentions Razorpay but Cashfree is what's in `.env`)
- In dev, `POST /api/v1/auth/otp/send` returns `devOtp: "123456"` — no real SMS needed

## What's a Stub

Most frontend feature pages under `apps/*/app/<route>/page.tsx` render `<PlaceholderPage>` from `components/PlaceholderPage.tsx`. When implementing a page, replace the placeholder with real UI using the `.glass`, `.card`, and other existing CSS classes.
