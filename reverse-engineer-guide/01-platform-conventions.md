# Module 01 — Platform Conventions (shared)

Applies to every other module. Implement these once in the Revamp API/client layer.

## 1. Session & authentication

| Item | Behaviour | Tag |
|---|---|---|
| Session cookie | `ASP.NET_SessionId` — Secure, HttpOnly, SameSite=Lax | [O] |
| Login state | Established by `POST /Misc/UserLogon` (module 02); all `/MemberArea/*`, `/Reservation/*`, member `/Base/*` lookups require it | [O] |
| Anonymous access to member page | HTTP 302 → `/Misc/TimeOut` | [O] |
| Anonymous access to `/Reservation/Index` | HTTP 302 → `/Misc/NotAllow` (guest booking disabled) | [O] |
| Session expired during AJAX lookup | JSON `{ "Redirect": "<url>" }` → client navigates to that URL | [C] |
| Session expired during grid refresh | Partial returned without `#MainGrid` content → client goes to `/Misc/TimeOut` | [C] |
| Logout | `GET /Misc/Logout` → 302 `/` | [O] |
| Server-side draft | The booking wizard keeps the reservation draft in session between step POSTs (module 13) | [O] |

## 2. Request format
- `Content-Type: application/x-www-form-urlencoded; charset=UTF-8`, header `X-Requested-With: XMLHttpRequest` (jQuery).
- Forms are posted whole (`$(form).serialize()`): every named input, checked radio/checkbox, select value. ASP.NET checkbox pattern: a checkbox `name=X value=true` plus a hidden `name=X value=false`, so the server receives `X=true&X=false` (checked) or `X=false` (unchecked).

## 3. Response envelopes used by the server

| Pattern | Shape | Used by |
|---|---|---|
| Status JSON | `{ "success": true\|false, "error": "msg" }` | VerifyUser, VerifyCompanyName, ChangeAccountNo, FindAddressZone, FindZoneByZip, address/contact save errors |
| Message JSON | `{ "success": false, "message": "msg" }` | RideSearch, ReservationInfo cancel, CancelReservation, login |
| Message-or-HTML | `{ "message": "msg" }` **or** an HTML page | PersonalInfo, BillingAddress, Preferences, ChangePassword — non-empty `message` ⇒ show message; otherwise the HTML replaces the page body |
| Lookup array | `[ {…}, … ]` | all `Base/Get*` lookups |
| Redirect JSON | `{ "Redirect": "relative-url" }` | lookups and booking step POST when session lost |
| Booking step JSON | see module 13 | `POST /Reservation/Index` |

## 4. Error routes
| Situation | Result |
|---|---|
| Unknown route | 302 `/Misc/Error?aspxerrorpath=/path` |
| Server exception / bad parameters | 302 `/Misc/Error` |
| Any AJAX transport error (client) | Navigate to `/Misc/Error` |

## 5. Messaging semantics (behavioural, UI-agnostic)
- One global message channel per page. A message stays at least 10 s before an automatic hide can clear it; many flows auto-hide after 5, 10 or 15 s.
- "Fields marked with * are required fields." is the generic required-field error for multi-field validation.

## 6. Input sanitising on submit [C]
On every form submit, text and password values have the **first occurrence** of each of `| & ; $ % ' " < > + \ * \n \r 0x0a 0x0d` removed (`FilterInput`). Revamp: replace with proper server-side validation/encoding; keep the per-field character rules from module 26 for data parity.

## 7. Context help API [O]
`GET /Misc/ReturnHelpFile?filename=<page URL>&index=<wizard step>` → plain-text path of a static help file.

| Page | index | File |
|---|---|---|
| Registration | 0 / 1 / 2 / 3 | `/Content/HelpWindow/BillingInfo.htm`, `PersonalInfo.htm`, `BillingAddress.htm`, `FAQs.htm` |
| Reservation | 0 / 2 / 3 / other | `RidePassengerInfo.htm`, `RideBillingInfo.htm`, `RidePreferences.htm`, `FAQs.htm` |
| Forgot password | any | `Forgot.htm` |
| Member area | any | `FAQs.htm` (`MemberArea.htm` also exists) |

Revamp: store help text per `page + step` in your CMS.

## 8. Static enumerations used across modules

| Enumeration | Values |
|---|---|
| Card type | `2` Visa, `1` MasterCard, `0` American Express, `5` Discover, `3` Diners |
| Car type (booking) | `0` No Preference, `3` Sedan, `4` SUV, `H` Standard Wheelchair Vehicle, `K` Premium Wheelchair Vehicle |
| Passengers | 1–4 |
| Stops | 0–4 |
| Airport pickup option | `C` Outside the terminal, `D` Inside the terminal (meet & greet charge), `B` On Demand / Ready Now, `A` Outside, Standby |
| Contact type | `3` Home Phone, `4` Office Phone, `5` Fax, `6` Cell Phone, `8` Email |
| Payment method filter | `a` All, `c` Credit Card, `v` Voucher |
| Ride status (observed) | Confirmed, Canceled, Billed |
| Account type (`acctype`) | `1` corporate account only, `2` account + credit card, `3` credit card only |
| Service-area states | New York, New Jersey, Connecticut, Pennsylvania, Virginia, Maryland, DC / District of Columbia (and abbreviations NY, NJ, CT, PA, VA, MD) |
