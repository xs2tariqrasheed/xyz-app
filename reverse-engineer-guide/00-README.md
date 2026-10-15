# XYZ Booking (booking.xyzcar.com) — Feature & API Guides for the Revamp

Source system: **https://booking.xyzcar.com** (ASP.NET MVC + jQuery, server-side session). Analysed 2026-10-15 with an authenticated member session plus REA (Reverse Engineer MCP).

These guides document **what each feature does, what data it needs, which requests it sends, and what it receives back**. They intentionally ignore the old UI (layout, colours, widgets). Each module file is self-contained: attach the one you are implementing.

---

## 1. How to read a module guide

Every module file has the same sections:

1. **Purpose** — what the feature does for the user.
2. **Access** — anonymous / member, preconditions.
3. **Data model** — every field: name (as sent to the server), type, required, rules, allowed values.
4. **API** — each request: method, URL, trigger, request parameters, response (real example where captured), how the response is handled.
5. **Business rules / flow** — sequencing and decisions.
6. **Data rendered** — what the feature displays and where it comes from.
7. **Errors & messages** — every message string and the condition that produces it.
8. **Revamp notes & unknowns** — what was not observable, and known defects not to copy.

Evidence tags: **[O]** observed live (page markup or real response) · **[C]** read from shipped JavaScript (contract is certain, live call not made) · **[I]** inferred · **[U]** unknown.

## 2. Module index

| # | File | Module |
|---|---|---|
| 01 | [01-platform-conventions.md](01-platform-conventions.md) | Session, response envelopes, errors, input filter, help content (shared by all modules) |
| 02 | [02-authentication.md](02-authentication.md) | Login, logout, lockout/expiry, session timeout |
| 03 | [03-forgot-password.md](03-forgot-password.md) | Password recovery |
| 04 | [04-registration.md](04-registration.md) | New member registration (4 steps) |
| 05 | [05-lookup-services.md](05-lookup-services.md) | Country/State/City/Street/Cross-street, Airport, Airline, Landmark, Contact-type lookups, Zone checks |
| 06 | [06-member-home-express-ride.md](06-member-home-express-ride.md) | Member home data + "I am ready for pickup" express ride |
| 07 | [07-profile-personal-info.md](07-profile-personal-info.md) | Update personal info |
| 08 | [08-profile-mailing-address.md](08-profile-mailing-address.md) | Update billing/mailing address |
| 09 | [09-profile-preferences.md](09-profile-preferences.md) | Confirmation & subscription preferences |
| 10 | [10-change-password.md](10-change-password.md) | Change password |
| 11 | [11-address-book.md](11-address-book.md) | Saved locations CRUD |
| 12 | [12-contacts.md](12-contacts.md) | Additional phones / e-mails CRUD |
| 13 | [13-booking-wizard-core.md](13-booking-wizard-core.md) | Reservation flow: steps, step POST contract, server responses, confirmation |
| 14 | [14-booking-passenger-time.md](14-booking-passenger-time.md) | Step 1 — passenger, "reservation for", ride date/time |
| 15 | [15-booking-locations.md](15-booking-locations.md) | Step 2 — pickup & drop-off (address search, saved, airport, landmark, as-directed, zone) |
| 16 | [16-booking-billing-payment.md](16-booking-billing-payment.md) | Step 3 — account / account+card / credit card, requirements, card authorisation |
| 17 | [17-booking-preferences-contact.md](17-booking-preferences-contact.md) | Step 4 — car type, confirmation, phones, e-mail/CC, passengers, stops |
| 18 | [18-ride-history-search.md](18-ride-history-search.md) | Search past rides by date / payment method |
| 19 | [19-open-reservations-cancel.md](19-open-reservations-cancel.md) | Open reservations list + cancel reservation |
| 20 | [20-reservation-details.md](20-reservation-details.md) | Full reservation/ride detail incl. charges, driver, vehicle |
| 21 | [21-ride-tracking-live-status.md](21-ride-tracking-live-status.md) | Track your route, live status, ask a question |
| 22 | [22-round-trip-repeat.md](22-round-trip-repeat.md) | Create return / repeat trip from an existing ride |
| 23 | [23-vouchers-receipts.md](23-vouchers-receipts.md) | Voucher image, print voucher, receipts & invoices |
| 24 | [24-feedback-rating-complaints.md](24-feedback-rating-complaints.md) | Rate a ride, complaint, contact, open-account requests |
| 25 | [25-system-pages-errors.md](25-system-pages-errors.md) | Timeout, error, not-allowed, locked/expired messages |
| 26 | [26-validation-rules.md](26-validation-rules.md) | All field validators & messages (shared reference) |
| 27 | [27-api-catalog.md](27-api-catalog.md) | Every endpoint in one table |

