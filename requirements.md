# BookMyFit - Requirements Analysis & Gap Identification

---

## 📋 Document Purpose

This document analyzes the existing LLR (Low-Level Requirements) and identifies:
1. **Gaps** - Missing requirements or unclear specifications
2. **Corrections** - Inconsistencies or errors in the current LLR
3. **Recommendations** - Suggested improvements for implementation

---

## ✅ What's Well-Defined in Current LLR

### Strengths
1. **Subscription Model**: Clear 4-tier structure (Individual, Pro, Max, Elite)
2. **QR System**: Well-specified (JWT, 30-sec expiry, daily lock)
3. **Settlement Engine**: Detailed revenue bucket logic
4. **Gym Tier System**: Clear classification (Standard, Premium, Corporate Exclusive)
5. **Security**: Comprehensive fraud prevention mechanisms
6. **Tech Stack**: Appropriate technology choices

---

## 🚨 Critical Gaps Identified

### 1. **Multi-Panel Architecture Not Explicitly Defined**

**Gap**: LLR mentions "admin panel" and "gym portal" but doesn't clearly separate:
- Admin Panel (Super Admin)
- Gym Partner Panel (Gym Owners)
- Corporate Panel (HR Admins)
- Wellness Partner Panel (if separate)

**Recommendation**:
```
✅ CORRECTED: Define 4 distinct web applications:
1. Admin Panel (Next.js) - Super admin operations
2. Gym Partner Panel (Next.js) - Gym owner/staff operations
3. Corporate Panel (Next.js) - Corporate HR operations
4. Wellness Partner Panel (Next.js) - Wellness service providers

Each panel has its own authentication, role-based access, and feature set.
```

---

### 2. **Corporate Employee Management Ambiguity**

**Gap**: LLR states corporate employees are managed by corporate admin, but also mentions "Admin Panel → Corporate Employees" section.

**Issue**: 
- Should corporate admins manage ONLY their own employees?
- Should super admin see ALL employees across ALL companies?

**Recommendation**:
```
✅ CORRECTED:
- Corporate Panel: HR admin manages ONLY their company's employees
- Admin Panel: Super admin has a "Corporate Employees" section showing 
  ALL employees across ALL corporate accounts (for oversight, analytics)
- Corporate admin CANNOT see other companies' employees
- Super admin CAN see aggregated corporate data
```

---

### 3. **Gym Tier Assignment Logic Unclear**

**Gap**: LLR mentions tier assignment but doesn't specify:
- Can gyms apply for tier upgrade?
- What's the approval workflow?
- Can tier be downgraded?
- What triggers automatic tier changes?

**Recommendation**:
```
✅ CORRECTED:
Tier Assignment Rules:
1. New gyms start at STANDARD tier (default 15% commission)
2. Tier upgrade eligibility:
   - Rating ≥ 4.0 sustained for 90+ days
   - Minimum 100 check-ins in last 30 days
   - No fraud flags in last 6 months
3. Gym can REQUEST upgrade via Gym Panel
4. Admin reviews and APPROVES/REJECTS
5. Tier downgrade:
   - Automatic if rating drops below 3.5 for 30 days
   - Manual by admin for policy violations
6. Corporate Exclusive tier:
   - Only assigned via direct corporate contracts
   - Not available for public upgrade requests
```

---

### 4. **PT (Personal Trainer) Ownership Ambiguity**

**Gap**: LLR states "Gyms own and manage PT profiles" but doesn't clarify:
- Can a PT work at multiple gyms?
- Who sets PT pricing - gym or PT?
- How is PT commission split between gym and trainer?

**Recommendation**:
```
✅ CORRECTED:
PT Model:
1. PT profiles are OWNED by gyms (not independent)
2. One PT can be added to MULTIPLE gyms (if they work at multiple locations)
3. Each gym sets its own pricing for the same PT
4. Commission split:
   - Platform takes 25% (default, configurable)
   - Remaining 75% goes to GYM
   - Gym is responsible for paying the PT (offline arrangement)
5. PT cannot have a direct account on the platform
6. PT ratings are gym-specific (same PT can have different ratings at different gyms)
```

---

### 5. **Wellness Services - Separate Panel or Gym Panel?**

