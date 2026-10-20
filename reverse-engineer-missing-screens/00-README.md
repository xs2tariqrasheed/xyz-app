# Missing Screens — What the XYZ App Still Has to Build

This folder lists every screen and feature of the live system (**https://booking.xyzcar.com** plus the linked marketing site **https://xyzcar.com**) that the XYZ app (`xyz-app`) does **not** have yet, or has only as a non-working shell.

**One file = one screen or module still to build.** When a module is finished, move its file to [`../reverse-engineer-implemented/missing-screens/`](../reverse-engineer-implemented/00-README.md) and list it there.

Reverse engineered on **2026-10-16**. Inputs:
- the 27 guides in [`../reverse-engineer-guide/`](../reverse-engineer-guide/00-README.md)
- a file-by-file audit of `src/app`, `src/components`, `src/services`, `src/context`, `src/constants/actionCodes.ts` and `docs/XYZ Action Codes.md`
- a new REA (Reverse Engineer MCP) capture of the live site

---

## 1. How these files relate to `reverse-engineer-guide/`

`reverse-engineer-guide/` documents the **whole** legacy system. This folder covers only the **gap**:

- Where a guide already holds the full legacy contract, the file here does not repeat it. It links to the guide and adds what was missing there:
  - the action code mapping
  - what the app has today
  - the exact work left
  - acceptance criteria
- Screens the old guides never covered are documented in full here, from new live captures. These are:
  - About and Our Services
  - Rates
  - Contact Us
  - Request Profile Deletion
  - FAQs content
  - Drivers – Join XYZ
  - Terms and Privacy
  - Download Receipt / Invoice pages
  - the help files

The booking guides 13–17 are implemented, but sub-features are still missing; those gaps are in files 19 and 20 below. Guide 23 (vouchers & receipts) is only partly built, and guide 24 (feedback) is not built. Their gaps are in files 08–11 and 13.

## 2. Status legend

| Status | Meaning |
|---|---|
| 🔴 **Missing** | No route/screen in the app. |
| 🟠 **Placeholder** | A route exists but only shows `ComingSoon`. |
| 🟡 **Not wired** | The screen exists but runs on local seed/state. No gateway call, so nothing is loaded or saved. That breaks the rule in `CLAUDE.md` ("Every feature you implement must call its action code"). |
| 🔵 **Partial** | The screen works, but sub-features of the live system are absent. |

Action-code availability:
- ✅ **code exists** in `docs/XYZ Action Codes.md`, so it can be wired now.
- ⛔ **no code**: the gateway has no action code for it, so a backend action code must be requested first. See each file's "Blocked on" section.

## 3. Module index

| # | File | Screen / module | App today | Gateway | Priority |
|---|---|---|---|---|---|
| 01 | [01-system-status-screens.md](01-system-status-screens.md) | Session timeout, error, not-allowed, account locked, account expired, 404, error boundary | 🔴 Missing | ✅ `PROF.S.DB_LOG_ERROR` (logging only) | **P1** |
| 02 | [02-address-book.md](../reverse-engineer-implemented/missing-screens/02-address-book.md) | My Addresses: list / add / edit / delete saved locations | ✅ Implemented 2026-10-16 | ✅ `PROF.S.USER_ADDRESSES`, `PROF.I/U/D.USER_ADDRESS` | **P1** |
| 03 | [03-my-contacts.md](../reverse-engineer-implemented/missing-screens/03-my-contacts.md) | My Contacts: extra phones / e-mails CRUD | ✅ Implemented 2026-10-16 (stub does not support the codes yet) | ✅ `PROF.S.LOAD_PROFILE_COLUMN_VALUES`, `PROF.I/U/D.PROFILE_COLUMN_VALUE` | **P1** |
| 04 | [04-preferences.md](../reverse-engineer-implemented/missing-screens/04-preferences.md) | Change Preferences: confirm by phone, special offers | ✅ Implemented 2026-10-16 | ✅ `PROF.S.LOAD_PROFILE`, `PROF.U.PROFILE` | **P1** |
| 05 | [05-mailing-address.md](../reverse-engineer-implemented/missing-screens/05-mailing-address.md) | Change Billing / Mailing Address | ✅ Implemented 2026-10-16 | ✅ `PROF.S.LOAD_PROFILE`, `PROF.U.PROFILE` | **P1** |
| 06 | [06-authorized-access-management.md](06-authorized-access-management.md) | Authorise colleagues to book on my behalf (grant / revoke / grant-to-all / list / search) | 🔴 Missing | ✅ 7 `PROF.*ACCESS_RIGHTS*` codes | **P2** |
| 07 | [07-blocked-drivers.md](07-blocked-drivers.md) | Block / unblock a driver (car #) | 🔴 Missing | ✅ `PROF.U.BLOCK_DRIVER`, `PROF.U.UNBLOCK_DRIVER` | P3 |
| 08 | [08-rate-a-ride.md](08-rate-a-ride.md) | Rate a Ride: 5 star ratings + suggestions | 🔴 Missing (the "Leave feedback" link opens Ask-a-Question instead) | ⛔ | **P2** |
| 09 | [09-complaint.md](09-complaint.md) | Complaint form | 🔴 Missing | ⛔ | P2 |
| 10 | [10-contact-us-customer-service.md](10-contact-us-customer-service.md) | Contact Us / Customer Service (contact card + message form) | 🔴 Missing | ⛔ | P2 |
| 11 | [11-open-corporate-account.md](11-open-corporate-account.md) | Open an Account (corporate lead form) | 🔴 Missing | ⛔ | P3 |
| 12 | [12-request-profile-deletion.md](12-request-profile-deletion.md) | Request Profile Deletion *(new; not in the old guides)* | 🔴 Missing | ⛔ | **P1** (store requirement) |
| 13 | [13-receipts-invoices.md](13-receipts-invoices.md) | Receipts & Invoices (Download Receipt / Download Invoice) | 🟠 Placeholder | ⛔ | P2 |
| 14 | [14-rates.md](14-rates.md) | Rates: sample airport / out-of-town rates, service rates, rate book | 🟠 Placeholder | ⛔ | P2 |
| 15 | [15-about-company-services.md](15-about-company-services.md) | About: company info, our services, our policies, airport pickups | 🟠 Placeholder | ⛔ (static content) | P3 |
| 16 | [16-faqs-and-page-help.md](16-faqs-and-page-help.md) | FAQs + per-page help content | 🔴 Missing | ⛔ (static content) | P3 |
| 17 | [17-drivers-join-xyz.md](17-drivers-join-xyz.md) | Drivers – Join XYZ | 🔴 Missing | ⛔ (static content) | P4 |
| 18 | [18-legal-terms-privacy.md](18-legal-terms-privacy.md) | Terms & Conditions, Privacy Policy | 🔴 Missing | ⛔ (static content) | **P1** (store requirement) |
| 19 | [19-open-reservation-actions.md](19-open-reservation-actions.md) | Open-reservation row actions: print voucher before the ride, live status, locate car, ask from the list; ride-history sorting | 🔵 Partial | ✅ existing codes | P2 |
| 20 | [20-booking-wizard-gaps.md](20-booking-wizard-gaps.md) | Booking wizard sub-features (duplicate warning, price estimate, service-area gate, MetLife rule, landmark tab, airport shortcuts, As directed, save address, notices, passenger types, ride reason list…) | 🔵 Partial | mixed ✅ / ⛔ | **P1** |
| 21 | [21-home-registration-misc-gaps.md](21-home-registration-misc-gaps.md) | What's New, registration outcomes, real CAPTCHA, server logout, nav clean-up (`/reserve`, `/theme`) | 🔵 Partial | mixed | P2 |

Priority:
- **P1**: needed for a correct, publishable app. That covers broken data, store/legal requirements, and booking correctness.
- **P2**: user-visible features of the live site.
- **P3/P4**: content or rarely used features.

## 4. What the app already covers (for reference — not in this folder)

The following are wired to the gateway and are **not** listed as missing:

- Login and forgot password
- Change password
- Registration
- Profile → Personal Info
- The booking wizard on `/reserver-2`, including express checkout and card-authorisation polling
- Upcoming rides, ride history and cancel
- Reservation details
- Track ride (vehicle log + car position)
- Ask a Question
- Return and repeat trip
- Voucher view/print

Their remaining sub-feature gaps are captured in files 19–21.

## 5. Gateway gaps (features with no action code)

The rules in `CLAUDE.md` say:
- every feature must call its action code
- never fall back to local data

These screens therefore cannot be wired yet. Request these action codes from the backend team (suggested names):

| Feature | Suggested action code | File |
|---|---|---|
| Price / fare estimate for a draft | `RES.S.PRICE_ESTIMATE` | 20 |
| Duplicate / similar booking check | `RES.S.DUPLICATE_RESERVATION` | 20 |
| Airports, airlines, landmarks lookup | `RES.S.AIRPORTS`, `RES.S.AIRLINES`, `RES.S.LANDMARKS` | 20 |
| Account-scoped ride reasons | `PROF.S.RIDE_REASONS` (or `PROF.S.LOAD_PROFILE_COLUMN_VALUES_BY_TYPE` with the ride-reason column id, if that is what column 2 is: the contract's sample value is "Business Trip") | 20 |
| Rate a ride | `RES.I.RIDE_RATING` | 08 |
| Complaint | `RES.I.COMPLAINT` | 09 |
| Contact message | `PROF.I.CONTACT_MESSAGE` | 10 |
| Corporate-account lead | `PROF.I.ACCOUNT_REQUEST` | 11 |
| Profile deletion request | `PROF.I.DELETION_REQUEST` | 12 |
| Receipts / invoices | `RES.S.RECEIPT`, `PROF.S.INVOICES` | 13 |
| Rates tables | `RES.S.RATES` (or a CMS) | 14 |
| What's New announcements | `PROF.S.ANNOUNCEMENTS` | 21 |
| Static content (About, FAQ, help, Terms, Privacy) | CMS or a bundled content file (agree with product) | 15–18 |

Until a code exists, the agreed interim option for the form screens is to open the live xyzcar.com form with `expo-web-browser`. It is already a dependency. Each file says so explicitly. This interim option is a product decision; confirm it before building.

## 6. Evidence

| Activity | Tool | Evidence |
|---|---|---|
| Live capture: booking login page, About, Our Services, Our Policies (accessibility tree + network) | REA `capture_browser_scenario` | `ev_c413af980d7806dbf59ad5b183ec7c641740f0b3e709522049cd6667f8b56a18` |
| Live capture of these pages: Rates, Sample Rates, Services Rates, Contact Us, Open an Account, Complaint, Rate a Ride, FAQs, Drivers, Download Receipt, Download Invoice, Terms, Privacy | REA `capture_browser_scenario` | `ev_a682821ec143a1dd74a18ebd5795d082c8ec9a29d1e565154a2f7639e278510d` |
| Live capture of these pages: system pages (NotAllow, Error, UserMessages 1/2, Misc/Index) and 7 context-help files (`/Content/HelpWindow/*.htm`) | REA `capture_browser_scenario` | `ev_63d0bf8e74b79df853698307996fe1b6d86d46b4c5c6c5ae9d7889c5e8881067` |
| Form field names, hidden ids, reCAPTCHA type, star-rating script, FAQ accordion answers, Airport Pickups, Request Profile Deletion, Privacy headings | in-app browser DOM reads (read-only, nothing submitted) | 2026-10-16 |
| Shipped booking scripts `RideList.js`, `CancelRide.js`, `Feedback.js`, `ReservationGeneral.js`, `Utils*.js` (read statically, not executed) | download + grep | 2026-10-16; confirms the module 19/21/23 contracts in the old guides |
| Earlier member-area analysis (authenticated) | REA | see `../reverse-engineer-guide/00-README.md` §4 |

Evidence tags (same as the old guides):
- **[O]** observed live
- **[C]** from shipped code
- **[I]** inferred
- **[U]** unknown

**Nothing was submitted.** No form, login, booking or deletion request was sent. The member area was not re-entered, because login needs a password and a reCAPTCHA.

## 7. Conventions every module must follow (from `CLAUDE.md`)

- Expo SDK 57 + expo-router; it must work on web, iOS and Android, mobile first, and be responsive.
- Gateway calls go through `usePostData` / `useFetchData`. Action codes are constants in `src/constants/actionCodes.ts`. Mark each wired code `— ✅ Implemented` in `docs/XYZ Action Codes.md`.
- Gateway success means `JHeader.ActionCode == 0` **and** row 0 `o_code === "0"`. Fail closed when `o_code` is missing.
- Render the gateway's (dummy) response. Never add seed/sample data, and never fall back to it on failure; show the error or empty state instead. Delete `SEED_*` / `SAVED_*` / `DEFAULT_*` placeholders when a screen is wired.
- User-facing text lives in `src/constants/messages.ts`. Colours come from `src/theme/colors.ts`.
- No noise: show only what the user needs to complete the task.
