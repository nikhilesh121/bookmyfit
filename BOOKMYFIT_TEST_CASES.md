# BookMyFit Master Test Cases

Generated from the current repository code and project docs.

Latest local execution status is tracked in `BOOKMYFIT_TEST_EXECUTION_REPORT.md`.

Source areas reviewed:
- `backend/src/modules`, `backend/src/database/entities`, `backend/src/database/migrations`, `backend/test`
- `apps/mobile/app`, `apps/mobile/lib`
- `apps/gym-panel/app`, `apps/gym-panel/lib`
- `apps/admin-panel/app`, `apps/wellness-portal/app`, `apps/corporate-panel/app`, `apps/landing/app`
- `README.md`, `README.local.md`, `requirements.md`, `plan.md`, `PROJECT_STRUCTURE.md`, `LIVE_DEPLOYMENT_WORKFLOW.md`, `NIKHILESH_BOOKMYFIT_ERROR_REPORT.md`

## Legend

| Priority | Meaning |
|---|---|
| P0 | Revenue, access, privacy, security, payment, or production-critical |
| P1 | Core business flow or major UX behavior |
| P2 | Secondary, export, polish, history, or operational edge case |

| Type | Meaning |
|---|---|
| API | Backend endpoint / service behavior |
| UI | Web or mobile user interface |
| E2E | Multi-system end-to-end journey |
| SEC | Security, permissions, privacy, fraud prevention |
| DATA | Database, migration, seed, persistence, reporting |
| BUILD | Build, deploy, APK, environment |

## Test Environments

| Environment | Base URLs / Notes |
|---|---|
| Local API | `http://localhost:3003/api/v1` |
| Local Admin | `http://localhost:3000` |
| Local Gym | `http://localhost:3001` |
| Local Corporate | `http://localhost:3002` |
| Local Landing | `http://localhost:3008` or configured Next port |
| Mobile Dev | Expo / Android APK with configurable `EXPO_PUBLIC_API_URL` |
| Live API | `https://bookmyfit.in/api/v1` |
| Live Web | `https://bookmyfit.in`, `https://admin.bookmyfit.in`, `https://gym.bookmyfit.in` |

## Baseline Test Data

Create or verify these records before full regression:
- Super admin user.
- At least two active gyms with approved KYC, valid non-zero lat/lng, operating hours, amenities, photos, and plans.
- One pending gym with missing KYC/location.
- One suspended/deactivated gym.
- One gym with no active same-gym plan.
- One gym with 1, 3, 6, and 12 month plans plus sale price.
- At least one monthly trainer per gym.
- At least one active multi-gym plan configured by admin.
- Wellness partner with active and pending services.
- Store product with stock and one out-of-stock product.
- Corporate account with available seats and employees.
- End user with no subscription, one with same-gym subscription, one with multi-gym subscription, and one expired subscription.

## Business Rule Acceptance Tests

| ID | Priority | Type | Scenario | Steps | Expected Result |
|---|---:|---|---|---|---|
| BR-001 | P0 | E2E | Same-gym plans are gym-owned | Login as gym owner, create a 1-month same-gym plan, open mobile gym plan screen | Plan appears only for that gym and is priced from gym plan data |
| BR-002 | P0 | E2E | Multi-gym plans are admin-owned | Update multi-gym price/config from admin, open mobile multi-gym plan | Mobile uses admin config, not gym plan data |
| BR-003 | P0 | API | Same-gym duplicate subscription blocked | Buy active same-gym pass for gym A, attempt same-gym purchase for gym A again before expiry | Backend rejects duplicate or cancels pending duplicate safely |
| BR-004 | P0 | API | Same-gym subscription restricted to selected gym | Same-gym user for gym A attempts booking/check-in at gym B | Booking/check-in rejected |
| BR-005 | P0 | API | Multi-gym daily limit | Multi-gym user checks in at one gym, then tries second gym same IST day | Second check-in rejected by daily lock |
| BR-006 | P0 | DATA | Same-gym/day-pass check-in payout | Complete same-gym/day-pass check-in and inspect gym report/checkin response | Gym visit earning is `0`; subscription revenue is handled via settlement |
| BR-007 | P0 | DATA | Multi-gym visit payout | Complete multi-gym check-in and inspect report/checkin response | Gym earning uses global per-visit payout or gym override |
| BR-008 | P0 | DATA | Global commission with overrides | Set global commission, override same-gym/PT/wellness/day-pass, purchase each service | Checkout and settlement use override where present, global where not |
| BR-009 | P0 | DATA | No double commission on multi-gym | Purchase multi-gym pass and inspect checkout/settlement | Multi-gym price is admin price; no extra same-gym/day-pass commission is stacked |
| BR-010 | P0 | SEC | Public gym visibility | Query public gyms and homepage featured gyms | Only active, KYC-approved gyms with valid non-zero lat/lng are returned |
| BR-011 | P0 | SEC | Public gym data privacy | Query public gym list/detail | Owner id, commission, payout rate, KYC status/docs/review notes are not exposed |
| BR-012 | P0 | SEC | Gym member privacy | Gym loads members/checkins/scanner result | Gym sees member name and safe `BMF-...` member code, not phone/email |
| BR-013 | P0 | DATA | No fake/demo data on API empty | Force API empty/failure for major pages | UI shows empty/error state, not fake gyms/products/invoices/history |
| BR-014 | P0 | E2E | KYC pending until all six groups approved | Submit six KYC groups, approve five, reject one | Overall gym KYC remains pending/in-review until all six approved |
| BR-015 | P0 | E2E | Gym location lock | Gym saves valid lat/lng once from settings, reloads, tries changing | Gym cannot edit after successful save; admin can correct |
| BR-016 | P1 | E2E | Gym review auto-publish | Same-gym/day-pass user for gym A, or a user with a successful check-in at gym A, submits a 1-5 star review | Review is approved immediately, visible on gym detail/reviews, and aggregate rating updates |
| BR-017 | P0 | SEC | Role isolation across portals | Use admin/gym/corporate/wellness/end-user tokens against each other's privileged routes | Every route rejects unauthorized roles and never leaks scoped data |
| BR-018 | P0 | DATA | Payment idempotency | Replay the same paid webhook/verify request multiple times | Subscription/order/booking activates once; no duplicate members, invoices, check-ins, or payouts |
| BR-019 | P0 | DATA | Money rounding consistency | Purchase all service types with percentage/fixed commission and sale prices | Checkout, invoice, admin revenue, gym-facing amount, and settlement totals match to paise/rupee rounding rule |
| BR-020 | P0 | SEC | Soft-deleted/deactivated content hidden | Deactivate gym, trainer, wellness partner, service, product, category, and amenity | Hidden from public/mobile lists while historical financial records remain readable to authorized admins |
| BR-021 | P1 | DATA | Timezone boundary rules | Book/check in near midnight IST and UTC boundary | Same-day limits, expiry, reports, and settlement period use intended IST business date |

## Backend API Test Cases

### Auth And Users

| ID | Priority | Type | Endpoint / Area | Scenario | Expected Result |
|---|---:|---|---|---|---|
| BE-AUTH-001 | P0 | API | `POST /auth/otp/send` | Send OTP to valid 10-digit phone | Success response; dev/local may return default OTP |
| BE-AUTH-002 | P0 | API | `POST /auth/otp/send` | Invalid/short/non-numeric phone | Validation error |
| BE-AUTH-003 | P0 | API | `POST /auth/otp/verify` | Verify valid OTP for existing user | Access/refresh tokens and user returned |
| BE-AUTH-004 | P0 | API | `POST /auth/otp/verify` | Wrong/expired OTP | 401 or clear validation error; no token |
| BE-AUTH-005 | P0 | API | `POST /auth/otp/verify` | New user without required name when required by mobile flow | Backend/mobile blocks incomplete registration |
| BE-AUTH-006 | P0 | API | `POST /auth/admin/login` | Valid admin/gym/corporate/wellness credentials | JWT and role-specific user returned |
| BE-AUTH-007 | P0 | SEC | `POST /auth/admin/login` | Wrong password or inactive user | Login rejected |
| BE-AUTH-008 | P0 | API | `POST /auth/refresh` | Valid refresh token | New access token issued |
| BE-AUTH-009 | P0 | SEC | `POST /auth/refresh` | Invalid/expired refresh token | Rejected and session should be cleared by clients |
| BE-AUTH-010 | P0 | API | `POST /auth/gym/register` | Valid gym owner registration with category | User and pending gym created transactionally |
| BE-AUTH-011 | P0 | API | `POST /auth/gym/register` | Duplicate owner email/phone | Rejected; no duplicate gym created |
| BE-AUTH-012 | P0 | API | `POST /auth/gym/register` | Missing/invalid/inactive category | Rejected with clear error |
| BE-AUTH-013 | P0 | SEC | Auth tokens | Expired access token used on protected route | Request rejected; refresh flow required |
| BE-AUTH-014 | P0 | SEC | Auth role claims | Tampered/forged JWT role or user id | Rejected by signature/guard; no privilege escalation |
| BE-AUTH-015 | P1 | SEC | Login throttling | Repeated OTP/admin login failures from same phone/IP | Rate limit or safe error behavior prevents brute-force loops |
| BE-USER-001 | P1 | API | `GET /users/me` | Valid end-user token | Current user returned |
| BE-USER-002 | P1 | API | `PUT /users/me` | Update name/email | Persisted and returned |
| BE-USER-003 | P0 | SEC | `DELETE /users/me` | End user deletes account | User anonymized/deactivated and cannot continue session |
| BE-USER-004 | P0 | SEC | `DELETE /users/me` | Gym/admin/corporate token attempts account delete | Rejected unless explicitly supported |
| BE-USER-005 | P1 | API | `GET /users` | Super admin lists/searches users | Paginated users returned |
| BE-USER-006 | P1 | SEC | `GET /users` | Non-admin tries listing users | Forbidden |
| BE-USER-007 | P1 | API | `POST /users/:id/suspend` | Super admin suspends user | User inactive/suspended and login/access behavior reflects status |
| BE-USER-008 | P1 | API | `POST /users/:id/unsuspend` | Super admin restores user | User active again |
| BE-USER-009 | P1 | API | `GET /users/me/referral` | User requests referral code | Stable code returned and persists across reload |
| BE-USER-010 | P1 | API | `POST /users/me/referral/apply` | Apply valid, own, duplicate, and invalid referral codes | Valid code awards once; own/duplicate/invalid codes rejected |
| BE-USER-011 | P1 | API | `GET /users/me/loyalty` | User with subscription/check-in/order history loads loyalty | Correct points and no other user's history exposed |

