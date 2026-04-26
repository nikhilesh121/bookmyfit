# BookMyFit - Complete Development Plan
## Expo (React Native) + Next.js Multi-Panel Platform

---

## 📋 Executive Summary

**Project**: BookMyFit - Fitness Subscription Marketplace  
**Tech Stack**: 
- **Mobile App**: Expo (React Native) for iOS & Android
- **Admin Panel**: Next.js + shadcn/ui + TailwindCSS
- **Gym Partner Panel**: Next.js + shadcn/ui
- **Corporate Panel**: Next.js + shadcn/ui
- **Backend**: Node.js + NestJS + PostgreSQL + Redis
- **Timeline**: 32 weeks (8 months)
- **Team Size**: 9-10 members

---

## 🎯 Project Overview

BookMyFit is a comprehensive fitness marketplace platform with **4 distinct applications**:

1. **User Mobile App** (Expo/React Native) - Subscription purchase, QR check-in, gym discovery
2. **Admin Web Panel** (Next.js) - Platform management, settlements, analytics
3. **Gym Partner Web Panel** (Next.js) - Profile management, check-in scanner, earnings
4. **Corporate Web Panel** (Next.js) - Employee management, seat allocation, usage tracking

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  Mobile App (Expo)    │  Admin Panel (Next.js)              │
│  - User flows         │  - Super admin dashboard            │
│  - QR check-in        │  - Gym approvals & KYC              │
│  - Subscriptions      │  - Settlement engine                │
│  - Store & Videos     │  - Analytics & reports              │
├───────────────────────┼─────────────────────────────────────┤
│  Gym Panel (Next.js)  │  Corporate Panel (Next.js)          │
│  - QR scanner         │  - Employee management              │
│  - Profile mgmt       │  - Seat allocation                  │
│  - Earnings tracking  │  - Usage analytics                  │
└─────────────────────────────────────────────────────────────┘
                            ↓ REST APIs
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND LAYER (NestJS)                  │
├─────────────────────────────────────────────────────────────┤
│  Auth Module  │  Subscription Module  │  Check-in Module    │
│  User Module  │  Settlement Module    │  QR Module          │
│  Gym Module   │  Payment Module       │  Rating Module      │
│  Store Module │  Corporate Module     │  Wellness Module    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     DATA LAYER                              │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL (Primary)  │  Redis (Cache/Sessions)            │
│  AWS S3 (Files)        │  Razorpay (Payments)               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📱 Application Breakdown

### 1. **User Mobile App** (Expo/React Native)

**Purpose**: End-user fitness subscription and gym access platform

**Key Features**:
- Onboarding & Authentication (Phone OTP)
- Gym Discovery (location-based, category filters)
- Subscription Plans (Individual Gym, Pro, Max, Elite)
- Dynamic QR Code Generation (30-sec expiry, JWT-based)
- Check-in History & Visit Tracking
- PT Booking & Wellness Services
- E-commerce Store (supplements, accessories)
- Workout Videos (free + premium)
- Profile & Notifications

**Tech Stack**:
```json
{
  "framework": "Expo SDK 50+",
  "language": "TypeScript",
  "navigation": "React Navigation v6",
  "state": "Redux Toolkit + RTK Query",
  "ui": "NativeWind (TailwindCSS) + Custom Glassmorphism",
  "auth": "JWT + Refresh Token",
  "payments": "Razorpay SDK",
  "notifications": "Firebase Cloud Messaging"
}
```

**Screens** (28 total):
1. Splash Screen
2. Onboarding (3 slides)
3. Login (Phone)
4. OTP Verification
5. Home Dashboard
6. Gym Listing
7. Gym Detail
8. Plan Selection
9. Duration Selection
10. Order Summary
11. Payment Success
12. My Subscriptions
13. QR Code Generator
14. Check-in Result
15. Visit History
16. Store (Product Grid)
17. Product Detail
18. Cart
19. Checkout
20. Order History
21. Workout Videos
22. Video Player
23. Profile
24. Edit Profile
25. Notifications
26. Rate & Review
27. PT Booking
28. Wellness Booking

