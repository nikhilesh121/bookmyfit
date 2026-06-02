# BookMyFit Test Execution Report

Date: 2026-05-30

This report records what was actually executed locally after opening Docker, Postgres, Redis, the backend, web portals, and the Android emulator. I did not mark camera QR, physical-device GPS variance, Play Console, live deployment, or live Cashfree credentials as passed because those still need external hardware/services or production credentials.

## 2026-06-02 E2E Local QA Pass

Local runtime:
- Docker/Postgres/Redis were available locally.
- Backend was running on `http://localhost:3003/api/v1`.
- Admin, gym, corporate, wellness, and mobile web servers were started locally.
- Database migration and seed were run before the API pass.

Fixes applied during this pass:
- `backend/src/modules/users/users.module.ts`
  - Added validation decorators to `UpdateUserDto`.
  - Root cause: global `ValidationPipe({ whitelist: true })` stripped profile update fields, so `PUT /users/me` returned 200 but did not persist profile edits.
- `backend/src/modules/sessions/sessions.module.ts`
  - Hardened admin attendance pagination parsing.
  - Root cause: missing/invalid `page` query could become `NaN`, causing TypeORM `skip` to throw and `/sessions/admin/attendance` to return 500.

Verification summary:

| Check | Result |
|---|---|
| Backend API E2E smoke | Passed: 67 pass, 0 fail, 2 skipped |
| Portal/mobile route smoke | Passed: 46 pass, 0 fail |
| `pnpm --filter backend test` | Passed: 2 suites, 6 tests |
| `pnpm --filter backend build` | Passed |
| `pnpm --filter mobile exec tsc --noEmit -p tsconfig.json` | Passed |
| `pnpm --filter admin-panel build` | Passed with existing image optimization warnings only |
| `pnpm --filter gym-panel build` | Passed |
| `pnpm --filter corporate-panel build` | Passed |
| `pnpm --filter @bmf/wellness-portal build` | Passed |
| `pnpm --filter mobile exec expo export --platform web --output-dir dist-web` | Passed |

API E2E highlights:
- User OTP test login passed for `9040283338`.
- User profile update now persists after reload.
- Admin gym, subscription, wellness, ratings, pricing, and attendance APIs passed.
- Gym members, reviews, checkins, reports, plans, operating schedule, session types, and bookings APIs passed.
- Gym member API did not expose phone-like personal numbers in member rows.
- Subscribed-user gym review was auto-approved and visible in public gym ratings.
- QR generation returned a token for an active subscription.
- Wellness partner multi-service update and filtering passed.
- Corporate employee add, duplicate block, and cleanup passed.
- Gym registration created a pending partner account.

Skipped in API E2E:
- Active booking manual-code verification was skipped because the seeded user had no active booking at test time.
- Duplicate gym-plan duration create was skipped because the seeded gym owner currently had no plans in the local DB.

Local URLs:

| Service | URL |
|---|---|
| Backend API | `http://localhost:3003/api/v1` |
| Swagger | `http://localhost:3003/api/docs` |
| Gym panel | `http://localhost:3001/login` |
| Corporate panel | `http://localhost:3002/login` |
| Admin panel | `http://localhost:3004/login` |
| Wellness portal | `http://localhost:3005/login` |
| Mobile web export | `http://localhost:8081` |

Evidence files:
- `artifacts/e2e-2026-06-02/api-smoke-results.json`
- `artifacts/e2e-2026-06-02/route-smoke-results.json`
- `artifacts/e2e-2026-06-02/backend.out.log`
- `artifacts/e2e-2026-06-02/admin.out.log`
- `artifacts/e2e-2026-06-02/gym.out.log`
- `artifacts/e2e-2026-06-02/corporate.out.log`
- `artifacts/e2e-2026-06-02/wellness.out.log`
- `artifacts/e2e-2026-06-02/mobile-web.out.log`

Still needs physical-device/manual pass:
- Real Android/iOS GPS permission prompt and nearby sorting behavior.
- Camera QR scanner behavior.
- Native Cashfree WebView completion using current live/test credentials.
- APK install icon/splash/safe-area/navbar behavior on actual phones.
- Manual booking code validation with a live active booking fixture.

## 2026-05-30 QA Addendum

Local services were rechecked with the backend on `http://localhost:3003`, Metro on `8081`, and the Android emulator `emulator-5554`.

| Area | Status | Evidence |
|---|---|---|
| Backend health | Passed | `GET /api/v1/health` returned `ok` after backend restart |
| Backend TypeScript | Passed | `pnpm.cmd --filter backend exec tsc --noEmit` |
| Backend Jest | Passed | 2 suites, 6 tests |
| Mobile TypeScript | Passed | `pnpm.cmd --filter mobile exec tsc --noEmit` |
| Portal route smoke | Passed | 48/48 authenticated gym/admin/corporate/wellness routes passed |
| Android home/GPS smoke | Partial pass | Fresh emulator launch loaded Home; stale city fallback fixed to show `Nearby` until fresh GPS resolves |
| Android QR smoke | Partial | QR route requires active logged-in app session; QR code screen source now scrolls so manual code cannot clip on short screens |
| Review flow | Passed API | User `9040283338` with active gym subscription submitted review; review auto-approved, duplicate review collapsed to one record, public response hides `userId` |
| Cashfree stuck return | Code fixed / needs payment pass | Mobile now exposes delayed manual verify recovery and already detects Cashfree "Go to the next step" fallback |