### Gyms, Gym Plans, Categories, Amenities

| ID | Priority | Type | Endpoint / Area | Scenario | Expected Result |
|---|---:|---|---|---|---|
| BE-GYM-001 | P0 | API | `GET /gyms` | Public list with approved active gyms | Only public-ready gyms returned |
| BE-GYM-002 | P0 | API | `GET /gyms` | Filter by category/city/tier/search | Correct filtered list returned |
| BE-GYM-003 | P0 | API | `GET /gyms?lat=&lng=&sort=nearby_best` | Nearby request with GPS | Distance-aware order returned, with distance values when available |
| BE-GYM-004 | P0 | API | `GET /gyms/:id` | Public approved gym detail | User-facing profile, media, amenities, hours, plans returned |
| BE-GYM-005 | P0 | SEC | `GET /gyms/:id` | Pending/suspended/no-location gym | Not public or safe not-found/forbidden response |
| BE-GYM-006 | P0 | API | `GET /gyms/my-gym` | Gym staff/owner fetch own gym | Bound gym returned from token/user gymId |
| BE-GYM-007 | P0 | SEC | `GET /gyms/my-gym` | Staff not linked to gym | Rejected with clear setup error |
| BE-GYM-008 | P0 | API | `PUT /gyms/:id` | Gym owner updates profile details | Own gym updated; protected fields unchanged |
| BE-GYM-009 | P0 | SEC | `PUT /gyms/:id` | Gym owner edits another gym | Forbidden |
| BE-GYM-010 | P0 | API | `PUT /gyms/my-gym/location` | Gym saves valid lat/lng first time | Location saved and locked |
| BE-GYM-011 | P0 | API | `PUT /gyms/my-gym/location` | Invalid coordinates, non-numeric, `0,0` | Rejected |
| BE-GYM-012 | P0 | SEC | `PUT /gyms/my-gym/location` | Gym tries changing locked location | Rejected; admin correction still allowed |
| BE-GYM-013 | P0 | API | `POST /gyms/:id/approve` | Admin approves gym with valid KYC/location | Status/KYC updates and public visibility enabled |
| BE-GYM-014 | P0 | API | `POST /gyms/:id/approve` | Missing KYC or invalid location | Approval blocked |
| BE-GYM-015 | P0 | API | `POST /gyms/:id/suspend` | Admin suspends active gym | Gym disappears from public lists and cannot be checked into |
| BE-GYM-016 | P0 | API | `POST /gyms/:id/activate` | Admin reactivates suspended gym | Gym visible again when KYC/location valid |
| BE-GYM-017 | P1 | API | `GET /gyms/my-members` | Gym loads members | Only subscriptions/check-ins for own gym, paginated and sanitized |
| BE-GYM-018 | P1 | API | `GET /gyms/my-report` | Gym loads reports by period | Real subscription/check-in/trainer amounts returned |
| BE-GYM-019 | P1 | API | `GET /gyms/my-reviews` | Gym loads reviews | Only own gym reviews returned |
| BE-GYM-020 | P0 | SEC | `GET /gyms/admin/list` | Non-admin calls admin gym list | Forbidden |
| BE-GYM-021 | P0 | DATA | `GET /gyms/recommended` | User with previous gym usage loads recommendations | Recommendations exclude unavailable gyms and include safe public fields only |
| BE-GYM-022 | P1 | DATA | Gym media normalization | Gym saves empty, duplicate, relative, invalid, and many media URLs | API stores valid ordered media, cover fallback works, invalid entries rejected/ignored safely |
| BE-GYM-023 | P1 | API | Gym tier update | Admin changes tier/rate override | Public badges and settlement payout config update; gym cannot change its own tier |
| BE-GYM-024 | P0 | SEC | Gym deactivation with active subscriptions | Admin deactivates gym that has active same-gym subscribers | Public listing hides gym; existing users get safe booking/purchase behavior and admin can inspect records |
| BE-PLAN-001 | P0 | API | `POST /gym-plans` | Create 1-month plan | Plan created for owner gym |
| BE-PLAN-002 | P0 | API | `POST /gym-plans` | Duplicate active duration | Rejected |
| BE-PLAN-003 | P0 | API | `POST /gym-plans` | Invalid duration not 30/90/180/365 | Rejected |
| BE-PLAN-004 | P0 | API | `POST /gym-plans` | Sale price above regular price | Rejected |
| BE-PLAN-005 | P0 | API | `PUT /gym-plans/:id` | Update price/sale/features/active | Persisted and reflected in public plan list |
| BE-PLAN-006 | P0 | API | `DELETE /gym-plans/:id` | Delete old duplicate/inactive plan | Removed or soft-deleted; duration slot frees |
| BE-PLAN-007 | P0 | SEC | `PUT/DELETE /gym-plans/:id` | Other gym owner edits plan | Forbidden |
| BE-PLAN-008 | P0 | DATA | Plan deletion with existing subscriptions | Delete plan already used by subscriptions | Existing subscriptions retain historical price/plan reference; new purchases cannot use deleted plan |
| BE-PLAN-009 | P1 | DATA | Plan sale display math | Regular price, sale price, and admin commission are configured | User display discount and final checkout amount use expected source values |
| BE-PLAN-010 | P1 | API | Day-pass price fallback | Gym clears custom day-pass price | Checkout uses admin default and public detail labels fallback clearly |
| BE-CAT-001 | P0 | API | `POST /master/categories` | Admin creates category with icon | Category created and visible to gym/mobile |
| BE-CAT-002 | P0 | API | `POST /master/categories` | Duplicate category name case-insensitive | Rejected |
| BE-CAT-003 | P0 | API | `PUT /master/categories/:id` | Edit name/icon | Updated everywhere after reload |
| BE-CAT-004 | P1 | API | `DELETE /master/categories/:id` | Delete category in use | Safe reject or soft delete without breaking gyms |
| BE-CAT-005 | P1 | DATA | Category icon fallback | Category has missing/invalid icon URL | API/mobile/gym use default icon without blank UI |
| BE-AM-001 | P0 | API | `POST /master/amenities` | Admin creates amenity with icon | Amenity selectable by gyms |
| BE-AM-002 | P1 | API | `POST /master/amenities/request` | Gym requests new amenity | Pending request visible to admin |
| BE-AM-003 | P1 | API | `POST /master/amenities/:id/approve` | Admin approves request | Amenity becomes selectable |
| BE-AM-004 | P1 | API | `PUT /gyms/my-gym/amenities` | Gym selects/removes amenities | Public gym detail reflects icons and selection |
| BE-AM-005 | P1 | SEC | Amenity request ownership | Gym lists own amenity requests | Only requests from that gym/user are returned |
| BE-AM-006 | P1 | DATA | Amenity rejection | Admin rejects requested amenity already selected nowhere | Request hidden from active list; requester sees rejected/pending state safely |

### Subscriptions, Payments, Cashfree

| ID | Priority | Type | Endpoint / Area | Scenario | Expected Result |
|---|---:|---|---|---|---|
| BE-SUB-001 | P0 | API | `GET /subscriptions/plans` | Fetch plan/commission config | Day pass, same-gym commission, multi-gym, trainer/wellness settings returned |
| BE-SUB-002 | P0 | API | `POST /subscriptions/purchase` | Buy same-gym plan with active `gymPlanId` | Pending subscription/order created with server amount |
| BE-SUB-003 | P0 | API | `POST /subscriptions/purchase` | Same-gym purchase without active gym plan | Rejected |
| BE-SUB-004 | P0 | API | `POST /subscriptions/purchase` | Duplicate active same-gym pass | Rejected/cancels duplicate pending safely |
| BE-SUB-005 | P0 | API | `POST /subscriptions/purchase` | Buy day pass for active gym | Pending day-pass order created |
| BE-SUB-006 | P0 | API | `POST /subscriptions/purchase` | Buy day pass without gym ID | Rejected |
| BE-SUB-007 | P0 | API | `POST /subscriptions/purchase` | Buy multi-gym pass | Uses admin multi-gym price/config |
| BE-SUB-008 | P0 | DATA | `POST /subscriptions/purchase` | Coupon valid/expired/min amount/wrong kind | Correct discount or rejection |
| BE-SUB-009 | P0 | DATA | Pricing | Client sends tampered amount | Backend ignores client amount and computes server-side |
| BE-SUB-010 | P0 | API | `POST /subscriptions/:id/verify` | Cashfree paid order | Subscription activates, dates set, invoice created |
| BE-SUB-011 | P0 | API | `POST /subscriptions/:id/verify` | Cashfree failed/cancelled/dropped/expired | Pending subscription cancelled or remains not active |
| BE-SUB-012 | P0 | API | `GET /subscriptions` | User lists own subscriptions | Current/expired/cancelled owned records returned |
| BE-SUB-013 | P0 | SEC | `GET /subscriptions/:id/invoice` | User requests another user's invoice | Forbidden/not found |
| BE-SUB-014 | P1 | API | `POST /subscriptions/:id/freeze` | Freeze active subscription | Status/dates update and check-ins disabled during freeze |
| BE-SUB-015 | P1 | API | `POST /subscriptions/:id/unfreeze` | Unfreeze frozen subscription | Status active again if duplicate active pass does not conflict |
| BE-SUB-016 | P1 | API | `POST /subscriptions/:id/cancel` | Cancel active/pending subscription | Status cancellation reflected in user/gym/admin views |
| BE-SUB-017 | P0 | API | `GET /subscriptions/all` | Super admin filters/searches all subscriptions | Correct paginated data; non-admin forbidden |
| BE-SUB-018 | P0 | DATA | Pending payment cleanup | User starts checkout and never pays | Pending subscription does not grant access and can be safely replaced/cancelled |
| BE-SUB-019 | P0 | SEC | Subscription ownership | User verifies/freezes/cancels another user's subscription | Forbidden/not found |
| BE-SUB-020 | P0 | DATA | Trainer add-on subscription | Purchase same-gym plan with trainer add-on | Trainer booking amount, trainer id, and gym member history match checkout |
| BE-SUB-021 | P0 | DATA | Multi-gym network update | Admin removes a gym from multi-gym network | New multi-gym booking/check-in at removed gym is blocked; history remains |
| BE-PAY-001 | P0 | API | `POST /payments/cashfree/order` | Create order with valid payload | Cashfree session/order returned |
| BE-PAY-002 | P0 | SEC | Cashfree service | Production with Cashfree API failure | No mock payment order returned |
| BE-PAY-003 | P0 | SEC | Cashfree mock | `CASHFREE_MOCK_MODE=true` in non-production | Mock works only in local/dev |
| BE-PAY-004 | P0 | API | `POST /payments/verify/:orderId` | Paid order | Returns paid status and triggers matching subscription/order update |
| BE-PAY-005 | P0 | API | `POST /payments/verify/:orderId` | Unknown order | Safe not-found/failure |
| BE-PAY-006 | P0 | SEC | `POST /payments/webhook` | Missing/invalid signature in production | Rejected |
| BE-PAY-007 | P0 | API | `POST /payments/webhook` | Valid paid subscription webhook | Idempotently activates exactly once |
| BE-PAY-008 | P0 | API | `POST /payments/webhook` | Store/wellness/PT order webhook | Correct target order updated |
| BE-PAY-009 | P0 | API | Payment return URL | Cashfree redirects to return URL with order id | App/backend resolves final status and does not leave user on indefinite loading |
| BE-PAY-010 | P0 | DATA | Webhook before verify | Webhook marks order paid before app calls verify | Verify returns active/paid state without double activation |
| BE-PAY-011 | P0 | SEC | Payment amount mismatch | Cashfree paid amount differs from server order amount | Order flagged/rejected; subscription not activated silently |