**Gap**: LLR mentions "Wellness Partner" but doesn't specify if they get a separate panel or use Gym Panel.

**Recommendation**:
```
✅ CORRECTED:
Wellness Partner Panel (Separate Next.js App):
- Wellness partners (Yoga studios, Physiotherapy clinics, Dieticians) are 
  SEPARATE entities from gyms
- They get their own panel: wellness.bookmyfit.in
- Features:
  - Service management (add/edit services)
  - Availability calendar
  - Booking management
  - Earnings dashboard
  - Settlement tracking
- Cannot access gym features
- Different commission structure (default 30%)
```

---

### 6. **Store Revenue Distribution Missing**

**Gap**: LLR states "100% platform; no partner share" but doesn't specify:
- Who fulfills orders?
- Shipping/logistics?
- Return/refund policy?

**Recommendation**:
```
✅ CORRECTED:
E-Commerce Store Model:
1. Platform-owned inventory (not marketplace)
2. Admin manages:
   - Product catalog
   - Inventory levels
   - Pricing & discounts
   - Order fulfillment
3. Shipping:
   - Integration with Shiprocket/Delhivery
   - Shipping cost calculated at checkout
   - Tracking number provided
4. Returns:
   - 7-day return policy (configurable)
   - Admin approves refunds
   - Refund to original payment method
5. Revenue: 100% to platform (no gym/partner share)
```

---

### 7. **Subscription Freeze Feature Not in LLR**

**Gap**: Common feature in fitness apps but not mentioned in LLR.

**Recommendation**:
```
✅ ADDED:
Membership Freeze Feature:
1. Users can freeze subscription for 7-30 days (configurable)
2. Freeze quota: 2 times per year (configurable)
3. Subscription end date extends by freeze duration
4. No check-ins allowed during freeze
5. No refund for freeze period
6. Freeze request requires 24-hour advance notice
7. Admin can see freeze analytics (abuse detection)
```

---

### 8. **Refund Policy Not Defined**

**Gap**: LLR doesn't specify refund rules for subscriptions, PT, wellness, or store.

**Recommendation**:
```
✅ ADDED:
Refund Policy:
1. Subscriptions:
   - Full refund if cancelled within 24 hours of purchase (no check-ins)
   - Pro-rated refund if cancelled mid-cycle (admin approval required)
   - No refund after 50% of subscription period elapsed
2. PT Bookings:
   - Full refund if cancelled 24 hours before session
   - 50% refund if cancelled 6-24 hours before
   - No refund if cancelled < 6 hours before
3. Wellness Bookings:
   - Full refund if cancelled 12 hours before (configurable)
   - No refund if cancelled < 12 hours before
4. Store Orders:
   - Full refund if order not shipped
   - Return + refund within 7 days of delivery (product condition check)
   - Shipping cost non-refundable
```

---

### 9. **Gym Capacity Management Missing**

**Gap**: No mention of gym capacity limits or real-time occupancy tracking.

**Recommendation**:
```
✅ ADDED:
Gym Capacity Management:
1. Gym sets maximum capacity (e.g., 50 people)
2. Real-time occupancy counter:
   - Increments on check-in
   - Decrements on check-out (manual or auto after 2 hours)
3. Mobile app shows:
   - "Low crowd" (< 30% capacity) - Green
   - "Moderate crowd" (30-70% capacity) - Yellow
   - "High crowd" (> 70% capacity) - Red
4. Optional: Block check-ins when at 100% capacity
5. Admin can view live capacity across all gyms
6. Implementation: WebSocket for real-time updates
```

---

### 10. **Slot Booking System Not Detailed**

**Gap**: LLR mentions "slot booking" in Phase 4 but doesn't specify how it works.

**Recommendation**:
```
✅ ADDED:
Slot Booking System:
1. Gym creates time slots for classes (e.g., Yoga 6-7 AM, HIIT 7-8 PM)
2. Each slot has:
   - Trainer assigned
   - Max capacity (e.g., 15 people)
   - Duration
   - Category (Yoga, Cardio, etc.)
3. Users can:
   - Browse available slots
   - Book a slot (free, no extra charge)
   - Cancel booking (up to 1 hour before)
4. Check-in:
   - User must check in during slot time window
   - QR scan validates slot booking
5. Gym can:
   - Cancel slot (notify all booked users)
   - Mark slot as completed
6. Admin can:
   - View slot utilization analytics
   - See most popular slot times
```

