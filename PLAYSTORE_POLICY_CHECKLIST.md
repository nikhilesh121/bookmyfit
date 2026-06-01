# BookMyFit Play Store Policy Checklist

Last updated: 1 June 2026

## App details

- App name: BookMyFit
- Package name: `in.bookmyfit.app`
- Default language: English (United Kingdom) - `en-GB`
- App or game: App
- Free or paid: Free
- Developer contact for policies: `support@bookmyfit.in`

## Public policy URLs

Use these URLs in Google Play Console after the landing app is deployed:

- Privacy Policy: `https://bookmyfit.in/privacy`
- Account deletion request: `https://bookmyfit.in/delete-account`
- Terms of Service: `https://bookmyfit.in/terms`
- Refund Policy: `https://bookmyfit.in/refund`

## In-app policy and deletion paths

- Privacy policy in app: Profile -> Privacy & Security
- Account deletion in app: Profile -> Delete Account
- Web account deletion fallback: `https://bookmyfit.in/delete-account`

## Data safety notes

BookMyFit handles user account data, phone/login data, bookings, subscriptions,
payments references, invoices, location for nearby sorting, camera access for QR
check-in, reviews, support data, and operational logs. Payment card/UPI details
are processed by the payment gateway; BookMyFit stores order IDs, payment status,
invoice references, and related transaction records.

The Play Console Data safety form must match the final app behavior, SDKs, and
privacy policy before publishing.

## Play review OTP access

Production OTP is configured through MSG91 SMS OTP when backend environment
variables are present. Keep a reviewer-only OTP bypass active for the Play review
account so Google can enter the app without receiving SMS on our phone:

- Reviewer phone: `9040283338`
- Reviewer OTP: `123456`
- Backend env: `OTP_TEST_NUMBERS=9040283338:123456`
- Backend env: `OTP_EXPOSE_DEV_OTP=false`

## Remaining launch checks

- Deploy the landing policy pages before entering URLs in Play Console.
- Confirm the Google Play Data safety form matches the privacy policy.
- Confirm app permissions in Android manifest match real features.
- Confirm account deletion works end-to-end in production API.
- Have the final policy text reviewed by the business/legal owner before launch.