### QR, Check-ins, Sessions, Bookings

| ID | Priority | Type | Endpoint / Area | Scenario | Expected Result |
|---|---:|---|---|---|---|
| BE-QR-001 | P0 | API | `POST /qr/generate` | Generate QR for active booking/subscription | Signed token and manual code returned |
| BE-QR-002 | P0 | API | `POST /qr/generate` | No active subscription/booking | Rejected |
| BE-QR-003 | P0 | SEC | `POST /qr/validate` | Valid QR at correct gym | Check-in recorded, QR marked used |
| BE-QR-004 | P0 | SEC | `POST /qr/validate` | Expired QR token | Rejected with expired reason |
| BE-QR-005 | P0 | SEC | `POST /qr/validate` | Reused token/JTI | Rejected |
| BE-QR-006 | P0 | SEC | `POST /qr/validate` | Wrong gym scans same-gym QR | Rejected |
| BE-QR-007 | P0 | SEC | `POST /qr/validate` | Inactive/frozen/expired subscription | Rejected |
| BE-QR-008 | P0 | API | `POST /qr/validate` | Booking QR outside grace window | Rejected |
| BE-QR-009 | P0 | API | `POST /qr/validate` | Already attended/cancelled booking | Rejected |
| BE-QR-010 | P0 | API | `POST /qr/validate-manual` | Valid manual booking code | Same behavior as QR scan |
| BE-QR-011 | P0 | API | `POST /qr/validate-manual` | Invalid/expired/wrong-gym manual code | Rejected with message |
| BE-QR-012 | P0 | DATA | Post-check-in state | Query active booking after successful check-in | No reusable active QR returned |
| BE-QR-013 | P0 | SEC | Legacy checkin | Direct `{ userId }` check-in with env flag disabled | Blocked |
| BE-QR-014 | P1 | API | `GET /qr/history` | User loads QR/checkin history | Own history only |
| BE-QR-015 | P0 | SEC | Manual code brute force | Repeated invalid manual verification attempts | Rate limiting/logging or safe rejection prevents guessing |
| BE-QR-016 | P0 | DATA | Check-in race condition | QR scan and manual code submitted at same time | Only one check-in succeeds; duplicate attempt gets already-used response |
| BE-QR-017 | P1 | DATA | Multi-gym visit payout override | Multi-gym user checks into gym with override rate | Check-in stores override payout, reports and settlements use same amount |
| BE-CHK-001 | P1 | API | `GET /checkins/today` | Gym loads today check-ins | Own gym today rows only |
| BE-CHK-002 | P1 | API | `GET /checkins/stats` | Admin/gym report stats | Role-scoped counts and date filters correct |
| BE-CHK-003 | P1 | SEC | Check-in export/list | Gym requests check-ins with another gym id | Response remains scoped to own gym |
| BE-SESSION-001 | P0 | API | `POST /sessions/book` | Active pass books valid future slot | Confirmed booking and QR/manual ID created |
| BE-SESSION-002 | P0 | API | `POST /sessions/book` | No subscription/pass | Rejected |
| BE-SESSION-003 | P0 | API | `POST /sessions/book` | Break time/closed/past/full slot | Rejected |
| BE-SESSION-004 | P0 | API | `POST /sessions/book` | Duplicate same day beyond plan limit | Rejected |
| BE-SESSION-005 | P1 | API | `POST /sessions/cancel/:bookingId` | Cancel confirmed future booking | Status cancelled and not check-in eligible |
| BE-SESSION-006 | P1 | API | `GET /sessions/my-bookings` | User loads bookings | Confirmed/cancelled/attended history returned |
| BE-SESSION-007 | P1 | API | `GET /sessions/gym-bookings` | Gym loads bookings by date | Manual ID, member code, plan, status, gym amount shown |
| BE-SESSION-008 | P1 | API | `POST /sessions/checkin` | Manual attendance mark | Same validations as QR/manual verification |
| BE-SESSION-009 | P1 | API | Session type CRUD | Create/edit special session from admin category | Persisted and schedulable |
| BE-SESSION-010 | P1 | API | Session schedules | Invalid time order/break overlap/closed day | Rejected |
| BE-SESSION-011 | P1 | API | `GET /sessions/active-booking` | User has attended/cancelled/expired booking | No active reusable booking returned |
| BE-SESSION-012 | P1 | API | Session type delete | Delete session type with future bookings | Safe reject or bookings remain valid with historical label |
| BE-SESSION-013 | P1 | DATA | Capacity race | Two users book the last available slot concurrently | Capacity is not exceeded |

### KYC, Settlements, Reports, Ratings

| ID | Priority | Type | Endpoint / Area | Scenario | Expected Result |
|---|---:|---|---|---|---|
| BE-KYC-001 | P0 | API | `GET /gyms/:id/kyc` | Gym owner loads own KYC | Current six-section status returned |
| BE-KYC-002 | P0 | API | `POST /gyms/:id/kyc-documents` | Submit pending section with valid fields | Section becomes in-review and locks |
| BE-KYC-003 | P0 | API | `POST /gyms/:id/kyc-documents` | Missing required fields | Rejected |
| BE-KYC-004 | P0 | API | `POST /gyms/:id/kyc-documents` | Resubmit approved/in-review section | Rejected |
| BE-KYC-005 | P0 | API | `POST /gyms/:id/kyc-documents` | Resubmit rejected section | Accepted and returns in-review |
| BE-KYC-006 | P0 | API | `PATCH /gyms/:id/kyc-documents/:type/review` | Admin approves one section | Section approved; overall updated only if all approved |
| BE-KYC-007 | P0 | API | `PATCH /gyms/:id/kyc-documents/:type/review` | Admin rejects with note | Section rejected and note visible to gym |
| BE-KYC-008 | P0 | SEC | KYC routes | Gym owner accesses another gym KYC | Forbidden |
| BE-KYC-009 | P0 | DATA | KYC document audit trail | Admin approves/rejects each section | Reviewed by/date/note retained without exposing private docs publicly |
| BE-KYC-010 | P0 | SEC | KYC upload URL safety | Submit external/malformed/script URL in document fields | Stored safely or rejected; no executable content returned |
| BE-SET-001 | P0 | DATA | `POST /settlements/compute` | Compute monthly settlements | Correct pending rows and payout math |
| BE-SET-002 | P0 | DATA | Settlement math | Same-gym/day-pass/trainer/multi-gym mixed data | Gym-facing amount excludes admin margin; admin sees full amounts |
| BE-SET-003 | P0 | API | `POST /settlements/:id/approve` | Admin approves pending settlement | Status approved |
| BE-SET-004 | P0 | API | `POST /settlements/:id/pay` | Admin pays approved settlement | Status paid and paidDate set |
| BE-SET-005 | P1 | API | `POST /settlements/:id/dispute` | Gym disputes own settlement with reason | Status disputed and reason persists |
| BE-SET-006 | P1 | SEC | Settlement routes | Gym disputes another gym settlement | Forbidden |
| BE-SET-007 | P0 | DATA | Settlement idempotency | Generate/compute same period twice | No duplicate payable rows for same gym/period |
| BE-SET-008 | P1 | DATA | Settlement negative/zero amounts | Period has refunds, zero visits, or only cancelled items | Totals never go negative unless explicitly supported; status/messages clear |
| BE-RATE-001 | P1 | API | `POST /ratings` | Eligible user submits gym rating | Same-gym/day-pass users for that gym or users with successful check-in can submit; gym rating auto-approves, ties to authenticated user, and aggregate recalculates immediately |
| BE-RATE-002 | P1 | API | `POST /ratings/:id/approve` | Admin approves non-auto/moderated rating | Target aggregate recalculates |
| BE-RATE-003 | P1 | API | `POST /ratings/:id/reject` | Admin rejects or removes moderated rating | Rating excluded from public aggregate |
| BE-RATE-004 | P1 | API | `GET /ratings/gym/:gymId` | Public rating list | Published gym reviews and display names returned |
| BE-RATE-005 | P1 | SEC | `GET /ratings` | Non-admin lists ratings with status filter | Forbidden or only public-safe data returned |
| BE-RATE-006 | P1 | API | Duplicate gym review | Same eligible user submits second review for same gym | Product rule enforced: update existing review or reject duplicate consistently |
| BE-RATE-007 | P1 | DATA | Rating aggregate migration | Pending gym reviews exist before auto-publish migration | Migration approves gym reviews and recomputes gym rating/count |

### Wellness, Store, Corporate