---

### 11. **Notification System Not Comprehensive**

**Gap**: LLR mentions push notifications but doesn't list all notification types.

**Recommendation**:
```
✅ ADDED:
Complete Notification Matrix:

User Notifications:
1. Subscription purchased (confirmation)
2. Subscription expiring in 7 days (reminder)
3. Subscription expired (alert)
4. Check-in successful (confirmation)
5. Check-in failed (error reason)
6. PT booking confirmed
7. PT booking reminder (1 hour before)
8. Wellness booking confirmed
9. Wellness booking reminder (1 hour before)
10. Order placed (confirmation)
11. Order shipped (tracking link)
12. Order delivered
13. Refund processed
14. New gym added in your area
15. Promotional offers

Gym Notifications:
1. New check-in at your gym
2. New PT booking
3. Settlement released
4. Rating received
5. Tier upgraded/downgraded
6. KYC document pending

Admin Notifications:
1. New gym registration (KYC pending)
2. Fraud alert triggered
3. Settlement approval pending
4. Refund request raised
5. System error alerts
```

---

### 12. **Coupon/Promo Code System Missing**

**Gap**: Not mentioned in LLR but essential for marketing.

**Recommendation**:
```
✅ ADDED:
Coupon Engine:
1. Admin creates coupons with:
   - Code (e.g., FIRST100, NEWYEAR50)
   - Discount type (percentage or flat amount)
   - Discount value
   - Min order value
   - Max discount cap
   - Valid from/to dates
   - Usage limit (total + per user)
   - Applicable to (subscriptions, PT, wellness, store)
2. User applies coupon at checkout
3. Validation:
   - Code exists and active
   - Within validity period
   - User hasn't exceeded usage limit
   - Min order value met
4. Coupon analytics:
   - Total usage
   - Total discount given
   - Revenue impact
```

---

### 13. **Referral System Not Defined**

**Gap**: Mentioned in Phase 4 but no details.

**Recommendation**:
```
✅ ADDED:
Referral System:
1. Each user gets a unique referral code
2. Referrer shares code with friends
3. Referee (new user) applies code at signup
4. Rewards:
   - Referee gets ₹200 off first subscription
   - Referrer gets ₹200 credit after referee's first check-in
5. Credit can be used for:
   - Next subscription purchase
   - PT bookings
   - Store orders
6. Credit validity: 90 days
7. Admin can:
   - Configure reward amounts
   - View referral analytics
   - Detect referral fraud (same device, same IP)
```

---

### 14. **Loyalty Points System Not Defined**

**Gap**: Mentioned in Phase 4 but no details.

**Recommendation**:
```
✅ ADDED:
Loyalty Points System:
1. Points earned:
   - 10 points per check-in
   - 50 points per subscription renewal
   - 20 points per PT session
   - 100 points per referral
2. Points redemption:
   - 100 points = ₹10 discount
   - Min redemption: 500 points
   - Max redemption: 50% of order value
3. Points validity: 1 year from earning date
4. Leaderboard:
   - Monthly top earners
   - Badges (Bronze, Silver, Gold, Platinum)
5. Admin can:
   - Configure points earning rates
   - Manually add/deduct points
   - View points analytics
```

---

### 15. **Gym Search & Filters Not Detailed**

**Gap**: LLR mentions "gym discovery" but doesn't specify search/filter options.

**Recommendation**:
```
✅ ADDED:
Gym Discovery Features:
1. Search:
   - By name
   - By area/locality
   - By city
2. Filters:
   - Category (Yoga, CrossFit, etc.)
   - Amenities (AC, Parking, Pool, etc.)
   - Rating (4+ stars, 3+ stars)
   - Distance (< 1km, < 5km, < 10km)
   - Price range
   - Tier (Standard, Premium, Corporate Exclusive)
   - Open now (based on gym hours)
3. Sort:
   - Distance (nearest first)
   - Rating (highest first)
   - Price (lowest first)
   - Popularity (most check-ins)
4. Map view:
   - Show gyms on map
   - Cluster markers
   - Tap marker to see gym card
```

