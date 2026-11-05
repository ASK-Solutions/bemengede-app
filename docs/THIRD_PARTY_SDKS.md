# Third-party SDK and service audit

Last reviewed: 2026-11-04. Review again before every release that changes `composer.json`, `web/package.json` or `mobile/package.json`, and whenever a new external service is connected.

**Rule:** nothing that tracks people, shows ads or fingerprints devices may be added. Anything optional on the website loads only after cookie consent, through `loadAnalytics()` in `web/src/lib/consent.tsx`. Anything new must be listed here and, if it touches personal data, in the Privacy Policy.

## External services (receive personal data)

| Service | Used for | Data sent | Where configured | Contract / DPA needed |
|---|---|---|---|---|
| Google Sign-In (Google Identity Services on web, Google OAuth in the app) | Optional "Continue with Google" | Google returns account ID, name and email to us; nothing is sent to Google unless the person clicks the button. On the web the Google script loads only after that click | `GOOGLE_CLIENT_IDS` (API), `VITE_GOOGLE_CLIENT_ID` (web), `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` (app) | Google API Terms; list it in the Privacy Policy (done) |
| Chapa | Card, CBE Birr, M-Pesa checkout | Amount, tx_ref, phone, email (if given) | `CHAPA_*` env | Yes |
| telebirr (Ethio Telecom) | Wallet checkout | Amount, order id, title | `TELEBIRR_*` env | Yes (merchant agreement) |
| verify.et | Bank and wallet transfer receipt checks | Bank code + transaction reference only | `VERIFY_ET_*` env | Yes |
| SMS gateway (to choose) | Ticket SMS, OTP codes | Phone number, message text | `SMS_DRIVER`; implement `App\Services\Sms\SmsSender` | Yes |
| Email (SMTP provider, to choose) | Ticket emails, marketing to opted-in users | Email address, message | `MAIL_*` env | Yes |
| Hosting / database | Runs the platform | All stored data | Infrastructure | Yes; check where data is stored, see Proclamation 1321/2024 transfer rules |
| Expo (EAS Build / Updates, if used) | Building and updating the app | No end-user personal data by default | `mobile/app.json` | Review Expo's terms |

## Libraries bundled in the apps (no data leaves the device)

| Package | App | Purpose | Network / tracking? |
|---|---|---|---|
| react, react-dom, react-router-dom | web | UI and routing | No |
| react-markdown, remark-gfm | web | Show legal documents | No |
| qrcode.react | web | Draws ticket QR codes locally | No |
| @fontsource/* | web | Self-hosted fonts (no Google Fonts requests) | No |
| expo, expo-router, react-native | mobile | App framework | No analytics by default; do **not** add `expo-insights` or similar without consent |
| expo-secure-store | mobile | Stores the sign-in token in the OS keychain | No |
| expo-web-browser | mobile | Opens the telebirr/Chapa page | Only the provider page you open |
| expo-auth-session, expo-crypto | mobile | Google sign-in flow (PKCE) | Only when the person taps Continue with Google |
| expo-clipboard | mobile | "Copy account number" button | No |
| react-native-qrcode-svg, react-native-svg | mobile | Draws ticket QR codes | No |
| react-native-markdown-display | mobile | Shows legal documents | No |
| laravel/framework, laravel/sanctum | api | Backend and API tokens | No |

## Deliberately not included

- Google Analytics, Meta Pixel, TikTok Pixel, Firebase Analytics, Hotjar, or any advertising SDK.
- Google Fonts CDN (fonts are bundled instead).
- Location, contacts, camera or microphone permissions in the mobile app. These are blocked in `app.json`. A future operator "scan ticket" screen would need the camera and must ask for it only on that screen.

## How to check

```bash
cd web && npm ls --all | grep -iE "analytics|pixel|segment|mixpanel|amplitude|hotjar|firebase" || echo "none"
cd mobile && npm ls --all | grep -iE "analytics|pixel|segment|mixpanel|amplitude|firebase|facebook" || echo "none"
cd api && composer show | grep -iE "analytics|segment|mixpanel" || echo "none"
```