| ID | Priority | Type | Endpoint / Area | Scenario | Expected Result |
|---|---:|---|---|---|---|
| BE-WELL-001 | P0 | API | `GET /wellness/partners` | Public list | Active/approved partners only, nearby sorting supported |
| BE-WELL-002 | P0 | API | `POST /wellness/partners` | Admin creates partner | Partner saved with status/profile |
| BE-WELL-003 | P0 | API | `POST /wellness/services` | Admin creates active service | Service visible under partner |
| BE-WELL-004 | P0 | API | Partner-scoped services | Wellness partner creates service | Pending/admin review behavior correct |
| BE-WELL-005 | P0 | API | `POST /wellness/services/:id/book` | User books service | Pending booking/order created |
| BE-WELL-006 | P0 | API | Payment/webhook | Paid wellness booking | Booking confirmed and invoice available |
| BE-WELL-007 | P0 | SEC | Partner portal routes | Partner accesses another partner | Forbidden |
| BE-WELL-008 | P1 | DATA | Wellness commission override | Partner has manual commission and global commission changes | Only intended override/global rule applies; no double commission |
| BE-WELL-009 | P1 | API | Service availability | Book inactive/rejected/deleted wellness service | Rejected and not payable |
| BE-STORE-001 | P0 | API | `GET /store/products` | Public product list | Active products, categories, prices, stock returned |
| BE-STORE-002 | P0 | API | `POST /store/orders` | Valid cart checkout | Order and Cashfree payment created |
| BE-STORE-003 | P0 | API | `POST /store/orders` | Empty cart/out-of-stock/invalid product | Rejected |
| BE-STORE-004 | P0 | API | Store webhook | Paid store order | Order paid and cart can clear on mobile |
| BE-STORE-005 | P1 | API | `POST /store/orders/:id/ship` | Admin ships order | Tracking/status saved |
| BE-STORE-006 | P1 | DATA | Product image fallback | Product has missing/broken image | Mobile/store displays default image and no layout break |
| BE-STORE-007 | P1 | SEC | Store order ownership | User requests another user's order/invoice | Forbidden/not found |
| BE-CORP-001 | P0 | API | `POST /auth/corporate/register` | Valid corporate signup | Pending corporate admin/account created |
| BE-CORP-002 | P0 | API | `POST /corporate/:id/approve` | Admin approves corporate | Corporate active |
| BE-CORP-003 | P0 | API | `POST /corporate/:id/employees` | Add employee within seats | Employee created and seats update |
| BE-CORP-004 | P0 | API | Bulk employees | CSV/bulk add partial invalid rows | Valid rows added, invalid rows reported |
| BE-CORP-005 | P0 | SEC | Corporate routes | Corporate admin accesses another company `:id` | Forbidden |
| BE-CORP-006 | P1 | API | Remove employee | Employee removed and seats restored | Counts update |
| BE-CORP-007 | P1 | DATA | Corporate top-up request | Corporate admin submits top-up request | Request stored and admin-visible with no direct seat inflation until approved |
| BE-CORP-008 | P1 | DATA | Corporate analytics scope | Corporate admin loads analytics/checkins | Only employees from own corporate account included |

### Additional Backend Regression Cases

| ID | Priority | Type | Endpoint / Area | Scenario | Expected Result |
|---|---:|---|---|---|---|
| BE-AUTH-016 | P0 | SEC | `POST /auth/admin/setup` | Setup called after super admin already exists | Rejected; existing admin cannot be overwritten |
| BE-AUTH-017 | P0 | SEC | OTP verify | Replay same OTP after successful verification | OTP cannot be reused |
| BE-USER-012 | P0 | SEC | `POST /users/admins` | Non-admin, duplicate email, weak password | Forbidden/validation error and no `passwordHash` returned |
| BE-GYM-025 | P0 | API | `POST /gyms/:id/reject` | Admin rejects gym/KYC with note | Note stored and gym hidden from public/search/booking |
| BE-GYM-026 | P0 | SEC | Gym owner patch | Gym owner sends protected fields like `status`, `ownerId`, `commissionRate`, `ratePerDay`, locked `lat/lng` | Protected fields ignored/rejected |
| BE-GYM-027 | P0 | SEC | `PATCH /gyms/my-members/:subId/deactivate` | Gym deactivates multi-gym or another gym's member | Rejected |
| BE-TRN-001 | P0 | SEC | Trainer CRUD | Gym owner/staff lists/edits trainers with another gym id or `includeInactive` | Results scoped to own gym; super admin requires valid gym context |
| BE-TRN-002 | P0 | API | `POST /trainers/:id/book` | Book inactive/zero-price trainer | Rejected; valid booking uses server-side PT commission |
| BE-SLOT-001 | P0 | SEC | Legacy slots | Gym owner/staff creates slot for another gym | Forbidden |
| BE-SLOT-002 | P0 | DATA | Legacy slot capacity | Concurrent bookings for last slot | Capacity/booked count cannot exceed limit |
| BE-SESSION-014 | P0 | SEC | Direct session check-in | `/sessions/checkin` called when direct env flag disabled | Blocked; when enabled still enforces gym ownership |
| BE-WELL-010 | P1 | DATA | Wellness invoice | Repeated invoice requests after paid booking | Stable invoice number and owner-only access |
| BE-STORE-008 | P1 | API | Product CRUD/detail | Inactive/deleted product detail or negative price/stock | Public detail hidden and invalid CRUD rejected |
| BE-CORP-009 | P0 | DATA | Corporate seats | Duplicate employee assignment or bulk import over seat limit | Seat limits enforced and valid/invalid rows reported |
| BE-COUPON-001 | P0 | SEC | Coupons | List/create coupon and validate coupon | List/create admin-only; validate returns safe discount result only |
| BE-NOTIF-001 | P0 | SEC | Notifications | Send/broadcast/read notifications | Auth and ownership/admin scope enforced |
| BE-VIDEO-001 | P1 | SEC | Videos | Public list and create workout video | Create admin-only; public list returns safe video fields |
| BE-HOME-001 | P0 | SEC | Homepage config | Save public homepage config | Save admin-only; public config strips sensitive gym/product fields |
| BE-CONFIG-001 | P0 | SEC | Admin settings/commission | Access settings/commission routes as non-admin | Forbidden; commission PUT rejected in favor of plan management |
| BE-FRAUD-001 | P1 | API | Fraud alerts | Create/list/flag/clear fraud alerts | Admin-only lifecycle persists status filters |
| BE-SEC-001 | P0 | SEC | CORS | Unknown origin calls production API | Denied while configured portal/mobile/no-origin requests remain allowed |
| BE-DATA-001 | P0 | DATA | Unique constraints | Duplicate settlement month, employee, booking, QR/check-in token | Clean conflict behavior without partial writes |
| BE-HEALTH-001 | P1 | API | `/health` | Health endpoint called publicly | Stable non-secret readiness response |

## Mobile User App Test Cases

| ID | Priority | Type | Area | Scenario | Expected Result |
|---|---:|---|---|---|---|
| MOB-BOOT-001 | P0 | UI | Fresh install | Open app first time | Onboarding then login flow appears |
| MOB-BOOT-002 | P0 | UI | Session boot | Existing valid token | Loads `/users/me` and routes by role |
| MOB-BOOT-003 | P0 | UI | Session refresh | Expired access token, valid refresh | Refreshes once and continues |
| MOB-BOOT-004 | P0 | UI | Session failure | Expired/corrupt tokens | Clears session and routes login |
| MOB-BOOT-005 | P1 | UI | Permissions | Logged-in tabs open | Foreground location permission prompt appears once |
| MOB-BOOT-006 | P1 | UI | Permissions denied | Deny location | App remains usable; gym list can request/open settings later |
| MOB-AUTH-001 | P0 | UI | Login | Enter valid 10-digit phone and continue | OTP screen opens |
| MOB-AUTH-002 | P0 | UI | Login validation | Short/non-numeric phone | Continue blocked/error shown |
| MOB-AUTH-003 | P0 | UI | OTP | Existing user verifies default OTP | Tokens saved and tabs open |
| MOB-AUTH-004 | P0 | UI | OTP | New user enters name and OTP | Account/session created |
| MOB-AUTH-005 | P1 | UI | OTP | Wrong OTP/network error | Error shown; no session |
| MOB-HOME-001 | P0 | UI | Home | Load logged-in home | Homepage config, gyms, categories, wellness/store sections load real data |
| MOB-HOME-002 | P0 | DATA | Home | API empty | Empty states; no fake gyms/products/invoices |
| MOB-GYM-001 | P0 | UI | Gym listing | Open Home/Explore gyms | Both paths use the same `/gyms` listing |
| MOB-GYM-002 | P0 | UI | Gym listing | Search by gym/city/area/amenity | Correct filtered list |
| MOB-GYM-003 | P0 | UI | Gym listing | Category chip select and switch | New category selectable; All resets |
| MOB-GYM-004 | P0 | UI | Gym listing | Best Nearby with GPS allowed | Sends location and sorts nearby first |
| MOB-GYM-005 | P1 | UI | Gym listing | GPS denied | Banner/action handles denied/settings state |
| MOB-GYM-006 | P1 | UI | Gym listing | Sort by rating/price | Correct order without temporary wrong amount flicker |
| MOB-GYM-007 | P0 | UI | Subscription state | Active same-gym user views subscribed gym card | Subscribed/Book state shown; duplicate purchase blocked |
| MOB-DETAIL-001 | P0 | UI | Gym detail | Open active gym | Profile, plans, sessions, trainers, rating, photos/videos load |
| MOB-DETAIL-002 | P1 | UI | Gym detail | Multiple photos/videos | Hero auto/gallery handles multiple media and video play |
| MOB-DETAIL-003 | P1 | UI | Gym detail | Amenities/categories | Icons and labels show from gym/admin data |
| MOB-DETAIL-004 | P1 | UI | Gym detail | Operating hours/break time | Human time format and break rules visible |
| MOB-DETAIL-005 | P1 | UI | Gym detail | Map/directions | Works when lat/lng present; fallback when absent |
| MOB-DETAIL-006 | P1 | UI | Ratings | Eligible subscribed/check-in user submits 1-5 star gym review | Review publishes immediately and gym rating/review count refreshes |
| MOB-PLAN-001 | P0 | UI | Plans | Open gym plans | Day pass, same-gym plans, multi-gym visible with server prices |
| MOB-PLAN-002 | P0 | UI | Plans | Gym has no active plans | Same-gym checkout unavailable with clear message |
| MOB-PLAN-003 | P0 | UI | Duration | Select same-gym duration | Uses selected gym plan regular/sale price and commission |
| MOB-PLAN-004 | P0 | UI | Duration | Trainer add-on | Shows monthly trainers with gym name and price |
| MOB-PLAN-005 | P0 | UI | Duration | Trainer unavailable | Useful empty state and checkout still valid without trainer |
| MOB-PLAN-006 | P0 | UI | Checkout | Apply valid/invalid coupon | Correct discount or error |
| MOB-PLAN-007 | P0 | E2E | Checkout | Start payment | Subscription order created before Cashfree |
| MOB-PAY-001 | P0 | UI | Cashfree | WebView opens checkout | Uses live/sandbox URL from app config |
| MOB-PAY-002 | P0 | UI | Cashfree | Payment success | Verifies backend before success screen |
| MOB-PAY-003 | P0 | UI | Cashfree | Taking-too-long page | Continue/fallback verify button avoids user trap |
| MOB-PAY-004 | P0 | UI | Cashfree | User cancels/fails payment | No active subscription; clear state |
| MOB-BOOK-001 | P0 | UI | Booking | Active pass books valid session | Booking created and QR action available |
| MOB-BOOK-002 | P0 | UI | Booking | Cancel confirmed booking | Status cancelled, not clickable for QR/check-in |
| MOB-BOOK-003 | P0 | UI | Booking | Attended booking | Shows attended, not clickable again |
| MOB-BOOK-004 | P1 | UI | Booking | Not attended/expired booking | Shows final status and disabled action |
| MOB-QR-001 | P0 | UI | QR screen | Open active booking QR | QR, gym name, expiry, countdown, manual code visible |
| MOB-QR-002 | P0 | UI | QR screen | QR expires | Expired state shown; no reusable check-in |
| MOB-QR-003 | P0 | UI | QR screen | Gym scans successfully | QR page updates to checked-in/closed state |
| MOB-QR-004 | P0 | UI | QR screen | No active booking | Safe empty message |
| MOB-WELL-001 | P0 | UI | Wellness | Load wellness/spa/home services | Nearby partners/services show real data with default images |
| MOB-WELL-002 | P0 | UI | Wellness booking | Book selected service/date/time | Payment order created |
| MOB-WELL-003 | P1 | UI | Wellness | Missing images | Default service image appears |
| MOB-STORE-001 | P0 | UI | Store | List/search product | Real products and default images shown |
| MOB-STORE-002 | P0 | UI | Store checkout | Add quantity, checkout, pay | Order created and cart clears after paid |
| MOB-PROFILE-001 | P0 | UI | Profile | Load profile | User details and links show |
| MOB-PROFILE-002 | P0 | UI | Edit profile | Update name/email | Persisted and reflected |
| MOB-PROFILE-003 | P0 | UI | Account deletion | Tap delete, confirm twice | `DELETE /users/me`, logout, route login |
| MOB-PROFILE-004 | P1 | UI | Sign out | Confirm sign out | Tokens/user cleared |
| MOB-PROFILE-005 | P1 | UI | Invoice/history | Open invoice/history | Own records shown; empty/error states safe |
| MOB-LAYOUT-001 | P1 | UI | Safe areas | Android/iOS with gesture/navigation bars | Bottom nav/content not hidden behind system nav |