---

### 16. **Admin Analytics Dashboard Not Detailed**

**Gap**: LLR mentions "analytics" but doesn't specify what metrics to track.

**Recommendation**:
```
✅ ADDED:
Admin Analytics Dashboard:
1. Overview KPIs:
   - Total gyms (active, pending, rejected)
   - Total users (active, inactive)
   - Total subscriptions (active, expired)
   - Total revenue (MTD, YTD)
   - Total check-ins (today, MTD)
2. Revenue Analytics:
   - Revenue by plan type (Individual, Pro, Max, Elite)
   - Revenue by city
   - Revenue trend (daily, weekly, monthly)
   - Commission earned
   - Settlement pending
3. User Analytics:
   - New signups (daily, weekly, monthly)
   - Active users (DAU, MAU)
   - Churn rate
   - Retention rate (30/60/90 day)
   - User demographics (age, gender, city)
4. Gym Analytics:
   - Gyms by city
   - Gyms by tier
   - Average gym rating
   - Top gyms by check-ins
   - Top gyms by revenue
5. Check-in Analytics:
   - Peak hours (hourly heatmap)
   - Peak days (day of week)
   - Average check-ins per user
   - Check-in trend
6. Subscription Analytics:
   - Subscription conversion rate
   - Average subscription value
   - Subscription renewal rate
   - Plan distribution (pie chart)
7. Fraud Analytics:
   - Fraud alerts (count, type)
   - Blocked users
   - Suspicious patterns
```

---

### 17. **Data Export Functionality Missing**

**Gap**: No mention of CSV/Excel export for reports.

**Recommendation**:
```
✅ ADDED:
Data Export Features:
1. Admin Panel:
   - Export gym list (CSV)
   - Export user list (CSV)
   - Export subscriptions (CSV)
   - Export check-ins (CSV, date range filter)
   - Export settlements (CSV, month filter)
   - Export orders (CSV)
2. Gym Panel:
   - Export check-ins (CSV)
   - Export members (CSV)
   - Export earnings (CSV)
3. Corporate Panel:
   - Export employees (CSV)
   - Export usage report (CSV)
4. Format: CSV (Excel-compatible)
5. Include filters applied in export filename
```

---

### 18. **User Profile Completion Missing**

**Gap**: LLR doesn't specify what user profile fields are required/optional.

**Recommendation**:
```
✅ ADDED:
User Profile Fields:
1. Required (at signup):
   - Phone number (verified via OTP)
   - Name
2. Optional (can complete later):
   - Email
   - Date of birth
   - Gender
   - Profile photo
   - Emergency contact
   - Medical conditions (for gym safety)
   - Fitness goals (for recommendations)
3. Auto-captured:
   - Device ID
   - Registration date
   - Last active date
4. Profile completion incentive:
   - 50 loyalty points for 100% profile completion
5. Admin can:
   - View incomplete profiles
   - Send reminder notifications
```

---

### 19. **Gym Onboarding Flow Not Clear**

**Gap**: LLR mentions KYC but doesn't detail the full onboarding flow.

**Recommendation**:
```
✅ ADDED:
Gym Onboarding Flow:
1. Gym owner visits gym.bookmyfit.in
2. Clicks "Register as Partner"
3. Fills registration form:
   - Gym name
   - Owner name
   - Phone number (OTP verification)
   - Email
   - City & area
   - Address
4. Uploads KYC documents:
   - Business registration certificate
   - GST certificate
   - Owner ID proof (Aadhaar/PAN)
   - Bank account details (for settlements)
   - Gym photos (min 3)
5. Submits application
6. Status: "Pending Review"
7. Admin reviews:
   - Verifies documents
   - Checks gym location (Google Maps)
   - Assigns tier (default: Standard)
   - Sets commission rate (default: 15%)
8. Admin approves/rejects:
   - If approved: Gym status = "Active", email sent with login credentials
   - If rejected: Email sent with rejection reason
9. Gym owner logs in:
   - Completes profile (amenities, categories, hours, pricing)
   - Goes live on platform
```

---

### 20. **Settlement Dispute Resolution Missing**

**Gap**: No process for handling settlement disputes.

