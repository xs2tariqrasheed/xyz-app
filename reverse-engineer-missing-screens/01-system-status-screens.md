# Missing 01 — System & Status Screens (Session Timeout, Error, Not Allowed, Locked, Expired, 404)

| | |
|---|---|
| **App today** | 🔴 Missing. There are no status routes, no `+not-found.tsx` and no error boundary. A locked or expired login only shows `o_message` inline on the login form. |
| **Legacy reference** | [`../reverse-engineer-guide/25-system-pages-errors.md`](../reverse-engineer-guide/25-system-pages-errors.md), [`02-authentication.md`](../reverse-engineer-implemented/guide/02-authentication.md) §4.1 |
| **Gateway** | ✅ `PROF.S.DB_LOG_ERROR` (client error logging, not wired). The screens themselves are client-side states. |
| **Priority** | P1 |

## 1. Purpose
Tell the user clearly what happened when a normal flow cannot continue: the session expired, an unexpected error occurred, the action is not allowed, or the account is locked or expired. Then offer exactly one next step.

## 2. Live-site screens (captured 2026-10-16) [O]

Evidence `ev_63d0bf8e74b79df853698307996fe1b6d86d46b4c5c6c5ae9d7889c5e8881067`, plus `/Misc/TimeOut` read in the in-app browser.

| Legacy route | Title | Body text (live, verbatim meaning) | Action |
|---|---|---|---|
| `/Misc/TimeOut` | **Session Timed Out** — "Thanks" | "Your session has expired. You'll be redirected to main page in 5 seconds or Click Here." | Auto-redirect to login after 5 s; "Click Here" → `/Misc/Index` (= login) |
| `/Misc/Error` | **Error** | "We are very sorry, but an unexpected error has occurred. Please try again in one minute. If you continue to receive this message, you can contact us at Customer.Service@xyzcar.com, and we will investigate immediately. We apologize for the inconvenience, and we thank you for your patience." | mailto link |
| `/Misc/NotAllow` | **Guest Reservations Not Available** | "Sorry!!! Guest reservations are not available at this time. But we do appreciate your business. Kindly call XYZ dispatch at 718-768-7333 to make your reservation. We apologize for this inconvenience." | "Call XYZ Dispatch" (tel:) |
| `/Misc/UserMessages?constant=1` | **Account Locked** | "Your account is locked for security reasons after several failed login attempts. Please try again in few minutes." | "Click here to sign in" → login |
| `/Misc/UserMessages?constant=2` | **Account Expired** | "Your account has expired. Please call customer service at 718-499-2007 between 9:00am and 5:00pm to restore your account. If you want to place your reservation immediately, kindly contact our dispatch office 24 hours a day at 718-768-7333. We apologize for this inconvenience." | "Back" |
| `/Misc/BrowserError` | Unsupported browser | legacy IE notice | **Drop.** Do not build. |
| unknown route | — | 302 → `/Misc/Error?aspxerrorpath=…` | — |

## 3. Triggers to reproduce in the app

| Trigger | Screen |
|---|---|
| A gateway call signals the session is no longer valid, or the local session max-age expires (`EXPO_PUBLIC_AUTH_SESSION_MAX_AGE_HOURS`) while a screen is open | Session timed out → 5 s countdown → `signOut()` → `/login` |
| `PROF.S.CHECK_LOGIN_CREDENTIALS` refuses because the account is **locked** | Account locked |
| `PROF.S.CHECK_LOGIN_CREDENTIALS` refuses because the account is **expired** | Account expired |
| An unhandled render error, or a transport failure that the screen cannot show inline | Generic error |
| An unknown deep link or URL (web) | Not found (404) |
| An action the user is no longer authorised for (e.g. cancelling a ride for an employee who revoked access — module 19 "You are no longer authorized to cancel reservations for the selected employee.") | Not allowed |

⚠ **Lockout and expiry codes [U].** The gateway contract does not document how `CHECK_LOGIN_CREDENTIALS` tells *locked* or *expired* apart from *wrong password*. The legacy site used `constant: "1" | "2"`.
- Code it defensively: map a dedicated `o_code` or flag column if the gateway returns one, otherwise keep today's inline message.
- Never match on dummy `o_message` text.
- Ask the backend which `o_code` values mean locked and expired.

