# Implemented Screens — Reverse-Engineering Docs Already Built in the XYZ App

This folder holds **only** the reverse-engineering files whose feature is built in `xyz-app` and wired to the gateway. Anything not here is still to build, or only partly built.

- [`guide/`](guide/) — moved from [`../reverse-engineer-guide/`](../reverse-engineer-guide/00-README.md)
- [`missing-screens/`](missing-screens/) — moved from [`../reverse-engineer-missing-screens/`](../reverse-engineer-missing-screens/00-README.md)

Each implemented file lives only here. The two source folders keep only what is not built yet, is partly built, or is a shared reference. Module numbers are unchanged, so `guide/11` is still module 11. When a module is finished, move its file into the matching subfolder here, update links that point to it, and move its row in the tables below.

Audited against the code on **2026-10-16**: routes in `src/app`, action codes used by `src/context`, `src/services` and `src/components`, and the remaining placeholders (`ComingSoon`, `SAVED_MAILING_ADDRESS`).

---

## 1. ✅ Implemented (in this folder)

| File | Module | Where in the app | Action codes | Known gaps tracked in |
|---|---|---|---|---|
| [guide/02](guide/02-authentication.md) | Login, logout, lockout, session | `login.tsx`, `AuthContext` | `PROF.S.CHECK_LOGIN_CREDENTIALS` | missing 01, 21 |
| [guide/03](guide/03-forgot-password.md) | Forgot password | `forgot-password.tsx` | `PROF.S.PASSWORD` | — |
| [guide/04](guide/04-registration.md) | Registration | `register.tsx` | `PROF.I.PROFILE`, `PROF.S.IS_UNIQUE_EMAIL`, `PROF.S.IS_VALID_COMPANY_NAME`, `PROF.S.IS_VALID_VIP`, `PROF.S.ACCOUNT_REQUIREMENTS(_RS)` | missing 21 |
| [guide/05](guide/05-lookup-services.md) | Lookups & zone checks | `services/zones.ts`, `services/places.ts` | `RES.S.ZONE_THE_LOCATION`, `RES.S.GOOGLE_ZONE_NUM` | missing 20 (airport / airline / landmark lookups) |
| [guide/06](guide/06-member-home-express-ride.md) | Member home + express ride | `(app)/index.tsx`, `ExpressPickupPanel` | `RES.S.ALL_ORDERS`, `RES.I.RESERVATION` | missing 21 |
| [guide/07](guide/07-profile-personal-info.md) | Profile → personal info | `profile.tsx`, `ProfileContext` | `PROF.S.LOAD_PROFILE`, `PROF.U.PROFILE` | — |
| [guide/09](guide/09-profile-preferences.md) | Preferences (confirm by phone, special offers) | `preferences.tsx`, `ProfileContext.updatePreferences` | `PROF.S.LOAD_PROFILE`, `PROF.U.PROFILE` | — |
| [guide/10](guide/10-change-password.md) | Change password | `change-password.tsx` | `PROF.U.PASSWORD` | — |
| [guide/11](guide/11-address-book.md) | Address book | `addresses.tsx`, `SavedPlacesContext` | `PROF.S.USER_ADDRESSES`, `PROF.I/U/D.USER_ADDRESS` | missing 02 §4.6, missing 20 |
| [guide/12](guide/12-contacts.md) | My contacts | `contacts.tsx` | `PROF.S.LOAD_PROFILE_COLUMN_VALUES`, `PROF.I/U/D.PROFILE_COLUMN_VALUE` | missing 03 (stub does not answer these codes yet) |
| [guide/13](guide/13-booking-wizard-core.md) | Booking wizard core | `reserver-2.tsx`, `ReservationContext` | `RES.I.RESERVATION`, `RES.U.RESERVATION` | missing 20 |
| [guide/14](guide/14-booking-passenger-time.md) | Booking step 1: passenger & time | `PassengerRideInfoSection` | `PROF.S.LOAD_PROFILE_WHO_GRANTED_ACCESS`, `PROF.S.ACCOUNT_VIP_NUM` | missing 20 |
| [guide/15](guide/15-booking-locations.md) | Booking step 2: locations | `AddressStep`, `RideAddressInfoSection` | `PROF.S.USER_PROFILE_ADDRESSES`, `PROF.S.CORPORATE_ADDRESSES`, zone codes | missing 20 |
| [guide/16](guide/16-booking-billing-payment.md) | Booking step 3: billing & payment | `BillingStep`, `services/billing.ts` | `RES.S.BILLING_METHOD`, `RES.S.IS_CREDIT_CARD_SPECIFIC_ACCOUNT`, `RES.S.ACCOUNT_REQUIREMENTS_LIST`, `RES.S.VERIFY_ACCOUNT_REQUIREMENTS`, `RES.I/S.CREDIT_CARD_APPROVAL` | missing 20 |
| [guide/17](guide/17-booking-preferences-contact.md) | Booking step 4: preferences & contact | `PreferencesSection` | `RES.S.VEHICLE_TYPE`, `RES.*.RESERVATION_COLUMN_VALUE*`, `RES.U.FORMAT_EMAIL_MESSAGE` | missing 20 |
| [guide/18](guide/18-ride-history-search.md) | Ride history search | `rides.tsx` (History tab) | `RES.S.ALL_ORDERS` | missing 19 (sorting) |
| [guide/19](guide/19-open-reservations-cancel.md) | Open reservations + cancel | `rides.tsx` (Upcoming tab), `CancelReservationSheet` | `RES.S.UPDATABLE_ORDERS`, `RES.U.CANCEL_RESERVATION` | missing 19 (row actions) |
| [guide/20](guide/20-reservation-details.md) | Reservation details | `reservation-info.tsx` | `RES.S.LOAD_RESERVATION`, `PROF.S.CAR_INFO`, `RES.S.COMMUNICATION_LOG` | missing 07 (block driver) |
| [guide/21](guide/21-ride-tracking-live-status.md) | Ride tracking + ask a question | `track-ride.tsx`, `RideQuestionSheet` | `RES.S.VEHICLE_LOG`, `RES.S.LATITUDE_LONGITUDE_FOR_CAR`, `RES.S.ALL_PREDEFINED_QUESTIONS`, `RES.I.ASKED_QUESTIONS` | missing 19 |
| [guide/22](guide/22-round-trip-repeat.md) | Return / repeat trip | `reservation-info.tsx` → `reserver-2` | `RES.S.LOAD_RESERVATION` + booking codes | — |
| [missing-screens/02](missing-screens/02-address-book.md) | My Addresses gateway CRUD | `addresses.tsx` | `PROF.S.USER_ADDRESSES`, `PROF.I/U/D.USER_ADDRESS` | — |
| [missing-screens/03](missing-screens/03-my-contacts.md) | My Contacts gateway CRUD | `contacts.tsx` | `PROF.S.LOAD_PROFILE_COLUMN_VALUES`, `PROF.I/U/D.PROFILE_COLUMN_VALUE` | — |
| [missing-screens/04](missing-screens/04-preferences.md) | Preferences gateway load & save | `preferences.tsx` | `PROF.S.LOAD_PROFILE`, `PROF.U.PROFILE` | — |