### Additional Mobile Regression Cases

| ID | Priority | Type | Area | Scenario | Expected Result |
|---|---:|---|---|---|---|
| MOB-BOOT-007 | P0 | UI | Deep links | Payment-return deep link opens app from cold start | App bypasses onboarding/login redirect only when token/session is valid and verifies payment state |
| MOB-BOOT-008 | P1 | UI | Role routing | Gym owner/staff logs into mobile app | Routes to mobile gym portal, not normal user tabs |
| MOB-BOOT-009 | P1 | UI | Android back | Press hardware back from nested tabs/screens | Pops nested route first, then shows exit/confirmation behavior |
| MOB-PERM-001 | P1 | UI | Location permission | Switch tabs repeatedly after login | Location prompt appears once and does not spam |
| MOB-PERM-002 | P1 | UI | Permanent denial | User permanently denies location | App offers settings path and still allows manual browsing |
| MOB-PERM-003 | P1 | UI | Location services off | Device GPS/provider is off | App handles provider-off state and fallback sorting safely |
| MOB-PERM-004 | P1 | UI | Directions | Open directions with granted/denied/invalid coordinates | Correct map/open-settings/fallback behavior |
| MOB-PERM-005 | P1 | UI | Camera denial | Scanner camera permission denied | Manual-code validation remains usable |
| MOB-PERM-006 | P1 | UI | Camera scan events | Cancel scanner or receive duplicate barcode events | No duplicate check-in calls or frozen scanner state |
| MOB-SUB-001 | P0 | UI | Memberships | Current/expired/none subscriptions and renew flow | Current and past memberships are separated; renew only appears where valid |
| MOB-REV-001 | P1 | UI | Reviews | Submit review without stars or above text limit | Submit blocked; 500-character counter/limit enforced |
| MOB-REV-002 | P1 | UI | Reviews | Ineligible/duplicate/backend failure during review submit | User stays on review screen with clear error and can retry |
| MOB-REV-003 | P1 | UI | Trainer reviews | Open trainer review route | Submits `targetType=trainer` and handles pending/moderation copy correctly |
| MOB-REV-004 | P1 | UI | Reviews auth | Cached user is missing/corrupt | Review blocks before posting an empty user id |
| MOB-REV-005 | P1 | UI | Reviews refresh | Return from review screen | Gym rating, count, and visible reviews refresh |
| MOB-PAY-005 | P0 | UI | Payment load failure | Cashfree session missing or SDK/webview fails | Retry/clear error shown; no stuck blank payment page |
| MOB-PAY-006 | P0 | SEC | Mock payment | `mock_session_*` appears in production build | Blocked in production; allowed only explicit local/dev mock mode |
| MOB-PAY-007 | P1 | UI | UPI/external intent | Payment provider opens external app or unavailable app | Opens external intent or shows unavailable alert safely |
| MOB-PAY-008 | P1 | UI | Payment back | User presses back during payment | Cancel confirmation appears and pending order state stays safe |
| MOB-PAY-009 | P0 | UI | Manual completed payment | User taps completed/next-step after Cashfree delay | Backend verify succeeds before success screen |
| MOB-PAY-010 | P0 | UI | Payment return statuses | Return status is success, failed, dropped, cancelled, expired, or missing order | Correct final screen and subscription state for each status |
| MOB-PAY-011 | P0 | DATA | Payment idempotency | Duplicate success/deep-link events fire | Only one activation/order finalization occurs |
| MOB-PAY-012 | P0 | UI | Delayed activation | Payment paid but subscription activation pending | User sees pending/refresh state and membership eventually updates |
| MOB-PAY-013 | P1 | UI | Store/wellness payment return | Store or wellness order returns from payment | Routes to correct order/service screen; cart clears only after paid |
| MOB-PAY-014 | P1 | UI | Coupon edge cases | Blank, duplicate, expired, or server-mismatched coupon | Correct message and server amount remains source of truth |
| MOB-BOOK-005 | P1 | UI | Slot filtering | Open today's sessions after some slots are past | Past slots hidden/disabled; date/type filters reload correctly |
| MOB-BOOK-006 | P0 | UI | No active pass | User without pass tries to book | View Plans CTA appears and booking API is not called |
| MOB-BOOK-007 | P1 | UI | Cancel booking | Cancel from slots/bookings | Confirmation, API call, and refreshed status shown |
| MOB-BOOK-008 | P1 | UI | Active QR matching | Multiple bookings exist | Active QR matches by booking id/ref only, not stale first booking |
| MOB-QR-005 | P0 | UI | QR bootstrap | Open QR from route params or active-booking API | QR/manual code resolves from available source |
| MOB-QR-006 | P0 | UI | Manual code fallback | Booking has param/ref/id/JWT payload variants | Manual code displayed consistently |
| MOB-QR-007 | P1 | UI | QR polling | Network fails briefly while QR is active | QR stays visible with retry state instead of disappearing |
| MOB-QR-008 | P0 | UI | QR checked-in transition | Gym scans while user stays on QR page | Page transitions to checked-in/closed state |
| MOB-QR-009 | P1 | UI | QR expiry UX | QR reaches low time and expiry | Low-time warning, expired overlay, and book-another CTA work |
| MOB-DETAIL-007 | P1 | UI | Detail API failure | Open gym detail with fallback params and API failure | Fallback detail displays; no fallback shows not-found |
| MOB-DETAIL-008 | P1 | UI | Detail media actions | Use share, video-player route, and external about video | Actions work without broken navigation |
| MOB-DETAIL-009 | P1 | UI | Sessions tab states | Sessions are full/booked/blocked by daily limit/capacity | Correct disabled labels and no invalid booking |
| MOB-DETAIL-010 | P1 | UI | Gym CTA state | Same-gym/day-pass/multi-gym users open same gym | CTA/banner reflects exact access and purchase eligibility |
| MOB-DETAIL-011 | P1 | UI | Missing detail fields | Missing media/contact/amenities/custom icons | Defaults/fallbacks appear and layout remains stable |
| MOB-STORE-003 | P1 | UI | Store filters | Search clear/category/API empty states | States remain distinct and usable |
| MOB-STORE-004 | P1 | UI | Cart behavior | Quantity min/remove/delivery threshold/badge refresh | Cart totals and badge update correctly |
| MOB-WELL-004 | P1 | UI | Wellness categories | Spa vs home split, nearby sort, fallback images | Correct lists and fallback images |
| MOB-WELL-005 | P1 | UI | Wellness booking validation | Missing login/time slot/service selection | Checkout blocked with useful message |
| MOB-TRN-001 | P1 | UI | Trainer listing | Gym-scoped vs nearby trainers | Inactive trainers hidden and empty state useful |
| MOB-TRN-002 | P1 | UI | Trainer booking modal | Invalid duration/date or payment order failure | Validation/error shown and no broken transparent modal |
| MOB-LAYOUT-002 | P1 | UI | Sticky footers | Open checkout, details, payment, QR, cart screens | Sticky controls do not cover content/buttons |
| MOB-LAYOUT-003 | P1 | UI | Keyboard | Enter text on auth/order/wellness/trainer modal | Inputs and CTAs stay visible |
| MOB-LAYOUT-004 | P1 | UI | Narrow Android | Test 320-360px width | Long names/prices/badges do not clip or overlap |
| MOB-LAYOUT-005 | P1 | UI | Tab bars | User and mobile gym portal tab bars | Bottom insets honored on gesture and button-navigation devices |
| MOB-LAYOUT-006 | P1 | UI | Horizontal controls | Chips/date selectors/sort sheets | Controls do not clip and remain scrollable |
| MOB-LAYOUT-007 | P1 | UI | Mobile web refresh | Refresh mobile web deep route | No blank route; root fills viewport |
| MOB-LAYOUT-008 | P1 | UI | Image source variants | Absolute, relative, object, data, and empty image sources | Correct image or fallback without crash |