## 4. Data model
None persisted. Phone numbers and e-mail addresses are configuration, not code (old guide 25 §4):

| Key (suggested env / config) | Live value |
|---|---|
| `EXPO_PUBLIC_SUPPORT_EMAIL` | customer.service@xyzcar.com |
| `EXPO_PUBLIC_CUSTOMER_SERVICE_PHONE` | 718-499-2007 (9:00am–5:00pm) |
| `EXPO_PUBLIC_DISPATCH_PHONE` | 718-768-7333 (24 h) |
| `EXPO_PUBLIC_OFFICE_PHONE` | 929-XYZLIMO (929-999-5466) |
| `EXPO_PUBLIC_TOLL_FREE_PHONE` | 800-535-3377 |

Keep `.env.example` in sync (CLAUDE.md). The same keys are reused by modules 10, 15, 17 and 20.

## 5. API

### 5.1 `PROF.S.DB_LOG_ERROR` — report a client error ✅ code exists, not wired
| Parameter | Value |
|---|---|
| `P_MESS_TEXT` | error message (no personal data, no card numbers) |
| `P_ERROR_CODE` | gateway code / HTTP status / JS error name |
| `P_PROC_NAME` | screen or action code that failed (e.g. `reserver-2/RES.I.RESERVATION`) |
| `P_DEBUG_LEVEL` | `'1'` |
| `P_USER_ID` | `session.loginId` or `''` |

- **Response:** row 0 `o_code` / `o_message` (fire-and-forget; never block the UI on it).
- **When:** called from the error boundary and from the generic-error screen.
- **Rules:** use `retry: false`; never log from inside the logger's own failure path (that would loop).

## 6. Screens to build

| Route (suggested) | Group | Content | Buttons |
|---|---|---|---|
| `src/app/session-expired.tsx` | outside `(app)` (reachable signed out) | title + one sentence + visible 5 s countdown | "Sign in now" |
| `src/app/account-locked.tsx` | outside `(app)` | title + sentence | "Back to sign in" |
| `src/app/account-expired.tsx` | outside `(app)` | title + sentence with customer-service hours | "Call customer service", "Call dispatch (24 h)", "Back" |
| `src/app/(app)/not-allowed.tsx` or a reusable `<StatusScreen>` | inside `(app)` | title + sentence | "Call dispatch", "Back" |
| `src/app/+not-found.tsx` | root | "Page not found" | "Go home" |
| `ErrorBoundary` export in `src/app/_layout.tsx` (expo-router convention) | root | generic error copy + support e-mail | "Try again" (`retry`), "Go home" |

Make all of them a single reusable `StatusScreen` component (icon, title, message, up to two actions) so they look the same on web, iOS and Android.

## 7. Business rules
1. The timeout screen always ends signed out. Clear `authStorage` before navigating.
2. Countdown = 5 s. The user can skip it.
3. Locked: tell the user to retry later. Do not reveal how many attempts are left.
4. Expired: the only path back is customer service. No self-service.
5. Guest reservations do not exist in the app (signed-out users never reach booking), so "Not allowed" is only needed for authorisation failures.

## 8. Messages (`src/constants/messages.ts` → new `SYSTEM_MESSAGES`)
Session expired · Unexpected error · Not allowed · Account locked · Account expired · Page not found. Use the texts in §2, shortened for "no noise" (one sentence each plus the action).

## 9. Acceptance criteria
- [ ] Each screen renders on web, iOS and Android at phone and desktop widths, using theme colours only.
- [ ] A locked or expired login response opens the matching screen (once the backend confirms the codes); otherwise the inline message is unchanged.
- [ ] An expired session from any `(app)` screen lands on the timeout screen and then on `/login` after 5 s.
- [ ] An unknown web URL shows `+not-found`.
- [ ] A thrown render error shows the boundary and sends `PROF.S.DB_LOG_ERROR` once.
- [ ] `PROF.S.DB_LOG_ERROR` is added to `actionCodes.ts` and marked `✅ Implemented` in `docs/XYZ Action Codes.md`.

## 10. Unknowns
- [U] Gateway signal for locked / expired accounts and for "session no longer valid".
- [U] Whether `PROF.S.DB_LOG_ERROR` should also receive gateway `JHeader` failures (volume).
