# Bemengede (በመንገዴ)

All-in-one intercity bus booking and management platform for Ethiopia.

```
bemengede/
├── api/       Laravel 11 API: bookings, seat holds, payments (telebirr, Chapa, verify.et), consents, privacy
├── web/       React + Vite website: landing page, booking flow, account, legal pages, cookie consent
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

Demo staff logins (local only): `admin@bemengede.test` and `selam@bemengede.test`, password `password`, via `POST /api/v1/auth/staff`.

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