## Gym Partner Portal Test Cases

| ID | Priority | Type | Area | Scenario | Expected Result |
|---|---:|---|---|---|---|
| GYM-AUTH-001 | P0 | UI | Signup | Valid gym registration | Pending gym created and success state |
| GYM-AUTH-002 | P0 | UI | Signup validation | Invalid email/phone/password/no category | Submit blocked or API error shown |
| GYM-AUTH-003 | P0 | UI | Login | Gym owner/staff login | Dashboard opens |
| GYM-AUTH-004 | P0 | SEC | Login | Non-gym role token | Redirect/forbidden |
| GYM-DASH-001 | P1 | UI | Dashboard | Load dashboard | Real status, members, check-ins, revenue; no demo data |
| GYM-DASH-002 | P1 | UI | Dashboard failure | API failure | Error/empty state, no crash |
| GYM-PROF-001 | P0 | UI | Profile | Save profile data | User app gym detail reflects changes |
| GYM-PROF-002 | P1 | UI | Media | Add/reorder/remove photos and videos | Gallery/cover updates |
| GYM-PROF-003 | P1 | UI | Media validation | Unsupported media/too many photos | Error shown |
| GYM-LOC-001 | P0 | UI | Location | Manual/GPS set valid location | Saved and locked after backend success |
| GYM-LOC-002 | P0 | UI | Location invalid | Blank/invalid/`0,0` | Rejected |
| GYM-HOUR-001 | P1 | UI | Operating hours | Apply global hours to all/open days | Schedules update |
| GYM-HOUR-002 | P1 | UI | Break time | Add break inside opening hours | Saved and shown in profile/user detail |
| GYM-HOUR-003 | P1 | UI | Break invalid | Break outside hours/end before start | Rejected |
| GYM-PLAN-001 | P0 | UI | Plans | Create 1/3/6/12 month package | One active plan per duration |
| GYM-PLAN-002 | P0 | UI | Plans | Duplicate duration | Blocked |
| GYM-PLAN-003 | P0 | UI | Plans | Edit/delete/deactivate/reactivate | Persisted and mobile reflects |
| GYM-PLAN-004 | P1 | UI | Sale price | Regular/sale price set | Discount displays correctly to user |
| GYM-PLAN-005 | P1 | UI | Day pass | Set/blank gym day pass price | Uses gym price or admin default |
| GYM-TRN-001 | P0 | UI | Trainers | Add monthly trainer | Trainer appears in list/mobile checkout |
| GYM-TRN-002 | P0 | UI | Trainers | Edit trainer monthly price/specialization | Persisted and checkout amount updates |
| GYM-TRN-003 | P1 | UI | Trainers | Deactivate trainer | Hidden from user checkout but searchable in portal |
| GYM-SESS-001 | P0 | UI | Sessions | Create special session from admin category | Saved and schedulable |
| GYM-SESS-002 | P1 | UI | Sessions | Edit session | Changes persist |
| GYM-SESS-003 | P1 | UI | Sessions | Bookings tab by date | Bookings show manual ID, member code, status, amount |
| GYM-MEM-001 | P0 | UI | Members | Load members | One row per relevant member/subscription; sanitized data |
| GYM-MEM-002 | P0 | UI | Members | Deactivate member | Confirmation, API success, list updates |
| GYM-MEM-003 | P0 | SEC | Members | Member from other gym | Not visible |
| GYM-HIST-001 | P1 | UI | Member history | Open member history | Subscription, trainer, visits, references shown compactly |
| GYM-HIST-002 | P1 | UI | Member history | Search/filter member | Correct member selected |
| GYM-SCAN-001 | P0 | UI | QR scanner | Scan valid QR | Success, session log updates |
| GYM-SCAN-002 | P0 | UI | Manual verify | Enter valid manual code | Same result as QR scan |
| GYM-SCAN-003 | P0 | UI | Invalid scan | Wrong/expired/duplicate/wrong-gym code | Denied message shown |
| GYM-SCAN-004 | P1 | UI | Camera permission denied | Open scanner | Manual fallback available |
| GYM-KYC-001 | P0 | UI | KYC | Submit each required section | Section locks in-review |
| GYM-KYC-002 | P0 | UI | KYC | Rejected section | Resubmission allowed |
| GYM-KYC-003 | P0 | UI | KYC | Approved section | Cannot resubmit |
| GYM-AM-001 | P1 | UI | Amenities | Toggle approved amenity | Persisted and public detail updates |
| GYM-AM-002 | P1 | UI | Amenities | Request new amenity | Pending request appears |
| GYM-SET-001 | P0 | UI | Settlement | Load settlement | Real current/lifetime/subscriber/payout data |
| GYM-SET-002 | P1 | UI | Settlement | Raise dispute | Reason persists after reload |
| GYM-REP-001 | P1 | UI | Reports | Period filters and chart | Real data, readable graph |
| GYM-REP-002 | P1 | UI | Reports | Export CSV | Correct rows/columns |
| GYM-REV-001 | P1 | UI | Reviews | Open reviews page | Average/count/table from real auto-published gym reviews |
| GYM-SETTINGS-001 | P1 | UI | Settings | Contact/password/notifications | Save/cancel/errors work |

### Additional Gym Portal Regression Cases

| ID | Priority | Type | Area | Scenario | Expected Result |
|---|---:|---|---|---|---|
| GYM-AUTH-005 | P0 | SEC | Token handling | Expired/malformed gym token opens protected route | Storage clears and user redirects to login |
| GYM-AUTH-006 | P1 | UI | 401 handling | API returns 401 on normal page or scanner | Normal page redirects; scanner/manual verify shows denial and retry |
| GYM-MENU-001 | P1 | UI | Mobile sidebar | Open/close sidebar on mobile viewport | Overlay, active route, and focus behavior work |
| GYM-MENU-002 | P1 | UI | Sidebar/sign out | Scroll sidebar, navigate, then sign out | Scroll state sane; sign-out clears gym storage/session |
| GYM-MENU-003 | P1 | UI | Branding/status | Branding API fails or gym pending/suspended/rejected | Safe fallback logo plus correct status banner |
| GYM-DASH-003 | P1 | UI | Dashboard partial failure | One dashboard API fails while others pass | Fulfilled KPIs render and failed area shows local error |
| GYM-CHK-001 | P1 | UI | Check-in records | Paginate/search check-in records | Sanitized member code/name only; pagination stable |
| GYM-CHK-002 | P1 | DATA | Check-in payout labels | Same-gym/day-pass/multi-gym check-ins exist | Same-gym/day-pass show no visit payout; multi-gym shows visit payout |
| GYM-CHK-003 | P1 | UI | Check-in empty/failure | No check-ins or API fails | Clear empty/error state, no fake records |
| GYM-MEM-004 | P0 | SEC | Members export | Export members CSV | CSV excludes phone/email/private user ids |
| GYM-MEM-005 | P1 | UI | Member deactivate failure | `canDeactivate=false` or API failure | Button hidden/disabled or error shown; list unchanged |
| GYM-HIST-003 | P0 | SEC | Member history deep link | Query param points to another gym's member | Member not exposed and safe empty/forbidden state shown |
| GYM-PROF-004 | P1 | UI | Profile categories | Categories fail to load or none selected | Profile save blocks or degrades safely with clear message |
| GYM-PLAN-006 | P1 | UI | Duration slots | All 1/3/6/12 month slots exist | Add disabled and duplicate cleanup state visible |
| GYM-PLAN-007 | P1 | UI | Price validation | Zero/negative/non-numeric plan/day-pass price | Validation blocks save |
| GYM-PLAN-008 | P1 | UI | Plan API failure | Create/edit/toggle/delete fails | UI state rolls back or refreshes; no phantom plan |
| GYM-KYC-004 | P0 | UI | KYC required fields | Submit all six KYC sections with missing/invalid data | Each section validates required fields correctly |
| GYM-KYC-005 | P1 | UI | KYC rejection note | Admin rejects a KYC section with note | Note/date visible; rejected section reopens for edit |
| GYM-SESS-004 | P1 | UI | Standard sessions | Try edit/delete/toggle standard generated sessions | Protected standard sessions cannot be mutated incorrectly |
| GYM-SESS-005 | P1 | UI | Category load failure | Session categories fail to load | Session page still handles existing sessions safely |
| GYM-REV-002 | P1 | SEC | Review privacy | Gym opens reviews page | Shows safe member code/name only, no phone/email/raw user id |
| GYM-REV-003 | P1 | UI | Reviews refresh/failure | Refresh reviews, no reviews, or API failure | Correct refresh, empty, and error states |
| GYM-SETTINGS-002 | P1 | UI | Settings cancel | Edit contact fields then cancel | Original values restore |
| GYM-SETTINGS-003 | P1 | UI | Password form | Missing/mismatch/wrong-current/success cases | Validation/errors work and success clears password fields |
| GYM-SETTINGS-004 | P1 | UI | Location states | GPS denied/unavailable, manual entry, locked location | Correct state and locked read-only behavior |
| GYM-REP-003 | P1 | UI | Report custom dates | Empty, inverted, or missing custom range | Clear validation and no broken chart |

## Admin, Wellness, Corporate, Landing Test Cases