**Recommendation**:
```
✅ ADDED:
Settlement Dispute Resolution:
1. Gym can raise dispute:
   - From Settlement Dashboard
   - Select month
   - Provide reason (text + attachments)
2. Dispute statuses:
   - Open (admin notified)
   - Under Review (admin investigating)
   - Resolved (admin provides explanation)
   - Escalated (requires manual intervention)
3. Admin actions:
   - View dispute details
   - Recalculate settlement (if error found)
   - Add notes
   - Close dispute
4. Dispute SLA: 7 business days
5. Audit trail:
   - All dispute actions logged
   - Timestamps + actor ID
```

---

## 🔧 Technical Corrections

### 1. **QR Token Structure**

**Current LLR**: "JWT with HMAC-SHA256"

**Correction**:
```
✅ CORRECTED:
QR Token Structure (JWT):
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "user_id": "uuid",
    "subscription_id": "uuid",
    "timestamp": 1713345600,
    "exp": 1713345630,  // 30 seconds from timestamp
    "jti": "unique_token_id"  // for idempotency
  },
  "signature": "HMAC-SHA256(header + payload, secret)"
}

Validation Rules:
1. Verify signature
2. Check expiry (exp < current_time)
3. Check if token already used (Redis: jti key exists)
4. Check daily lock (Redis: user_id:date key exists)
5. Validate subscription is active
6. Validate gym is in subscription's allowed gyms
```

---

### 2. **Redis Key Structure**

**Current LLR**: "userId:date key"

**Correction**:
```
✅ CORRECTED:
Redis Key Patterns:
1. Daily Lock: `checkin:daily:${userId}:${YYYY-MM-DD}`
   - Value: gym_id
   - TTL: 24 hours
2. QR Idempotency: `qr:used:${jti}`
   - Value: 1
   - TTL: 60 seconds
3. Session: `session:${userId}`
   - Value: JWT refresh token
   - TTL: 7 days
4. Rate Limit: `ratelimit:${userId}:${endpoint}`
   - Value: request count
   - TTL: 1 minute
5. Gym Capacity: `capacity:${gymId}`
   - Value: current count
   - TTL: none (persistent, reset manually)
```

---

### 3. **Database Indexing Strategy**

**Gap**: LLR doesn't mention database indexes.

**Recommendation**:
```
✅ ADDED:
Critical Indexes:
1. users:
   - phone (unique)
   - email (unique, nullable)
   - device_id
2. gyms:
   - city, area (composite)
   - tier
   - status
   - rating
3. subscriptions:
   - user_id, status (composite)
   - end_date (for expiry queries)
4. checkins:
   - user_id, checkin_time (composite)
   - gym_id, checkin_time (composite)
   - qr_token (unique)
5. settlements:
   - gym_id, month (composite)
   - status
6. Full-text search:
   - gyms.name (GIN index for ILIKE queries)
```

---

### 4. **API Rate Limiting**

**Gap**: Not mentioned in LLR.

**Recommendation**:
```
✅ ADDED:
Rate Limiting Rules:
1. Authentication endpoints:
   - Send OTP: 3 requests per phone per hour
   - Verify OTP: 5 attempts per phone per 10 minutes
2. QR generation:
   - 10 requests per user per minute
3. Check-in validation:
   - 5 requests per user per minute (prevents spam)
4. Search/listing:
   - 60 requests per user per minute
5. Admin APIs:
   - 300 requests per admin per minute
6. Implementation: Redis + express-rate-limit
```

---

### 5. **Error Handling & Logging**

**Gap**: Not mentioned in LLR.

**Recommendation**:
```
✅ ADDED:
Error Handling Strategy:
1. API Error Responses:
   {
     "success": false,
     "error": {
       "code": "ERR_QR_EXPIRED",
       "message": "QR code has expired. Please generate a new one.",
       "details": {}
     }
   }
2. Error Codes:
   - ERR_QR_EXPIRED
   - ERR_QR_ALREADY_USED
   - ERR_DAILY_LIMIT_REACHED
   - ERR_NO_ACTIVE_SUBSCRIPTION
   - ERR_PLAN_MISMATCH
   - ERR_GYM_NOT_FOUND
   - ERR_PAYMENT_FAILED
   - ERR_INSUFFICIENT_BALANCE
3. Logging:
   - All API requests (request ID, user ID, endpoint, timestamp)
   - All errors (stack trace, context)
   - All check-ins (user, gym, time, status)
   - All payments (order ID, amount, status)
   - All settlements (gym, month, amount, status)
4. Tools: Winston (logging) + Sentry (error tracking)
```