Fixes applied during this pass:

- Mobile nearby location cache now expires and app-open listing pages force a fresh GPS lookup before using saved city.
- Home and Explore no longer show `Bhubaneswar` as the primary default; they show `Nearby` until GPS or saved city is available.
- Gym, wellness, spa, multi-gym, trainer, and home-service lists request fresh location for nearby sorting.
- Payment WebView now shows a delayed secure "I have completed payment" verification option instead of leaving users stuck forever.
- Review screen blocks empty target submissions and uses truthful published/submitted copy based on API status.
- QR screen content is scrollable so manual verification code and instructions do not clip on small phones.
- Cancelled subscriptions are no longer counted as paid gym revenue in gym reports/settlements.
- KYC approval no longer silently reactivates suspended or inactive gyms.
- Gym reviews update an existing user/target review instead of creating unlimited duplicates.
- Public gym review responses expose member code/display name only, not raw `userId`.
- QR/manual daily check-in limit now checks the database as well as Redis.

Remaining items from agent/manual audit:

| Area | Remaining risk |
|---|---|
| Physical mobile QA | Camera scanner, real Android/iOS safe areas, and real GPS permission/device-service behavior still need a physical phone pass |
| Live Cashfree | Production Cashfree credentials and live return/webhook behavior still need live credentials |
| Admin filters | Admin check-in date/status/plan filters need backend filtering support; subscriptions/ratings KPI totals are still page-local in some screens |
| Settlement depth | More fixture-based tests are needed for commission, trainer add-on, cancelled duplicate, and multi-gym payout edge cases |
| Health endpoint | `/health` is shallow; a future `/health/deep` should query Postgres and Redis |

## Summary

| Area | Status | Evidence |
|---|---|---|
| Docker/Postgres/Redis | Passed | Docker Desktop started; `bmf-postgres` on `5432`; `bmf-redis` on `6379` |
| Migrations and seed | Passed | Backend migrations ran; `pnpm --filter backend seed:run` completed |
| Backend runtime | Passed | `GET http://localhost:3003/api/v1/health` returned `ok` |
| Backend Jest | Passed | 2 suites, 6 tests |
| Backend build | Passed | Nest build completed after the check-in stats fix |
| Backend TypeScript | Passed | `tsc --noEmit` completed |
| Mobile TypeScript | Passed | `tsc --noEmit` completed |
| Android emulator smoke | Passed | Installed/running debug app on `emulator-5554`; user login/session, home, gyms, gym detail, plans, checkout, profile, bookings, passes, and payment screens opened |
| Mobile web export | Passed | Expo web export completed to `apps/mobile/dist-web` |
| Web portal builds/routes | Passed | Admin build passed; 48 authenticated portal routes passed on gym/admin/corporate/wellness local portals |
| API smoke | Passed | 45/45 API checks passed |
| API extra smoke | Passed | 7/7 extra API checks passed after fixing `/checkins/stats` |
| Route smoke | Passed | 74/74 local routes returned HTTP 200 after restarting frontend servers |
| APK static audit | Partial | Existing live APK config points to live API and production Cashfree; test-live APK must be built with sandbox Cashfree base URL while test keys are used |
| Native Android/iOS QA | Partial | Android emulator tested; physical Android/iOS device and camera scanner still need device pass |
| Cashfree sandbox payment return | Passed locally | Android WebView sandbox card -> OTP `111000` -> SUCCESS -> app success screen -> active subscription verified by API |
| Full manual E2E matrix | Partial | Local runtime is ready, but many scenario flows still need device, payment, and fixture-specific manual execution |

## Execution Matrix

Full per-test status file:

`BOOKMYFIT_TEST_EXECUTION_MATRIX.csv`

| Status | Count |
|---|---:|
| PASS | 44 |
| PARTIAL_API | 9 |
| PARTIAL_BUILD | 9 |
| PARTIAL_DATA | 1 |
| PARTIAL_EXECUTED | 3 |
| PARTIAL_UNIT | 1 |
| NOT_RUN_READY | 321 |
| NOT_RUN | 4 |
| BLOCKED_EXTERNAL | 51 |
| BLOCKED_HARDWARE | 98 |
| FAIL | 2 |
| Total | 543 |

`NOT_RUN_READY` means the old backend-env blocker is gone, but the exact manual/E2E scenario was not fully executed in this pass.

## Fix Applied During QA

`GET /api/v1/checkins/stats` was failing with a 500 when `month` was omitted because the service called `month.split(...)` on `undefined`.

Fixed in `backend/src/modules/checkins/checkins.module.ts`:

- defaults missing `month` to the current `YYYY-MM`
- validates malformed months and returns `400`
- verified with gym token: omitted month returns `2026-05`; bad month returns `400`