---

### 2. **Admin Web Panel** (Next.js)

**Purpose**: Super admin platform management and operations

**Key Features**:
- Dashboard with KPIs (gyms, users, revenue, bookings)
- Gym Management (approve/reject, KYC verification, tier assignment)
- User Management (view, suspend, refunds)
- Subscription Management (view all active/expired)
- Corporate Account Management (create, seat allocation)
- Corporate Employee Management (view all employees across companies)
- Booking Management (view all check-ins, fraud detection)
- Settlement Engine (calculate, approve, release payments)
- Commission Configuration (per-gym, per-tier)
- Homepage Builder (drag-drop sections, banners)
- Store Management (products, orders, inventory)
- Category & Amenity Management
- Push Notifications (manual broadcast)
- Analytics & Reports
- System Settings

**Tech Stack**:
```json
{
  "framework": "Next.js 14 (App Router)",
  "language": "TypeScript",
  "ui": "shadcn/ui + TailwindCSS + Radix UI",
  "charts": "Recharts / Chart.js",
  "tables": "TanStack Table",
  "forms": "React Hook Form + Zod",
  "state": "Zustand / React Query",
  "auth": "NextAuth.js"
}
```

**Pages** (20+ modules):
1. Dashboard (Overview)
2. Analytics (Revenue, trends, peak hours)
3. Gym Management (List, Pending, Approved, Rejected)
4. Gym Detail & KYC Review
5. User Management
6. Subscription Management
7. Corporate Accounts
8. Corporate Employees (Consolidated view)
9. Bookings & Check-ins
10. Settlement Dashboard
11. Settlement History
12. Commission Engine
13. Homepage Builder
14. Store Products
15. Store Orders
16. Categories Management
17. Amenities Management
18. Push Notifications
19. Fraud Monitoring
20. Settings

---

### 3. **Gym Partner Web Panel** (Next.js)

**Purpose**: Gym owner/manager operations and earnings tracking

