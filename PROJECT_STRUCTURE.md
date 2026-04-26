# BookMyFit - Recommended Project Structure

---

## 📁 Monorepo Structure (Recommended)

```
bookmyfit/
├── apps/
│   ├── mobile/                    # Expo React Native App
│   │   ├── app/                   # Expo Router (file-based routing)
│   │   │   ├── (auth)/
│   │   │   │   ├── login.tsx
│   │   │   │   ├── otp.tsx
│   │   │   │   └── onboarding.tsx
│   │   │   ├── (tabs)/
│   │   │   │   ├── index.tsx      # Home
│   │   │   │   ├── explore.tsx    # Gym Listing
│   │   │   │   ├── subscriptions.tsx
│   │   │   │   ├── store.tsx
│   │   │   │   └── profile.tsx
│   │   │   ├── gym/
│   │   │   │   └── [id].tsx       # Gym Detail
│   │   │   ├── plans/
│   │   │   │   ├── select.tsx
│   │   │   │   └── duration.tsx
│   │   │   ├── qr/
│   │   │   │   └── index.tsx
│   │   │   └── _layout.tsx
│   │   ├── components/
│   │   │   ├── ui/                # Reusable UI components
│   │   │   ├── gym/               # Gym-specific components
│   │   │   └── subscription/      # Subscription components
│   │   ├── store/                 # Redux store
│   │   │   ├── slices/
│   │   │   │   ├── authSlice.ts
│   │   │   │   ├── gymSlice.ts
│   │   │   │   └── subscriptionSlice.ts
│   │   │   └── index.ts
│   │   ├── services/              # API services (RTK Query)
│   │   │   ├── authApi.ts
│   │   │   ├── gymApi.ts
│   │   │   └── subscriptionApi.ts
│   │   ├── utils/
│   │   ├── constants/
│   │   ├── types/
│   │   ├── app.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── admin-panel/               # Next.js Admin Panel
│   │   ├── app/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── page.tsx       # Dashboard
│   │   │   │   ├── analytics/
│   │   │   │   ├── gyms/
│   │   │   │   ├── users/
│   │   │   │   ├── subscriptions/
│   │   │   │   ├── corporate/
│   │   │   │   ├── settlements/
│   │   │   │   ├── store/
│   │   │   │   └── settings/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/                # shadcn/ui components
│   │   │   ├── dashboard/
│   │   │   ├── tables/
│   │   │   └── charts/
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   └── utils.ts
│   │   ├── hooks/
│   │   ├── types/
│   │   ├── public/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── gym-panel/                 # Next.js Gym Partner Panel
│   │   ├── app/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── page.tsx       # Dashboard
│   │   │   │   ├── scanner/
│   │   │   │   ├── sessions/
│   │   │   │   ├── members/
│   │   │   │   ├── profile/
│   │   │   │   ├── trainers/
│   │   │   │   ├── settlement/
│   │   │   │   └── reports/
│   │   │   ├── login/
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   ├── lib/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── corporate-panel/           # Next.js Corporate Panel
│   │   ├── app/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── page.tsx       # Dashboard
│   │   │   │   ├── employees/
│   │   │   │   ├── assign/
│   │   │   │   ├── usage/
│   │   │   │   ├── billing/
│   │   │   │   └── settings/
│   │   │   ├── login/
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   ├── lib/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── wellness-panel/            # Next.js Wellness Partner Panel
│       ├── app/
│       ├── components/
│       ├── lib/
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── api-client/                # Shared API client
│   │   ├── src/
│   │   │   ├── endpoints/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ui/                        # Shared UI components
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── styles/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── types/                     # Shared TypeScript types
│       ├── src/
│       │   ├── user.ts
│       │   ├── gym.ts
│       │   ├── subscription.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── backend/                       # NestJS Backend
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── dto/
│   │   │   │   └── guards/
│   │   │   ├── users/
│   │   │   ├── gyms/
│   │   │   ├── subscriptions/
│   │   │   ├── checkins/
│   │   │   ├── qr/
│   │   │   ├── settlements/
│   │   │   ├── payments/
│   │   │   ├── corporate/
│   │   │   ├── trainers/
│   │   │   ├── wellness/
│   │   │   ├── store/
│   │   │   ├── notifications/
│   │   │   └── analytics/
│   │   ├── common/
│   │   │   ├── decorators/
│   │   │   ├── filters/
│   │   │   ├── guards/
│   │   │   ├── interceptors/
│   │   │   └── pipes/
│   │   ├── config/
│   │   ├── database/
│   │   │   ├── entities/
│   │   │   ├── migrations/
│   │   │   └── seeds/
│   │   ├── utils/
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── test/
│   ├── package.json
│   ├── tsconfig.json
│   └── nest-cli.json
│
├── infrastructure/                # DevOps & Infrastructure
│   ├── docker/
│   │   ├── Dockerfile.backend
│   │   ├── Dockerfile.admin
│   │   ├── Dockerfile.gym
│   │   └── docker-compose.yml
│   ├── terraform/                 # AWS infrastructure as code
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── kubernetes/                # K8s manifests (if needed)
│   └── scripts/
│       ├── deploy.sh
│       └── backup.sh
│
├── docs/                          # Documentation
│   ├── api/                       # API documentation
│   │   ├── auth.md
│   │   ├── gyms.md
│   │   └── subscriptions.md
│   ├── architecture/
│   │   ├── system-design.md
│   │   └── database-schema.md
│   ├── deployment/
│   │   └── deployment-guide.md
│   └── user-guides/
│       ├── admin-guide.md
│       ├── gym-guide.md
│       └── corporate-guide.md
│
├── .github/
│   └── workflows/
│       ├── mobile-ci.yml
│       ├── web-ci.yml
│       └── backend-ci.yml
│
├── .gitignore
├── package.json                   # Root package.json (workspaces)
├── turbo.json                     # Turborepo config
├── pnpm-workspace.yaml            # pnpm workspaces
└── README.md
```