## 3. Global facts every module relies on

- **Auth/session**: ASP.NET session cookie (`ASP.NET_SessionId`, HttpOnly, Secure, SameSite=Lax). All member endpoints rely on it; there is no token API. Booking state (the reservation draft) lives in the server session between steps.
- **Transport**: `application/x-www-form-urlencoded` POSTs from jQuery; responses are either JSON or server-rendered HTML fragments/pages.
- **Login identity**: e-mail address. Profile also carries a corporate **Account #** and **VIP #**.
- **Service area**: NY, NJ, CT, PA, VA, MD, DC (addresses outside are blocked — see module 15).
- **Contact numbers in business messages**: customer service 718-499-2007 (9am–5pm); dispatch 24h 718-768-7333; special arrangements 929-XYZLimo; MetLife Stadium jobs 929-999-5466.

## 4. Evidence & method

| Activity | Tool | Evidence |
|---|---|---|
| Static analysis of all 11 shipped scripts (`Reservation.js`, `ReservationGeneral.js`, `RideAddressInfo.js`, `AddressAutocomplete.js`, `CancelRide.js`, `RideList.js`, `Registration.js`, `UserSignin.js`, `Utils.js`, `UtilsGeneric.js`, `Feedback.js`) — 43 664 AST nodes, 0 parse failures | REA `analyze_javascript_application` | `ev_ca5390aa682d29485906acc92bd579c1a73929b3d37cc6a3527e183f7774455f` |
| Earlier public-only static analysis (6 scripts) | REA | `ev_cba177a9705b8e653d660e02b552748a85a1c2bfb153b19bd017957b6200a628` |
| Runtime capture of registration page load | REA `capture_browser_scenario` | `ev_ee811cd39188a4f035ffeb069602477fe61d58ed0edd8fcc9b988541ab0aaa0d` |
| Authenticated page markup (14 member pages, booking page with 137 form fields, inline scripts) and read-only lookup responses | Member session in the in-app browser (read-only GETs and read-only lookup POSTs) | captured 2026-10-15 |

**Nothing that changes data was submitted**: no booking, cancellation, profile/address/contact save, password change, card authorisation, express ride, or feedback. For those operations the request contract comes from the shipped JavaScript **[C]** and the server response is documented from the client's handler; server-side business rules are marked **[U]**.

All personal data in examples is replaced with placeholders.

## 5. Security findings (do not replicate)

1. `POST /Reservation/GetCardNo` returns the member's **full stored card number** to the browser. Revamp: return brand + last-4 only; tokenise cards.
2. Card numbers are posted to the application server (no tokenising gateway). Revamp: PCI-compliant hosted fields.
3. Forgot-password **e-mails the existing password** → passwords stored reversibly. Revamp: hashed passwords + reset links.
4. Address-book delete is a **GET** link (`/MemberArea/Addresses?mode=3&addressid=N`) — CSRF-able. Revamp: DELETE with CSRF protection.
5. Zone validation calls are broken by a typo (`ype: "Post"` → sent as GET → server error), so the "could not match your pickup" zone warning never appears in production.
6. Voucher image retrieval calls a hard-coded **internal LAN IP** via JSONP from the browser — fails for every external user.
7. Passwords limited to 4–10 chars.
8. The round-trip "Create Reservation" action is a plain **GET** (`/Reservation/Confirmation`) that books using session state — a prefetch/crawler or CSRF can create a booking. Revamp: POST with CSRF token + idempotency key.