### 2026-05-29 Mobile Payment Fix

The Android Cashfree WebView was showing BookMyFit's own "Taking too long?" overlay while the Cashfree checkout was still active. On the emulator that overlay could cover the Cashfree action area before the user finished the sandbox payment.

Fixed in `apps/mobile/app/payment-webview.tsx`:

- removed the automatic 14-second manual-confirm overlay for real Cashfree sessions
- kept secure verification through `/payments/verify/:orderId`
- verified on Android emulator with sandbox card flow: select card, proceed, OTP `111000`, SUCCESS, app success screen

Also adjusted `apps/mobile/app/gyms.tsx` so the GPS banner distinguishes permission denied from permission granted but GPS unavailable.

## Commands Executed

| Command | Result |
|---|---|
| `docker compose up -d postgres redis` | Passed |
| `pnpm.cmd --filter backend migration:run` | Passed |
| `pnpm.cmd --filter backend seed:run` | Passed |
| `pnpm.cmd --filter backend test -- --runInBand` | Passed |
| `pnpm.cmd --filter backend build` | Passed |
| `pnpm.cmd --filter backend exec tsc --noEmit` | Passed |
| `pnpm.cmd --filter mobile exec tsc --noEmit` | Passed |
| Android emulator debug app smoke | Passed |
| Android Cashfree sandbox checkout | Passed |
| Same-gym duplicate purchase API check | Passed |
| Subscribed-user review API check | Passed |
| Authenticated portal route smoke | Passed 48/48 |
| `pnpm.cmd --dir apps/mobile exec expo export --platform web --output-dir dist-web` | Passed |
| Web app builds | Passed sequentially |
| API smoke script | Passed 45/45 |
| API extra smoke script | Passed 7/7 |
| Route smoke script | Passed 74/74 |

## Local Services

| Service | URL | Status |
|---|---|---|
| Gym panel | `http://localhost:3001` | Running |
| Corporate panel | `http://localhost:3002` | Running |
| Backend API | `http://localhost:3003` | Running |
| Admin panel | `http://localhost:3004` | Running |
| Wellness portal | `http://localhost:3005` | Running |
| Landing | `http://localhost:5004` | Running |
| Mobile web export | `http://localhost:8081` | Running |

## Evidence Files

| Evidence | Path |
|---|---|
| API smoke | `artifacts/api-smoke-2026-05-26/api-smoke.csv` |
| API extra smoke | `artifacts/api-smoke-2026-05-26/api-extra.csv` |
| Route smoke | `artifacts/qa-route-smoke-2026-05-26/route-smoke.csv` |
| Previous APK static audit | `artifacts/apk-audit-2026-05-25/` |
| 2026-05-29 portal smoke | `artifacts/qa-manual-2026-05-29/portal-smoke-results.json` |
| 2026-05-29 Android screenshots/XML | `artifacts/qa-manual-2026-05-29/android/` |
| Android payment success screenshot | `artifacts/qa-manual-2026-05-29/android/payment-after-submit.png` |

## Important Findings

| Finding | Status |
|---|---|
| Corporate seeded password is `hr1234`, not `corp123` | Documented; login passes with `hr1234` |
| Review flow for subscribed user | API passed: review auto-approved and appears in public gym ratings and gym my-reviews |
| Android Cashfree sandbox checkout | Passed locally after removing the premature manual overlay; subscription became `active` with order `SUB_20a378b8-34ba-4b3a` |
| Same-gym duplicate purchase blocking | API passed: second purchase for the same active gym returned `400` with active-pass expiry message |
| Live/test payment config | Existing live API APK used production Cashfree base URL; while test credentials are active, build APK with `EXPO_PUBLIC_CASHFREE_BASE_URL=https://sandbox.cashfree.com` |
| Gyms Near You GPS banner | Fixed misleading copy when permission is granted but emulator GPS coordinates are unavailable |
| Gym members API | API passed: returned members for gym and used member codes with phone hidden |
| Same-gym QR check-in | API passed; gym payout was `0` for same-gym check-in |
| `/checkins/stats` missing month | Fixed and verified |
| Frontend white/500 pages after builds | Fixed locally by restarting frontend dev servers and clearing generated `.next` folders |

## Still Blocked

These cannot be honestly passed from this machine yet:

| Blocker | Affected Areas |
|---|---|
| No physical Android/iOS device pass yet | Real phone GPS variance, camera QR scanner, native safe-area/navbar on multiple devices |
| Live Cashfree credentials not tested | Production-mode payment success/failure/deep-link finalization |
| No Play Console access | Internal testing upload, pre-launch report, Data Safety verification |
| No live deploy in this pass | GitHub/live SHA parity, PM2/nginx verification, live smoke |
| Thin QA fixtures for some exact states | KYC approve/reject permutations, valid manual booking code, settlement periods, expired/cancelled booking variants |

## Next QA Step

To complete the remaining blocked cases, run the same Android payment/QR/GPS pass on a physical phone, verify camera QR scanning with a real booking, test production Cashfree credentials when available, and create fixture records for KYC states, manual booking verification, settlements, and expired/cancelled subscriptions.