| ID | Priority | Type | Area | Scenario | Expected Result |
|---|---:|---|---|---|---|
| ADM-LOGIN-001 | P0 | UI | Admin login | Valid super admin login | Admin dashboard opens |
| ADM-LOGIN-002 | P0 | SEC | Admin login | Wrong role/expired token | Redirect/forbidden |
| ADM-DASH-001 | P1 | UI | Dashboard | Load dashboard/analytics | Real KPIs, no stale demo data |
| ADM-SET-001 | P0 | UI | Settings | Save branding/logo/text | Shell updates after reload across portals where global branding is used |
| ADM-SET-002 | P0 | UI | Settings | API save failure | Error shown, old data remains |
| ADM-PLAN-001 | P0 | UI | Plan management | Update global commission/day pass/multi-gym/PT/wellness | Persisted and backend config reflects |
| ADM-PLAN-002 | P0 | UI | Plan management | Negative/blank/huge values | Rejected/clamped safely |
| ADM-GYM-001 | P0 | UI | Gym management | Approve/activate gym with valid KYC/location | Gym becomes public |
| ADM-GYM-002 | P0 | UI | Gym management | Approve gym missing location/KYC | Disabled or rejected |
| ADM-GYM-003 | P0 | UI | Gym management | Suspend/deactivate/reactivate | Status and public visibility update |
| ADM-GYM-004 | P1 | UI | Gym management | Dropdown/actions inside table | Menu visible and not clipped |
| ADM-KYC-001 | P0 | UI | KYC review | Approve/reject individual KYC doc | Section status and notes update |
| ADM-KYC-002 | P0 | UI | KYC review | Approve all | Only succeeds if all required docs valid |
| ADM-CAT-001 | P0 | UI | Categories | Add/edit/delete category with icon | Mobile/gym session dropdown sees update |
| ADM-AM-001 | P0 | UI | Amenities | Add/edit/delete/approve amenity with icon | Gym/mobile display icon |
| ADM-AM-002 | P1 | UI | Icons | Upload invalid/large icon | Error shown |
| ADM-SUB-001 | P0 | UI | Subscriptions | List/search/filter subscriptions | User, gym, plan, order, status visible |
| ADM-USER-001 | P0 | UI | Users | Search/suspend/restore users | Status persisted |
| ADM-BOOK-001 | P0 | UI | Bookings | Filter/export bookings | Manual ID, user code, gym, status, amount correct |
| ADM-CHK-001 | P0 | UI | Check-ins | Filter by gym/date/plan/status | Results and clear filters work |
| ADM-RATE-001 | P1 | UI | Ratings | Approve/reject non-auto review | Aggregates refresh for moderated trainer/wellness/admin-created reviews |
| ADM-SETTLE-001 | P0 | UI | Settlements | Generate/approve/pay settlement | Correct state transitions |
| ADM-WELL-001 | P0 | UI | Wellness | Create/edit/deactivate partner | Public/partner portal visibility correct |
| ADM-WELL-002 | P0 | UI | Wellness services | Create/edit/approve/reject service | Mobile visibility and booking eligibility correct |
| ADM-HOME-001 | P1 | UI | Homepage | Change banner/text/sections | Landing/mobile homepage config reflects |
| ADM-STORE-001 | P1 | UI | Store | Product CRUD/order ship | Mobile/store reflects and order status updates |
| ADM-CORP-001 | P1 | UI | Corporate | Create/approve corporate, manage employees | Corporate portal reflects |
| ADM-AUTH-003 | P0 | SEC | Protected admin routes | Gym/end-user/corporate/wellness token opens admin route | Route rejects and redirects/forbids safely |
| ADM-MENU-001 | P1 | UI | Sidebar routes | Inspect admin sidebar and nested routes | All implemented routes reachable and active state correct |
| ADM-MENU-002 | P1 | UI | Sign out/branding | Admin signs out or branding API fails | Storage clears and fallback logo/text renders |
| ADM-DASH-002 | P1 | UI | Dashboard partial failure | Dashboard API partially fails | No stale/fake KPIs; quick links remain usable |
| ADM-ANALYTICS-001 | P1 | UI | Analytics empty/failure | Analytics API empty or fails | Empty charts/tables render safely |
| ADM-GYM-005 | P1 | UI | Gym filters | Search/status pagination in gym table | Page resets/preserves filters correctly |
| ADM-GYM-006 | P0 | UI | Admin gym edit validation | Edit location, payout, day pass, capacity | Invalid values blocked and corrected values persist |
| ADM-GYM-007 | P1 | UI | Gym modal failure | View/edit modal API fails | List state remains unchanged with clear error |
| ADM-KYC-003 | P0 | UI | KYC reject note | Reject document, cancel reject, approve after reject | Note propagates to gym and cancel has no side effect |
| ADM-KYC-004 | P1 | UI | KYC tabs | Pending tab maps `in_review`, empty/filter states | Correct counts and empty states |
| ADM-KYC-005 | P0 | UI | Overall KYC approval gate | Approve gym before all docs/location valid | Overall approval remains blocked |
| ADM-PLAN-003 | P0 | UI | Plan settings load failure | Plan management config fails to load | Save disabled and no accidental overwrite |
| ADM-PLAN-004 | P0 | UI | Commission preview | Percent/fixed/global override values set per service | Preview math matches backend checkout math |
| ADM-SET-003 | P0 | UI | Admin user management | Add/deactivate admin, duplicate/self/last-admin cases | Validation and protections work |
| ADM-SET-004 | P1 | UI | Branding validation | Invalid logo URL or save failure | Fallback/rollback works and old branding remains |
| ADM-RATE-002 | P1 | UI | Auto-published reviews | Eligible gym review is submitted | Appears in approved/read-only list, not pending |
| ADM-RATE-003 | P1 | UI | Ratings pagination/failure | Change tabs/pages or action fails | Empty/loading/failure states correct |
| ADM-SUB-002 | P1 | SEC | Subscription privacy | Search subscriptions with Cashfree ids | Sensitive ids displayed safely and no private user data overexposed |
| ADM-BOOK-002 | P1 | SEC | Booking export | Export bookings with special characters | CSV escaping works and private data excluded |
| ADM-CHK-002 | P1 | SEC | Check-in records | Load failed/flagged check-ins | Privacy and status rendering correct |
| ADM-ATT-001 | P1 | UI | Attendance | Attendance log/summary filters | Month/date filters, pagination, empty states work |
| ADM-SETTLE-002 | P0 | UI | Settlement generation | Invalid/duplicate/failing settlement period | Modal validates and failures do not create duplicate rows |
| ADM-SETTLE-003 | P0 | UI | Settlement transitions | Paid settlement shown | Invalid transitions hidden/blocked |
| ADM-CAT-002 | P1 | UI | Master data partial failure | Categories load and amenities fail, or reverse | Healthy side still renders and failed side shows error |
| ADM-CAT-003 | P1 | UI | Amenity requests | Approve/reject requested amenity | Source labels and list refresh correctly |
| ADM-NOTIF-001 | P1 | UI | Notifications | Broadcast by role, send to user, mark read | Targeting and read state persist |
| ADM-NOTIF-002 | P1 | UI | Notification failure | Send/broadcast fails | Form/list preserved with error |
| ADM-FRAUD-001 | P1 | UI | Fraud alerts | Paginate/filter/flag/clear fraud alerts | Risk/status lifecycle renders correctly |
| ADM-FRAUD-002 | P1 | SEC | Fraud privacy | Fraud alerts include users/devices | Safe ids only; no phone/email leakage |
| WELL-LOGIN-001 | P0 | UI | Wellness portal | Valid partner login | Dashboard opens scoped to partner |
| WELL-SVC-001 | P0 | UI | Services | Add/edit/delete service | Pending/admin approval behavior correct |
| WELL-BOOK-001 | P0 | UI | Bookings | Update pending/confirmed/completed/cancelled | Status persists |
| WELL-EARN-001 | P1 | UI | Earnings | Load earnings page | Gross, commission, net, monthly chart real |
| CORP-AUTH-001 | P0 | UI | Corporate signup/login | Valid signup/login | Corporate dashboard opens |
| CORP-EMP-001 | P0 | UI | Employees | Add/search/filter/suspend/reactivate | Seats and list update |
| CORP-BULK-001 | P1 | UI | Bulk import | Invalid/empty CSV | Clear error, no silent success |
| CORP-ASSIGN-001 | P0 | UI | Seat assignment | Assign plans within seats | Assigned/available seats update |
| CORP-USAGE-001 | P1 | UI | Usage | Department/date filters/export | Correct usage rows |
| CORP-BILL-001 | P1 | UI | Billing | Invoice/top-up/payment modal | Validations and errors work |
| LAND-001 | P1 | UI | Landing | CTA/footer links | Gym/corporate onboarding and delete-account links work |
| LAND-002 | P1 | UI | Delete account | Open `/delete-account` | Policy text and support mailto present |
| LAND-003 | P0 | UI | Gym onboarding | Valid gym onboarding | Registration API called, success/pending state |
| LAND-004 | P0 | UI | Gym onboarding | Categories unavailable | Submit blocked with clear error |

## Cross-Portal E2E Journeys

| ID | Priority | Type | Journey | Steps | Expected Result |
|---|---:|---|---|---|---|
| E2E-001 | P0 | E2E | Gym onboarding to public listing | Gym registers, sets profile/location/media, submits KYC, admin approves all, mobile searches gym | Gym appears publicly with correct profile data and no internal fields |
| E2E-002 | P0 | E2E | Same-gym subscription lifecycle | User buys same-gym plan, payment succeeds, gym members/admin subscriptions update, user sees subscribed state | No duplicate purchase before expiry; booking works only at that gym |
| E2E-003 | P0 | E2E | Multi-gym subscription and visit payout | User buys multi-gym, books/scans at gym A, attempts second gym same day | First success with configured payout, second blocked |
| E2E-004 | P0 | E2E | QR and manual verification parity | User books session, gym scans QR; repeat with fresh booking and manual code | Both use same validations and attendance state |
| E2E-005 | P0 | E2E | Payment failure safety | Start subscription payment then cancel/fail/drop Cashfree | No active subscription, no member row as active, pending cleanup works |
| E2E-006 | P0 | E2E | Trainer add-on | Gym creates monthly trainer, user selects in checkout, payment succeeds | Gym member history shows trainer and gym-facing trainer amount |
| E2E-007 | P0 | E2E | Settlement reporting | Complete same-gym, day-pass, PT, multi-gym transactions, generate settlement | Admin sees full amounts; gym sees gym-facing amounts and payout states |
| E2E-008 | P1 | E2E | Rating flow | User has same-gym/day-pass access or checks in, submits gym rating, mobile/gym reviews refresh | Review auto-publishes; real aggregate rating and review count update without admin approval |
| E2E-009 | P1 | E2E | Amenity request flow | Gym requests amenity, admin approves, gym selects it, mobile gym detail shows icon | Icon and label visible everywhere |
| E2E-010 | P1 | E2E | Account deletion | User with history deletes account, then admin/gym reports load | User cannot login; financial/check-in records retained/anonymized as required |

