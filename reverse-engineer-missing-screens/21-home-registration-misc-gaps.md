# Missing 21 — Home, Registration, Auth & Navigation Gaps

| | |
|---|---|
| **App today** | 🔵 Partial: small gaps across already-implemented screens, plus two nav entries that should not ship. |
| **Legacy reference** | [`02-authentication.md`](../reverse-engineer-guide/02-authentication.md), [`04-registration.md`](../reverse-engineer-guide/04-registration.md), [`06-member-home-express-ride.md`](../reverse-engineer-guide/06-member-home-express-ride.md); live login page capture `ev_c413af98…` |
| **Priority** | P2 (21.4 and 21.6 are P1 before release) |

## 1. Gap list

| # | Live feature [O/C] | App today | Build | Code |
|---|---|---|---|---|
| 21.1 | **Home "What's New"** announcement text (server content) on the member home. | Missing. | One dismissible announcement card on Home, shown only when there is content. | ⛔ `PROF.S.ANNOUNCEMENTS` |
| 21.2 | **Express pick lists** order: frequent addresses, separator, all saved, plus airport shortcuts. | Saved addresses only. | Add JFK / LGA / EWR shortcuts (same constant as file 20 §20.7). Frequent ordering needs usage data from the gateway [U]. | ✅ `PROF.S.USER_ADDRESSES` |
| 21.3 | **Registration outcomes:**<br>• **corporate** profile → created **and logged in**: "Your registration is complete! Now you can make reservation on-line."<br>• **credit-card** profile → **pending customer-service approval**: "Your request for a new profile is being processed by customer service. A customer service representative will contact you as soon as possible." | A single "Your account is ready. Log in…" message. | Branch on the payment type sent (`P_PAYMENT_TYPE`). Card → pending message, no login. Account → sign in automatically with `CHECK_LOGIN_CREDENTIALS` using the just-entered credentials (in memory only), or show "ready, log in". Confirm with the backend whether card profiles are pending. | ✅ `PROF.I.PROFILE` |
| 21.4 | **Real CAPTCHA** on login, forgot password and registration (live: Google reCAPTCHA v2 on booking, v3 on marketing forms). | `HumanCheck.tsx` is a stand-in ("NOT a real CAPTCHA"). | Agree a cross-platform bot check with the backend (it must be verified server-side; a client-only check is meaningless). Options: reCAPTCHA / hCaptcha / Turnstile via WebView on native and a script on web, or gateway-side rate limiting. **Release blocker for public endpoints** (also needed by file 11). | ⛔ gateway must accept and verify a token |
| 21.5 | **Server logout** (`GET /Misc/Logout`) and **session expiry** (→ TimeOut). | Local `signOut()` only. No expiry screen. | File 01 covers the screen. A logout code is needed only if the gateway keeps sessions [U]. | ⛔ / n/a |
| 21.6 | — | **Nav item "Reservation" → `/reserve`**: an unwired wizard that makes up a reservation number (`placeholderReservationNumber`) and routes to the `/receipts` placeholder. `ComingSoon`'s "Make a reservation →" also points to `/reserve`. | Remove `/reserve` from `NAV_ITEMS` (keep "Reservation 2" and rename it to "Book a ride"), or delete the route once `/reserver-2` is the only wizard. Point `ComingSoon` (if still used) to `/reserver-2`. This violates CLAUDE.md (no made-up data). | — |
| 21.7 | — | **`/theme`**: a dev design-token gallery linked from Home QuickLinks (`LINK_THEME`). | Hide it in production builds (`__DEV__`), or remove the QuickLink. | — |
| 21.8 | Header **"Welcome &lt;email&gt; \| Logout"** and the authenticated menu groups: Profile (Personal Info, Billing Address, Preferences, My Addresses, My Contacts, Change Password) · Reservation (New, Update/Cancel, Ride History) · About · Rates · Receipts & Invoices · Contact Us (Customer Service, Open an Account, Complaint, Rate a Ride, FAQs, Drivers – Join XYZ) · footer: Terms, Privacy, FAQs, Contact Us. | A flat nav of 11 items. Mailing address and change password are reachable only from Profile. No Contact group. | Re-group `src/components/nav/navItems.ts`: **Book a ride** · **Rides** · **Account** (Profile, Mailing address, Preferences, Addresses, Contacts, Booking access [06], Change password, Delete profile [12]) · **Help** (Contact Us [10], Rate a ride [08], Complaint [09], FAQs [16]) · **About** ([15], Rates [14], Receipts [13]) · Legal links [18]. Keep it short on mobile. | — |
| 21.9 | **Registration: Country/State/City/Street lookups** (`GetCities`, `GetStreets`). | Local `src/data/regions.ts` for state and city lists. | Acceptable until the gateway offers lookup codes. Request `PROF.S.CITIES` / `PROF.S.STREETS` if parity is wanted. | ⛔ |

## 2. Acceptance criteria
- [ ] `/reserve` is no longer reachable from the UI, and no screen makes up a reservation number.
- [ ] `/theme` is not visible in production.
- [ ] The registration success message matches the payment type.
- [ ] The nav is grouped and every item in files 01–20 has a home.
- [ ] The CAPTCHA decision is documented and implemented server-verified before store release.

## 3. Unknowns
- [U] Whether card registrations are still pending approval on the new backend.
- [U] Announcement source.
- [U] The bot-protection provider.