---

## 🛠️ Tech Stack Per Application

### Mobile App (`apps/mobile`)
```json
{
  "dependencies": {
    "expo": "~50.0.0",
    "react-native": "0.73.x",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/stack": "^6.3.0",
    "@react-navigation/bottom-tabs": "^6.5.0",
    "@reduxjs/toolkit": "^2.0.0",
    "react-redux": "^9.0.0",
    "nativewind": "^4.0.0",
    "react-native-qrcode-svg": "^6.2.0",
    "expo-camera": "~14.0.0",
    "expo-secure-store": "~12.8.0",
    "razorpay-react-native": "^2.3.0",
    "@react-native-firebase/messaging": "^19.0.0",
    "react-native-video": "^6.0.0",
    "lottie-react-native": "^6.5.0",
    "axios": "^1.6.0"
  }
}
```

### Admin Panel (`apps/admin-panel`)
```json
{
  "dependencies": {
    "next": "14.1.0",
    "react": "^18.2.0",
    "typescript": "^5.3.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-select": "^2.0.0",
    "next-auth": "^5.0.0",
    "zustand": "^4.5.0",
    "@tanstack/react-query": "^5.17.0",
    "@tanstack/react-table": "^8.11.0",
    "react-hook-form": "^7.49.0",
    "zod": "^3.22.0",
    "recharts": "^2.10.0",
    "lucide-react": "^0.312.0",
    "axios": "^1.6.0"
  }
}
```

### Backend (`backend`)
```json
{
  "dependencies": {
    "@nestjs/core": "^10.3.0",
    "@nestjs/common": "^10.3.0",
    "@nestjs/typeorm": "^10.0.0",
    "typeorm": "^0.3.19",
    "pg": "^8.11.0",
    "redis": "^4.6.0",
    "@nestjs/jwt": "^10.2.0",
    "bcrypt": "^5.1.1",
    "razorpay": "^2.9.2",
    "aws-sdk": "^2.1540.0",
    "twilio": "^4.20.0",
    "nodemailer": "^6.9.8",
    "class-validator": "^0.14.1",
    "class-transformer": "^0.5.1"
  }
}
```