---

## 📊 Recommended Additions

### 1. **Gym Performance Dashboard**

**New Feature**: Gym Panel should have performance insights.

```
Gym Performance Dashboard:
1. Check-in Trends:
   - Daily/weekly/monthly chart
   - Peak hours heatmap
   - Day-of-week distribution
2. Member Insights:
   - Total active members
   - New members this month
   - Churn rate
   - Average visits per member
3. Revenue Insights:
   - Total earnings (after commission)
   - Earnings trend
   - PT revenue
   - Projected next month earnings
4. Rating Insights:
   - Average rating
   - Recent reviews
   - Rating trend
   - Comparison with city average
5. Tier Progress:
   - Current tier
   - Requirements for next tier
   - Progress bars
```

---

### 2. **User Fitness Dashboard**

**New Feature**: User app should have fitness tracking.

```
User Fitness Dashboard:
1. Activity Summary:
   - Total check-ins this month
   - Streak (consecutive days)
   - Calories burned (estimated)
   - Active minutes
2. Goals:
   - Set monthly check-in goal
   - Progress bar
   - Motivational messages
3. Achievements:
   - Badges (First check-in, 10 check-ins, 30-day streak, etc.)
   - Loyalty tier (Bronze, Silver, Gold, Platinum)
4. Insights:
   - Most visited gym
   - Favorite workout time
   - Gyms visited (map view)
```

---

### 3. **Admin Fraud Detection Rules**

**Enhancement**: More specific fraud detection rules.

```
Fraud Detection Rules:
1. Suspicious Patterns:
   - Same QR scanned at multiple gyms within 1 hour
   - Device ID mismatch (user logged in from new device)
   - Check-in velocity (> 5 check-ins in 1 day)
   - Subscription purchased from multiple devices
2. Auto-Actions:
   - Flag user account (admin review required)
   - Send notification to admin
   - Block check-ins temporarily
3. Admin Actions:
   - View flagged accounts
   - Investigate activity log
   - Suspend/unsuspend account
   - Add to whitelist (false positive)
```

---

## 🎯 Priority Recommendations

### High Priority (Must Implement)
1. ✅ Multi-panel architecture clarity
2. ✅ Corporate employee management separation
3. ✅ Gym tier assignment workflow
4. ✅ PT ownership model
5. ✅ Refund policy
6. ✅ Notification system
7. ✅ Data export functionality
8. ✅ Error handling & logging

### Medium Priority (Should Implement)
1. ✅ Gym capacity management
2. ✅ Slot booking system
3. ✅ Coupon engine
4. ✅ Referral system
5. ✅ Loyalty points
6. ✅ Settlement dispute resolution
7. ✅ Gym performance dashboard

### Low Priority (Nice to Have)
1. ✅ User fitness dashboard
2. ✅ Advanced fraud detection
3. ✅ Membership freeze
4. ✅ AI recommendations (Phase 4)

---

## 📝 Summary of Changes

### Gaps Filled: 20
### Corrections Made: 5
### New Features Added: 10
### Total Improvements: 35

---

## ✅ Final Checklist

Before starting development, ensure:

- [ ] All 4 panels clearly defined (Admin, Gym, Corporate, Wellness)
- [ ] Corporate employee management logic finalized
- [ ] Gym tier assignment workflow documented
- [ ] PT ownership model clarified
- [ ] Refund policy approved by stakeholders
- [ ] Complete notification matrix reviewed
- [ ] Data export formats confirmed
- [ ] Error codes standardized
- [ ] Redis key patterns documented
- [ ] Database indexes planned
- [ ] Rate limiting rules configured
- [ ] Fraud detection rules approved
- [ ] Settlement dispute process agreed
- [ ] Gym onboarding flow tested
- [ ] User profile fields finalized

---

**Document Version**: 1.0  
**Last Updated**: April 17, 2026  
**Status**: Ready for Review  
**Next Step**: Stakeholder approval before development kickoff
