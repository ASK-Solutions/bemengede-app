# Bemengede (በመንገዴ)

All-in-one intercity bus booking and management platform for Ethiopia.

```
bemengede/
├── api/       Laravel 11 API: bookings, seat holds, payments (telebirr, Chapa, verify.et), consents, privacy
├── web/       React + Vite website: landing page, booking flow, account, legal pages, cookie consent,
│              operator portal (/operator) and platform admin (/admin)
├── mobile/    React Native (Expo) app: booking, tickets, account (including in-app deletion)
├── docs/      Third-party SDK audit, image licence register
├── scripts/   contrast.mjs: WCAG colour-contrast check
└── COMPLIANCE.md   How each launch requirement is met, and what still needs you
```

## Run it locally

Requirements: PHP 8.2+ with `pdo_sqlite`, Composer, Node 20+.

```bash
# API: http://localhost:8000
cd api
composer install
cp .env.example .env && php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed          # 12 cities, 20 operators, plus demo trips for Selam Bus (local only)
php artisan serve
php artisan schedule:work           # in a second terminal: expires holds, reconciles payments, runs deletions
php artisan test                    # feature tests: pricing, consents, seat races, payments, privacy

# Website: http://localhost:5173
cd web
cp .env.example .env
npm install && npm run dev

# App
cd mobile
cp .env.example .env               # EXPO_PUBLIC_API_URL defaults to 10.0.2.2:8000 (Android emulator → host)
npm install && npx expo start
```

`PAYMENTS_MODE=mock` (the default) simulates telebirr, Chapa and verify.et, so you can book end to end without real money.

To test bank transfers in mock mode, use these references:
- Any reference (e.g. `FT25316ABCD`) passes every check and confirms the booking.
- A reference ending in `SHORT` underpays, so it goes to the operator's review queue.
- A reference ending in `WRONG` was paid to the wrong account, so it also goes to review.
- A reference ending in `FAIL` is not found.

Demo staff logins (local only), at http://localhost:5173/staff/login with password `password`:
- `selam@bemengede.test` opens the **operator portal** for Selam Bus.
- `admin@bemengede.test` opens the **platform admin**.

## Operator portal (`/operator`)

Each bus company only ever sees its own data (enforced in every API query, and tested).

| Screen | What it does | Who |
|---|---|---|
| Dashboard | Today's departures, seats sold, money in, payment mix, alerts (licence expiry, buses in maintenance, transfers to review) | Owner, agent |
| Trips & schedules | Create trips (repeat daily), change bus/driver/fare, delay (passengers get an SMS), cancel (everyone gets a full refund including the fee) | Owner creates, both manage |
| Bookings | Find by reference, phone or name; fix passenger names; cancel under the published policy | Owner, agent |
| Counter sale | Sell for cash at the terminal with the same prices and seat locks; prints a ticket and sends the SMS | Owner, agent |
| Payment verifications | Transfers that failed a verify.et check: see each check, approve or reject | Owner, agent |
| Boarding & manifests | Per-trip manifest, scan QR with the camera (or type the code), printable list | Owner, agent |
| Fleet & drivers | Buses with seat layouts and amenities; drivers with licence expiry reminders | Owner adds buses |
| Routes | Routes between shared terminals with stops, duration and usual fare | Owner |
| Staff & roles | Invite agents or owners by email; remove access | Owner |
| Payouts & finance | Fares, commission and amount owed per payment method; settlement history | Owner, agent |
| Reports | Sales by route, channel and method; occupancy per trip; CSV download | Owner, agent |
| Company settings | Legal details, cancellation policy, brand colour, receiving accounts, licence uploads, booking widget code, onboarding checklist | Owner edits |

## Platform admin (`/admin`)

| Screen | What it does |
|---|---|
| Overview | Money in this month, operators by status, transfers waiting, open disputes, refunds due, 14-day chart, top operators |
| Operators | All 20+ operators with an onboarding checklist built from real data; review licence documents; record the signed agreement; invite the owner; go live (blocked until every step is done) or suspend |
| Payments & refunds | Read-only provider status (mode, credentials set, webhook URLs, last success); list of refunds to send and record |
| Settlements | Create settlements for a period: Chapa splits settle automatically, transfers/cash are invoiced for commission, telebirr payouts are marked paid with a bank reference |
| Disputes | Traveller complaints: resolve or reject with a written answer |
| Cities & terminals | Shared master data used by all operators |
| Audit log | Every change, who made it, filterable |

Staff accounts are never self-registered: the admin invites an operator's owner, and the owner invites their agents. Each invitation link is valid for 7 days.

**Money split** (in `LedgerService`): the passenger pays fare + service fee. Bemengede keeps the service fee (which also pays the gateway fee) plus a commission on online fares; the operator gets fares minus commission. Counter cash sales are commission-free unless `COMMISSION_ON_COUNTER_SALES=true`. Set the real gateway fee percentages from your Chapa and telebirr contracts (`CHAPA_FEE_PERCENT`, `TELEBIRR_FEE_PERCENT`).

## Sign-in methods

Travellers can sign up and sign in three ways, on the website and in the app:
1. **Phone number** with a 6-digit SMS code.
2. **Username and password.** Passwords are stored hashed. After 5 wrong tries the account is locked for a minute. Reset works with a code sent to the account's phone or email.
3. **Google.** The server verifies every Google token against your own client IDs. An existing account is joined only when both sides have a verified email.

Every new account must tick "I am 18 or older" and accept the terms. People can add or remove sign-in methods under *Account › Sign-in methods*. The last remaining method can't be removed.

To turn on Google, create OAuth client IDs in Google Cloud Console (Web, Android with your SHA-1, iOS) and set:
- **API:** `GOOGLE_CLIENT_IDS`, all of them, comma-separated.
- **Web:** `VITE_GOOGLE_CLIENT_ID`.
- **App:** `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Google sign-in needs a development or store build; it doesn't work in Expo Go.

## Going live

1. Fill in the `BUSINESS_*` values and set `PAYMENTS_MODE=live` with real Chapa, telebirr and verify.et credentials.
2. Confirm the telebirr field names and `sign_type` against the integration guide issued with your merchant account (`TelebirrProvider.php`).
3. Confirm the Chapa webhook signature header and the verify.et response fields against their current docs (`ChapaProvider.php`, `VerifyEtClient.php`).
4. Add a real SMS gateway: implement `App\Services\Sms\SmsSender` and bind it in `AppServiceProvider`.
5. Work through **Your actions before launch** in `COMPLIANCE.md`.

## Key design rules

- **Money:** every amount is in santim (integer). The service fee is in the first price shown. A booking is confirmed only after a server-to-server check with the provider; webhooks are never trusted for amounts.
- **Seats:** a unique database index on `(trip_id, seat_number)` makes double-selling impossible.
- **Tenancy:** operator staff routes always filter by the signed-in user's `operator_id`.
- **Privacy:** collect the minimum; consents are append-only and versioned; deletion anonymises bookings but keeps the amounts.