Guide 07 had no "✅ Implemented" banner, although `/profile` is wired. It has one now.

## 2. 🔵 Partly implemented (still in `reverse-engineer-guide/`)

| File | Module | Built | Still missing |
|---|---|---|---|
| [guide/23](../reverse-engineer-guide/23-vouchers-receipts.md) | Vouchers, receipts & invoices | Voucher view / print (`voucher.tsx`, `RES.S.LOAD_RESERVATION`) | Receipts & invoices: `receipts.tsx` is `ComingSoon` → [missing 13](../reverse-engineer-missing-screens/13-receipts-invoices.md) |

## 3. 🔴 Not implemented (still in the source folders)

Guide 24 used to say "✅ Implemented", but the code does not back that up. Only Ask a Question exists, and that belongs to guide 21. Its banner now says "Not implemented".

| File | Module | App today | Tracked in |
|---|---|---|---|
| [guide/08](../reverse-engineer-guide/08-profile-mailing-address.md) | Billing / mailing address | Local `SAVED_MAILING_ADDRESS`, no gateway call | [missing 05](../reverse-engineer-missing-screens/05-mailing-address.md) |
| [guide/24](../reverse-engineer-guide/24-feedback-rating-complaints.md) | Rating, complaint, contact, account requests | No screens | missing [08](../reverse-engineer-missing-screens/08-rate-a-ride.md), [09](../reverse-engineer-missing-screens/09-complaint.md), [10](../reverse-engineer-missing-screens/10-contact-us-customer-service.md), [11](../reverse-engineer-missing-screens/11-open-corporate-account.md) |
| [guide/25](../reverse-engineer-guide/25-system-pages-errors.md) | System pages & errors | No status routes or error boundary | [missing 01](../reverse-engineer-missing-screens/01-system-status-screens.md) |
| [missing 01](../reverse-engineer-missing-screens/01-system-status-screens.md), [05](../reverse-engineer-missing-screens/05-mailing-address.md)–[21](../reverse-engineer-missing-screens/21-home-registration-misc-gaps.md) | Everything else in `reverse-engineer-missing-screens/` | 🔴 / 🟠 / 🟡 / 🔵 | see [its index](../reverse-engineer-missing-screens/00-README.md#3-module-index) |

## 4. Shared references (not features, still in `reverse-engineer-guide/`)

| File | Content |
|---|---|
| [guide/01](../reverse-engineer-guide/01-platform-conventions.md) | Legacy session, envelopes, errors |
| [guide/26](../reverse-engineer-guide/26-validation-rules.md) | Field validators & messages |
| [guide/27](../reverse-engineer-guide/27-api-catalog.md) | Legacy endpoint catalogue |