**Key Features**:
- Dashboard (today's check-ins, revenue, members)
- QR Check-in Scanner (camera-based, validation)
- Session Management (add/edit gym sessions, classes)
- Member Management (view active members)
- Gym Profile Management (photos, amenities, hours)
- Subscription Plans (view, cannot edit pricing)
- Trainer Management (PT profiles, pricing, availability)
- Amenities Configuration
- Settlement Dashboard (earnings, pending, history)
- Reports (weekly/monthly check-ins, revenue)

**Tech Stack**:
```json
{
  "framework": "Next.js 14 (App Router)",
  "language": "TypeScript",
  "ui": "shadcn/ui + TailwindCSS",
  "scanner": "react-qr-reader / html5-qrcode",
  "charts": "Recharts",
  "auth": "NextAuth.js"
}
```

**Pages** (12 modules):
1. Dashboard
2. QR Check-in Scanner
3. Sessions Management
4. Members List
5. Gym Profile
6. Photos & Media
7. Subscription Plans (view-only)
8. Trainers (PT) Management
9. Amenities
10. Settlement Dashboard
11. Reports
12. Settings

---

### 4. **Corporate Web Panel** (Next.js)

**Purpose**: HR/Admin management of corporate fitness benefits

**Key Features**:
- Dashboard (seat utilization, active employees, check-ins)
- Employee Management (list, search, filter by department)
- Bulk Seat Assignment (assign Max plan to multiple employees)
- Add Employee & Assign (single employee onboarding)
- Usage Reports (department-wise, employee-wise)
- Billing & Invoices (view subscription, download invoices)
- Settings (company profile, billing contact)

**Tech Stack**:
```json
{
  "framework": "Next.js 14 (App Router)",
  "language": "TypeScript",
  "ui": "shadcn/ui + TailwindCSS",
  "charts": "Recharts",
  "auth": "NextAuth.js"
}
```

**Pages** (7 modules):
1. Dashboard
2. Employees Management
3. Assign Plans (Bulk + Individual)
4. Usage Reports
5. Billing & Invoices
6. Settings
7. Department Analytics

---

## 🗂️ Database Schema (PostgreSQL)

### Core Tables

```sql
-- Users
users (id, phone, email, name, dob, gender, device_id, created_at)

-- Gyms
gyms (id, name, city, area, address, lat, lng, tier, rating, status, commission_rate, created_at)
gym_photos (id, gym_id, url, is_cover)
gym_amenities (id, gym_id, amenity_id)
gym_categories (id, gym_id, category_id)
gym_hours (id, gym_id, day, open_time, close_time)

-- Subscriptions
subscriptions (id, user_id, plan_type, duration_months, start_date, end_date, status, amount_paid)
subscription_gyms (id, subscription_id, gym_id) -- for Individual Gym plan

-- Check-ins
checkins (id, user_id, gym_id, subscription_id, checkin_time, qr_token, status)

-- Corporate
corporate_accounts (id, company_name, email, plan_type, total_seats, created_at)
corporate_employees (id, corporate_id, user_id, department, assigned_date, status)

-- Trainers
trainers (id, gym_id, name, specialization, price_per_session, rating)
trainer_bookings (id, user_id, trainer_id, session_date, status, amount)

-- Wellness
wellness_partners (id, name, service_type, price, commission_rate)
wellness_bookings (id, user_id, partner_id, booking_date, status, amount)

-- Store
products (id, name, category, price, stock, images)
orders (id, user_id, total_amount, status, created_at)
order_items (id, order_id, product_id, quantity, price)

-- Settlements
settlements (id, gym_id, month, total_revenue, commission, net_payout, status, paid_date)

-- Master Data
categories (id, name, icon)
amenities (id, name, icon)

-- Ratings
ratings (id, user_id, gym_id, trainer_id, stars, review_text, status, created_at)
```

---

## 🔐 Authentication & Authorization

### User Mobile App
- **Phone OTP** authentication
- JWT access token (15 min expiry)
- Refresh token (7 days, stored securely)
- Device binding (device_id tracked)

### Web Panels
- **Email + Password** for Admin/Gym/Corporate
- NextAuth.js with JWT strategy
- Role-based access control (RBAC)
- Session management

### Roles
```typescript
enum UserRole {
  SUPER_ADMIN = 'super_admin',
  GYM_OWNER = 'gym_owner',
  GYM_STAFF = 'gym_staff',
  CORPORATE_ADMIN = 'corporate_admin',
  WELLNESS_PARTNER = 'wellness_partner',
  END_USER = 'end_user'
}
```

---

## 💳 Payment Integration (Razorpay)

### Payment Flows

1. **Subscription Purchase** (User App)
   - Create Razorpay order
   - User completes payment
   - Webhook confirms payment
   - Subscription activated

2. **PT/Wellness Booking**
   - Upfront payment required
   - Commission deducted
   - Remainder to gym/partner settlement bucket

3. **Store Orders**
   - Full payment to platform
   - No partner revenue share

4. **Corporate Subscriptions**
   - Annual/monthly billing
   - Invoice generation
   - Bulk seat payment

---

## 🎨 Design System

### Mobile App (Expo)
- **Theme**: Dark mode with neon green accents (#3DFF54)
- **Typography**: Playfair Display (headings) + DM Sans (body)
- **Components**: Glassmorphism cards, gradient overlays
- **Animations**: Smooth transitions, micro-interactions
- **Icons**: Lucide React Native

### Web Panels (Next.js)
- **Theme**: Light mode (creamy iOS) + Dark mode toggle
- **Typography**: Poppins (all weights)
- **Components**: shadcn/ui (Radix primitives)
- **Colors**: Pastel accents, neomorphism shadows
- **Icons**: Lucide React

---

## 📅 Development Timeline (32 Weeks)

### **Phase 1: MVP Foundation** (10 weeks)

#### Week 1-2: Project Setup & Infrastructure
- [ ] Initialize Expo project with TypeScript
- [ ] Setup Next.js projects (Admin, Gym, Corporate)
- [ ] Configure NestJS backend with modules
- [ ] Setup PostgreSQL + Redis
- [ ] Configure AWS S3 for file storage
- [ ] Setup CI/CD pipeline (GitHub Actions + EAS)
- [ ] Design system implementation (Figma → Code)

#### Week 3-4: Authentication & User Management
- [ ] Backend: Auth module (JWT, OTP, refresh tokens)
- [ ] Mobile: Login, OTP, onboarding screens
- [ ] Web: Admin/Gym/Corporate login pages
- [ ] User CRUD APIs
- [ ] Device binding implementation

#### Week 5-6: Gym Management (Admin)
- [ ] Backend: Gym CRUD, KYC, tier assignment
- [ ] Admin: Gym listing, detail, approval workflow
- [ ] Admin: KYC document upload & review
- [ ] Mobile: Gym discovery, listing, detail screens

#### Week 7-8: Subscription Engine
- [ ] Backend: Subscription plans, purchase, activation
- [ ] Backend: Razorpay integration
- [ ] Mobile: Plan selection, duration, order summary, payment
- [ ] Mobile: My Subscriptions screen
- [ ] Admin: Subscription management page

#### Week 9-10: QR Check-in System
- [ ] Backend: Dynamic QR generation (JWT, 30-sec expiry)
- [ ] Backend: Check-in validation, daily lock (Redis)
- [ ] Mobile: QR code generator screen
- [ ] Mobile: Check-in result screen
- [ ] Gym Panel: QR scanner implementation
- [ ] Admin: Check-in logs & monitoring

**Milestone**: MVP launch - Individual gym subscriptions + QR check-in working

---

### **Phase 2: Multi-Gym Platform** (8 weeks)

#### Week 11-12: Pro & Max Plans
- [ ] Backend: Multi-gym subscription logic
- [ ] Backend: Visit tracking & limits
- [ ] Mobile: Pro/Max plan flows
- [ ] Admin: Multi-gym subscription management

#### Week 13-14: Elite Plan & Settlement Engine
- [ ] Backend: Elite pool revenue distribution
- [ ] Backend: Pro pool weighted distribution
- [ ] Backend: Settlement calculation cron job
- [ ] Admin: Settlement dashboard
- [ ] Admin: Commission configuration
- [ ] Gym Panel: Earnings dashboard

#### Week 15-16: Gym Tier System
- [ ] Backend: Tier classification logic
- [ ] Backend: Tier-based commission rates
- [ ] Admin: Tier assignment & management
- [ ] Mobile: Tier badges on gym cards

#### Week 17-18: Rating & Review + Fraud Prevention
- [ ] Backend: Rating submission & moderation
- [ ] Backend: Duplicate scan detection
- [ ] Backend: Suspicious activity flagging
- [ ] Mobile: Rate & Review screen
- [ ] Admin: Rating moderation page
- [ ] Admin: Fraud monitoring dashboard

**Milestone**: Multi-gym platform live with settlement engine

---

### **Phase 3: Full Marketplace** (8 weeks)

#### Week 19-20: PT Add-On Module
- [ ] Backend: PT profile, booking, commission
- [ ] Gym Panel: PT management page
- [ ] Mobile: PT selection in subscription flow
- [ ] Mobile: PT booking standalone page
- [ ] Admin: PT oversight & settlement

#### Week 21-22: Wellness Services
- [ ] Backend: Wellness partner registration, KYC
- [ ] Backend: Wellness booking & settlement
- [ ] Wellness Panel: Service management (Next.js)
- [ ] Mobile: Wellness discovery & booking
- [ ] Admin: Wellness partner management

#### Week 23-24: Corporate Subscriptions
- [ ] Backend: Corporate account creation
- [ ] Backend: Bulk seat assignment
- [ ] Corporate Panel: All pages (Next.js)
- [ ] Admin: Corporate management pages
- [ ] Mobile: Corporate employee onboarding flow

#### Week 25-26: E-Commerce Store + Workout Videos
- [ ] Backend: Product CRUD, orders, inventory
- [ ] Backend: Video upload, access control
- [ ] Admin: Store management pages
- [ ] Admin: Video management page
- [ ] Mobile: Store tab (grid, detail, cart, checkout)
- [ ] Mobile: Workout Videos screen + player

**Milestone**: Full marketplace with PT, wellness, corporate, store, videos

---

### **Phase 4: Growth & Scale** (6 weeks)

#### Week 27-28: Analytics & Advanced Features
- [ ] Backend: Analytics APIs (peak hours, churn, trends)
- [ ] Admin: Analytics dashboard (charts, reports)
- [ ] Backend: Gym capacity live counter (WebSocket)
- [ ] Backend: Slot booking system
- [ ] Mobile: Slot booking UI

#### Week 29-30: Retention & Engagement
- [ ] Backend: Membership freeze feature
- [ ] Backend: Referral system
- [ ] Backend: Loyalty points system
- [ ] Mobile: Referral & rewards screens
- [ ] Admin: Referral & loyalty management

#### Week 31-32: Optimization & Launch Prep
- [ ] Performance: Redis caching for gym listings
- [ ] Performance: Database query optimization
- [ ] Load testing (k6) - 10,000 concurrent users
- [ ] Penetration testing (auth, QR, API security)
- [ ] App Store + Play Store submission
- [ ] GDPR compliance audit
- [ ] GST invoice generation
- [ ] Final QA & bug fixes

**Milestone**: Production-ready platform, App Store live

---

## 👥 Team Structure

| Role | Count | Responsibilities |
|------|-------|------------------|
| **React Native Developer** | 2 | Mobile app (all 28 screens), Redux, navigation, QR generation |
| **Next.js Developer** | 2 | Admin panel, Gym panel, Corporate panel, Wellness panel |
| **NestJS Backend Developer** | 2 | All APIs, business logic, settlement engine, QR validation |
| **UI/UX Designer** | 1 | Figma designs, glassmorphism theme, all 4 applications |
| **DevOps Engineer** | 1 | AWS infra, CI/CD, Redis, PostgreSQL, monitoring (Sentry, Datadog) |
| **QA Engineer** | 1 | Manual + automated testing, QR system, payment flows |
| **Product Manager** | 1 | Sprint planning, stakeholder communication, feature prioritization |

**Total**: 10 members

---

## 🛠️ Technology Stack (Detailed)

### Mobile App (Expo)
```json
{
  "expo": "~50.0.0",
  "react-native": "0.73.x",
  "typescript": "^5.3.0",
  "react-navigation": "^6.1.0",
  "@reduxjs/toolkit": "^2.0.0",
  "react-redux": "^9.0.0",
  "nativewind": "^4.0.0",
  "react-native-qrcode-svg": "^6.2.0",
  "react-native-camera": "^4.2.0",
  "expo-secure-store": "^12.8.0",
  "razorpay-react-native": "^2.3.0",
  "@react-native-firebase/messaging": "^19.0.0",
  "react-native-video": "^6.0.0",
  "lottie-react-native": "^6.5.0"
}
```

### Admin/Gym/Corporate Panels (Next.js)
```json
{
  "next": "14.1.0",
  "react": "^18.2.0",
  "typescript": "^5.3.0",
  "tailwindcss": "^3.4.0",
  "shadcn/ui": "latest",
  "@radix-ui/react-*": "latest",
  "next-auth": "^5.0.0",
  "zustand": "^4.5.0",
  "@tanstack/react-query": "^5.17.0",
  "@tanstack/react-table": "^8.11.0",
  "react-hook-form": "^7.49.0",
  "zod": "^3.22.0",
  "recharts": "^2.10.0",
  "html5-qrcode": "^2.3.8",
  "lucide-react": "^0.312.0"
}
```

### Backend (NestJS)
```json
{
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
```

### DevOps & Infrastructure
- **Hosting**: AWS EC2 / Vercel (Next.js) / EAS (Expo)
- **Database**: AWS RDS (PostgreSQL 15)
- **Cache**: AWS ElastiCache (Redis 7)
- **Storage**: AWS S3
- **CDN**: CloudFront
- **Monitoring**: Sentry + Datadog
- **CI/CD**: GitHub Actions + EAS Build

---

## 🔒 Security Considerations

1. **QR Security**
   - JWT with HMAC-SHA256
   - 30-second expiry
   - Idempotency key prevents reuse
   - Device fingerprint validation

2. **API Security**
   - Rate limiting (Redis)
   - CORS configuration
   - Input validation (class-validator)
   - SQL injection prevention (TypeORM)

3. **Payment Security**
   - PCI DSS compliance via Razorpay
   - Webhook signature verification
   - No card data stored

4. **Data Privacy**
   - GDPR compliance
   - Data encryption at rest
   - Secure password hashing (bcrypt)
   - Audit logs for sensitive operations

---

## 📊 Success Metrics

### Technical KPIs
- QR validation < 2 seconds
- API response time < 500ms (p95)
- 99.5% uptime SLA
- Support 100,000+ active users
- 10,000+ daily check-ins

### Business KPIs
- Gym onboarding rate
- User retention (30/60/90 day)
- Subscription conversion rate
- Average revenue per user (ARPU)
- Corporate account growth

---

## 🚀 Deployment Strategy

### Mobile App
1. **Development**: Expo Go for testing
2. **Staging**: EAS Build → TestFlight (iOS) + Internal Testing (Android)
3. **Production**: App Store + Google Play Store

### Web Panels
1. **Development**: Local (localhost:3000)
2. **Staging**: Vercel preview deployments
3. **Production**: Vercel production (admin.bookmyfit.in, gym.bookmyfit.in, corporate.bookmyfit.in)

### Backend
1. **Development**: Local (localhost:3001)
2. **Staging**: AWS EC2 (staging.api.bookmyfit.in)
3. **Production**: AWS EC2 + Load Balancer (api.bookmyfit.in)

---

## 📝 Next Steps

1. **Immediate Actions**:
   - [ ] Finalize Figma designs for all 4 applications
   - [ ] Setup GitHub repositories (monorepo vs multi-repo decision)
   - [ ] Provision AWS infrastructure
   - [ ] Create project management board (Jira/Linear)
   - [ ] Onboard development team

2. **Week 1 Deliverables**:
   - [ ] Expo project initialized with navigation
   - [ ] Next.js projects setup (Admin, Gym, Corporate)
   - [ ] NestJS backend with auth module
   - [ ] PostgreSQL schema created
   - [ ] Design system components library

---

## 🎯 Critical Success Factors

1. **QR System Reliability**: Must work flawlessly (fraud prevention is key)
2. **Settlement Accuracy**: Zero errors in revenue distribution
3. **Mobile Performance**: Smooth 60fps animations, fast load times
4. **Admin UX**: Intuitive gym approval & settlement workflows
5. **Payment Integration**: Robust Razorpay webhook handling
6. **Scalability**: Architecture must support 10x growth

---

## 📞 Support & Maintenance

- **Bug Fixes**: 24-hour SLA for critical issues
- **Feature Requests**: Monthly release cycle
- **Monitoring**: 24/7 Sentry alerts + Datadog dashboards
- **Backups**: Daily PostgreSQL backups (7-day retention)
- **Updates**: Expo SDK updates quarterly, Next.js updates bi-annually

---

**Document Version**: 1.0  
**Last Updated**: April 17, 2026  
**Prepared By**: Development Team  
**Status**: Ready for Implementation