## Build, Deployment, And APK Test Cases

| ID | Priority | Type | Area | Scenario | Expected Result |
|---|---:|---|---|---|---|
| BUILD-001 | P0 | BUILD | Local checks | Run affected `tsc`, builds, backend tests | Pass before deployment |
| BUILD-002 | P0 | BUILD | Git flow | Commit source only and push `main` to `nikhilesh121/bookmyfit` | Generated artifacts not committed |
| BUILD-003 | P0 | BUILD | Live pull | SSH live `/var/www/html/bookmyfit`, `git pull --ff-only origin main` | Live head matches GitHub head |
| BUILD-004 | P0 | BUILD | Backend deploy | Backend/entity/migration changed | Build backend, run migrations, restart `bmf-backend`, verify `/api/v1/health` |
| BUILD-005 | P0 | BUILD | Web deploy | Admin/gym/landing/corp/wellness changed | Build affected app and restart only affected PM2 service |
| BUILD-006 | P0 | BUILD | Live smoke | Open live API and portal URLs | No white screens; auth pages load; key API calls return |
| BUILD-007 | P0 | BUILD | APK build | Mobile changed | Build APK with `EXPO_PUBLIC_API_URL=https://bookmyfit.in` |
| BUILD-008 | P0 | BUILD | APK config audit | Inspect APK `assets/app.config` and bundle | Live API/Cashfree base URLs present; no localhost |
| BUILD-009 | P1 | BUILD | APK install smoke | Install on Android phone | Permission prompt, login, gym list, subscription, booking, QR pages open |
| BUILD-010 | P1 | BUILD | Play policy | Profile delete-account option and public delete page | Available and functional |
| DEP-GIT-001 | P0 | BUILD | Git diff hygiene | Prepare release branch/commit | Source-only diff; generated artifacts and local builds not staged unless explicitly intended |
| DEP-GIT-002 | P0 | BUILD | Git remote/branch | Check local and live remotes/branches | Origin is `nikhilesh121/bookmyfit` and intended branch matches release plan |
| DEP-GIT-003 | P0 | BUILD | Live repo guard | Inspect live `/var/www/html/bookmyfit` before pull | Correct repo path/remote and no unexpected dirty worktree |
| DEP-GIT-004 | P0 | BUILD | Fast-forward pull | Run live pull with non-ff or conflict state | Deployment aborts safely and reports required manual action |
| DEP-GIT-005 | P0 | BUILD | SHA parity | Compare local, GitHub, and live SHA after deployment | Live SHA matches pushed release SHA |
| DEP-MIG-001 | P0 | BUILD | Migration inventory | Backend/entity/migration changed | Pending migrations listed before live deploy |
| DEP-MIG-002 | P0 | BUILD | DB target guard | Run migration command | Confirms intended DB target/environment before modifying data |
| DEP-MIG-003 | P0 | BUILD | Backup before migration | Migration includes data backfill/destructive risk | Backup or snapshot exists before migration |
| DEP-MIG-004 | P0 | BUILD | Migration idempotency | Run migration once and inspect table | Migration recorded once and data backfill matches expected counts |
| DEP-MIG-005 | P0 | BUILD | Migration failure recovery | Simulate failed migration in staging/local clone | Recovery/forward-fix path documented and verified |
| DEP-ENV-001 | P0 | BUILD | Live env required vars | Inspect live `.env` safely | Required API, DB, JWT, Cashfree, QR, CORS, storage variables present |
| DEP-ENV-002 | P0 | SEC | No dev secrets live | Inspect live env/build config | No localhost URLs, default secrets, mock payment mode, or dev OTP leakage in production |
| DEP-ENV-003 | P0 | BUILD | Production DB safety | Check TypeORM/prod config | `NODE_ENV=production`, synchronize off, DB SSL/connection as intended |
| DEP-ENV-004 | P0 | BUILD | Public API URLs | Build web/mobile release artifacts | `NEXT_PUBLIC_API_URL`/Expo API URL point to live API |
| DEP-ENV-005 | P1 | BUILD | Domain/TLS/CORS | Smoke live domains | TLS valid and CORS allows only configured portals/app origins |
| DEP-ENV-006 | P0 | BUILD | External service env | Smoke storage, SMS/email, Redis/QR, webhook secrets | All configured services use live/staging-safe credentials and fail clearly when unavailable |
| APK-REL-001 | P0 | BUILD | APK/AAB release artifact | Build app for release | APK sideload and AAB Play artifact available as required |
| APK-REL-002 | P0 | BUILD | Versioning | Build new mobile release | `versionCode`/`versionName` increment correctly |
| APK-REL-003 | P0 | SEC | Signing | Inspect release artifact | Release signed, not debug signed |
| APK-REL-004 | P0 | BUILD | Android config audit | Inspect package, scheme, target SDK, permissions | Matches Play Store/package policy and deep-link/payment needs |
| APK-REL-005 | P0 | SEC | Bundle URL scan | Inspect APK/AAB bundle assets | Live API/Cashfree URLs only; no localhost/mock secrets |
| APK-REL-006 | P1 | BUILD | Fresh install smoke | Install release app on Android device | Permissions, login, gym list, subscription, booking, QR open |
| APK-REL-007 | P1 | BUILD | Upgrade smoke | Upgrade over previous installed build | Session/data migration works and no crash on first open |
| APK-REL-008 | P0 | BUILD | Payment deep link | Test payment return on installed app | Deep link/webview return verifies and routes correctly |
| PLAY-POL-001 | P0 | BUILD | Play pre-launch | Upload AAB to internal testing | Pre-launch report has no P0 crashes/security blockers |
| PLAY-POL-002 | P0 | BUILD | Target API | Inspect Android target SDK | Meets current Google Play target API requirement |
| PLAY-POL-003 | P0 | SEC | Data Safety | Compare Play Data Safety form to app behavior | Declared data collection/sharing matches actual permissions/API usage |
| PLAY-POL-004 | P0 | SEC | Privacy/account deletion | Open privacy policy and delete-account paths | Policy active; in-app and web deletion available |
| PLAY-POL-005 | P1 | SEC | Permission justification | Review camera/location permissions | Permissions are needed, prompted contextually, and explained in store policy text |
| PLAY-POL-006 | P1 | BUILD | Store listing readiness | Review Play listing, content rating, support, refund/contact details | Listing disclosures match BookMyFit features and support paths |
| OPS-MON-001 | P0 | BUILD | Deep health | Check API health plus DB/Redis readiness | Health/monitoring confirms dependencies, not only HTTP process |
| OPS-MON-002 | P0 | BUILD | PM2/nginx logs | After deploy, inspect logs | No boot loops, 5xx spikes, or asset 404s |
| OPS-MON-003 | P1 | BUILD | Alerts | Check uptime/SSL/disk/CPU/DB backup monitoring | Alerts configured and recent backup freshness known |
| OPS-MON-004 | P1 | BUILD | Business anomaly alerts | Trigger/inspect payment, webhook, QR, check-in failures | Errors are logged and alertable |
| ROLL-001 | P0 | BUILD | Backend rollback | Roll backend to previous SHA in staging/live drill | Previous version restarts and health passes |
| ROLL-002 | P0 | BUILD | Web rollback | Roll affected portal build/PM2 service | Previous build serves without white screen |
| ROLL-003 | P0 | BUILD | DB rollback/forward fix | Migration causes data problem in drill | Backup/revert/forward-fix process verified |
| ROLL-004 | P0 | BUILD | APK staged rollout halt | Bad mobile release detected | Play staged rollout can halt/rollback to prior build |
| ROLL-005 | P0 | SEC | Env/secrets rollback | Bad payment/API secret deployed | Previous env restored and affected services restart cleanly |
| ROLL-006 | P0 | BUILD | Rollback evidence | Rollback completed | SHA, PM2 status, health check, and smoke-test evidence captured |
| QA-EXEC-001 | P0 | BUILD | Evidence per test ID | Execute release regression | Each P0/P1 test has pass/fail/block evidence and SHA |
| QA-EXEC-002 | P0 | BUILD | Seeded data gate | Run E2E/manual suite | Required gyms/users/subscriptions/payments/check-ins exist before testing |
| QA-EXEC-003 | P1 | BUILD | Device/network matrix | Test Android widths, OS versions, slow/offline network | Results captured and defects linked |
| QA-EXEC-004 | P0 | BUILD | Waiver gate | P0/P1 test blocked or failed | Release blocked unless explicit stakeholder waiver exists |
| QA-EXEC-005 | P0 | BUILD | Defect retest trace | Fix a failed test case | Defect ticket, fix SHA, retest evidence, and release decision are linked |

## Automation Recommendations

Start with these automated tests because they catch the highest-risk regressions:

1. Backend Jest integration tests for `subscriptions`, `payments`, `qr`, `sessions`, `gyms`, `gym-plans`, `kyc`, and `settlements`.
2. API contract tests for public gym privacy and no-demo-data empty responses.
3. Playwright tests for admin, gym portal, and landing registration/account deletion.
4. Mobile Detox or Maestro tests for login, GPS prompt, gym list, plan checkout, payment return, QR screen, and account deletion.
5. Deployment smoke script that checks live health, portal HTTP 200, APK config, and Git head consistency.

## Known Documentation Consistency Items

These should be checked before release because docs and current implementation names differ in places:
- Older docs mention Razorpay, current implementation uses Cashfree.
- Older docs use Pro/Max/Elite naming, current flows include same-gym, day pass, and multi-gym.
- Older deployment docs mention Vercel/AWS future state, current live flow is GitHub to PM2/nginx server.
- Older docs mention 30-second QR expiry; current booking QR page may show longer booking validity. QA should verify the intended product rule and update docs/code consistently.