---

## 📦 Package Manager: pnpm (Recommended)

### Why pnpm?
- Faster than npm/yarn
- Efficient disk space usage (hard links)
- Strict dependency resolution
- Built-in workspace support

### Setup
```bash
# Install pnpm
npm install -g pnpm

# Install all dependencies
pnpm install

# Run mobile app
pnpm --filter mobile dev

# Run admin panel
pnpm --filter admin-panel dev

# Run backend
pnpm --filter backend start:dev
```

---

## 🚀 Development Workflow

### 1. Initial Setup
```bash
# Clone repo
git clone https://github.com/your-org/bookmyfit.git
cd bookmyfit

# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env

# Start PostgreSQL & Redis (Docker)
docker-compose up -d postgres redis

# Run database migrations
pnpm --filter backend migration:run

# Seed database
pnpm --filter backend seed:run
```

### 2. Development
```bash
# Terminal 1: Backend
pnpm --filter backend start:dev

# Terminal 2: Admin Panel
pnpm --filter admin-panel dev

# Terminal 3: Mobile App
pnpm --filter mobile start
```

### 3. Building
```bash
# Build all apps
pnpm build

# Build specific app
pnpm --filter mobile build
pnpm --filter admin-panel build
pnpm --filter backend build
```

---

## 🌍 Environment Variables

### Mobile App (`.env`)
```env
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_RAZORPAY_KEY=rzp_test_xxxxx
EXPO_PUBLIC_FIREBASE_API_KEY=xxxxx
```

### Admin Panel (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

### Backend (`.env`)
```env
NODE_ENV=development
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=bookmyfit

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx

# AWS S3
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_S3_BUCKET=bookmyfit-uploads

# Twilio (SMS)
TWILIO_ACCOUNT_SID=xxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

## 📊 Database Migrations

### Create Migration
```bash
pnpm --filter backend migration:create AddGymTierColumn
```

### Run Migrations
```bash
pnpm --filter backend migration:run
```

### Revert Migration
```bash
pnpm --filter backend migration:revert
```

---

## 🧪 Testing

### Backend Tests
```bash
# Unit tests
pnpm --filter backend test

# E2E tests
pnpm --filter backend test:e2e

# Coverage
pnpm --filter backend test:cov
```

### Mobile Tests
```bash
# Jest tests
pnpm --filter mobile test

# E2E tests (Detox)
pnpm --filter mobile test:e2e
```

---

## 🚢 Deployment

### Mobile App
```bash
# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### Web Panels (Vercel)
```bash
# Deploy admin panel
vercel --prod --cwd apps/admin-panel

# Deploy gym panel
vercel --prod --cwd apps/gym-panel
```

### Backend (AWS EC2)
```bash
# SSH to server
ssh ubuntu@your-server-ip

# Pull latest code
git pull origin main

# Install dependencies
pnpm install

# Build
pnpm --filter backend build

# Restart PM2
pm2 restart bookmyfit-api
```

---

## 📝 Git Workflow

### Branch Naming
- `feature/user-authentication`
- `bugfix/qr-expiry-issue`
- `hotfix/payment-webhook`
- `release/v1.0.0`

### Commit Messages
```
feat: add QR code generation
fix: resolve settlement calculation bug
docs: update API documentation
refactor: optimize gym listing query
test: add unit tests for auth service
```

### Pull Request Process
1. Create feature branch from `develop`
2. Make changes & commit
3. Push to remote
4. Create PR to `develop`
5. Code review
6. Merge to `develop`
7. Deploy to staging
8. Merge `develop` to `main` for production

---

**Document Version**: 1.0  
**Last Updated**: April 17, 2026
