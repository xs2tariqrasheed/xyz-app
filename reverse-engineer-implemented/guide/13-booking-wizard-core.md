> ✅ **Implemented** in the XYZ app
>
> ✅ **Migrated to real gateway data** (2026-11-03): the module's action codes are mapped by heading from the gateway's real responses. Each code's real answer, and any code not yet answered or confirmed, is in §9 Gateway (real data).

# Module 13 — Booking Wizard Core (Reservation Flow & Step API)

Step-specific details: module 14 (passenger/time), 15 (locations), 16 (billing), 17 (preferences/contact).

## 1. Purpose
Create a car reservation through four data steps and a receipt. The server validates each step, keeps a **reservation draft in session**, returns a running summary and price estimate, and creates the reservation on the last step.

## 2. Access & entry points [O]

| Entry | Effect |
|---|---|
| `GET /Reservation/Index` | new booking, step 1 |
| `GET /Reservation/Index?isexpress=2` | express: draft pre-filled, steps 1–3 complete, opens at step 3 with summary + price + billing requirements shown |
| `GET /Reservation/Index?isexpress=istristate` | opens at step 3 with summary + price (tri-state flow) |
| `GET /Reservation/Index?isauthorize=true` | booking on behalf of an authorised employee (module 14) — opens at step 2 |
| `GET /Reservation/Index?passengerid={1..4}` | reload after changing "Reservation for" |
| `GET /Reservation/Index?isguest=…` | guest booking (anonymous users are redirected to `/Misc/NotAllow`; guest booking disabled) |
| Anonymous | 302 `/Misc/NotAllow` |

Page load also calls `POST /Reservation/GetCardNo` (module 16).

## 3. Steps [O]

| `hfactive` | Step title | Module |
|---|---|---|
| 0 | Passenger & Ride Info | 14 |
| 1 | Ride Address Info | 15 |
| 2 | Billing Method | 16 |
| 3 | Preferences | 17 |
| 4 | Ride Receipt (confirmation) | §6 |

Navigation: forward only through "Next" (server POST); "Prev" returns to a visited step without a server call; a step header can be reopened only if ≤ last visited step.

## 4. Draft/control fields posted with every step [O]

The whole form (137 named fields) is posted on every step. Control fields:

| Field | Meaning |
|---|---|
| `hfactive` | step being submitted (0–3) |
| `hfpickuptab`, `hfdroptab` | location type: `0` street, `1` airport, `2` landmark |
| `hfLatitude`, `hfLongitude`, `hfLatitudeDrop`, `hfLongitudeDrop` | geocoded coordinates |
| `hfIsMapError`, `hfIsMapErrorDrop` | `1` when the typed address could not be validated (dispatcher will validate) |
| `hfIsValidAddress`, `hfAddressType` | address validation state / Google place type |
| `hfDuplicateCall` | `true` after the user accepts a duplicate-booking warning |
| `hfisaccount` | `True`/`False` billing type |
| `hfisrequirement` | `1` when corporate requirement fields are present |
| `hfCardNo` | stored card number used to detect "card unchanged" |
| `hfIsAuthorize`, `hfSelEmployee`, `hfOldRideInfo`, `hfSelRideReason` | booking-for-others state |
| `hfFirstName`, `hfLastName`, `hfFirstNameOriginal`, `hfLastNameOriginal` | member's own name (restored when "Myself") |
| `hfIsTabDisable` | step headers locked after a passenger change |
| `CCTimeOut` | card-authorisation wait, seconds (`90`) |
| `hfNextReservation` | minutes until earliest/express dispatch (`15`) |
| `hfZonePrice` | `False` — zone-price flag |

## 5. Step submit API

### `POST /Reservation/Index` [C contract; O fields]
Request: full form, `hfactive` = current step.

Response JSON (all keys optional):

| Key | Type | Meaning |
|---|---|---|
| `success` | bool | step accepted |
| `error` | string | error text when `success=false` |
| `isduplicate` | bool | similar reservation exists |
| `summary` | HTML | contains `#inner_1` (reservation summary), `#inner_2` (locations + price estimate), `#inner_5` (server status codes / messages) |
| `Redirect` | string | navigate to `../{Redirect}` |
| `isavaiable` | bool | (guest, step 0) e-mail already has a profile → prompt password (`Base/VerifyLogon`) |
| `refresh` | bool | (step 0) reload as `Index?isauthorize=true` |
| `reqhtml`, `reqhtmlscript` | HTML / script | corporate account requirement fields + their validator |
| `islogin` | bool | member logged in → lock account # field |
| `confirm` | HTML | (step 3) ride receipt |
| `header` | HTML | (step 3) refreshed page header |

#### Handling by step [C]

| Step | Success path | Special codes in `#inner_5` |
|---|---|---|
| 0 | `isavaiable` → login prompt; `refresh` → reload with `isauthorize=true`; else go to step 1 | — |
| 1 | If `#inner_5` text > 10 chars → show it and stay. Else show price (`#inner_2`), render `reqhtml` requirements (into account or account+card section), lock account # if `islogin`, go to step 2 | `CCExpire` → "Your credit card on file has expired. Kindly use a new credit card or enter the updated information."; `CCAccount` → account is credit-card-only: force card mode, disable other billing options |
| 2 | If `#inner_5` > 10 chars → show. Account modes → step 3. Card mode → card authorisation (module 16) then step 3 | `CCAccount` → start card authorisation; `Accworeq` → call `GetAccountMethod` and switch billing mode; `RAccount` → account needs requirement fields: call `GetAccountMethod`, render `reqhtml`, stay |
| 3 | Reservation created: render `confirm` receipt, refresh header, lock all steps | — |

Failure (`success:false`, non-empty `error`):
- `isduplicate:true` → "Duplicate/Similar call already exists. Please click the checkbox if you want to continue processing current reservation?" — user ticks → `hfDuplicateCall=true` → resubmit.
- otherwise show `error` (15 s). Summary refreshed from `summary`. At step 3 (guest) → guest profile dialog.

## 6. Data rendered

### Running summary (`#inner_1`) [O]
Passenger & Ride Info (passenger name, date & time, Reservation for, Ride Reason) · Ride Address Info (Pickup From, Going To) · Billing Method (Account #, VIP #, card expiry when card) · Price · Preferences (fleet "XYZ", car type, confirmation by, e-mail, passengers, stops).

### Price estimate (`#inner_2`) [O]
From/To location labels and **Estimated Price $** with breakdown: Fare, Service Charges, Meet & Greet, Event Surcharge, Fuel Surcharge, Taxes, NYS CFS, NY Sales Tax Rate (%). Values computed server-side after step 1 **[U values]**.

### Receipt (`confirm`, step 4) [U]
Returned HTML after creation (reservation # etc.). Not observed — booking was not submitted. The reservation detail model is in module 20.

## 7. Hard business rules [O/C]
- Pickup date ≤ today + 90 days ("Reservation can be made maximum of 90 days in advance.").
- Pickup address required ("Please enter or select the pickup address.").
- Pickup or drop-off containing "metlife" + "stadium" is refused: "For Metlife Stadium jobs, please call customer service at 929-999-5466."
- Unvalidated address requires explicit acknowledgement (`chkConfirmInvalid`); zone mismatch requires acknowledgement (`chkConfirmPickup`).
- Addresses outside NY/NJ/CT/PA/VA/MD/DC block the step: "You must call XYZ on 929-XYZLimo to make special arrangements for this pickup / drop off address."
- Premium wheelchair vehicle (`K`) cannot be booked online (module 17).

## 8. Revamp notes
- API: `POST /reservations/drafts` → `PATCH /reservations/drafts/{id}/steps/{n}` (returns `{summary, priceEstimate, warnings[], requirements[], nextStep}`) → `POST /reservations/drafts/{id}/submit` (idempotency key) → `{reservationNo, receipt}`.
- Return structured JSON instead of HTML fragments and magic strings (`CCExpire`, `CCAccount`, `Accworeq`, `RAccount`).
- **Unknown**: final receipt payload; server-side duplicate rule; price formula.

## 9. Gateway (real data)

Checked against the live gateway on 2026-11-03 (`docs/XYZ_INTEGRATION_GUIDE.md` §7a, §10; status per code in `docs/XYZ Real Action Codes.md`). Every value is read by the one heading its code sends; an empty one shows "Not available", and a `"9"` answer shows the screen's own copy.

| Action code | When | Real answers |
|---|---|---|
| `RES.I.RESERVATION` | Preview → Book | `o_code, o_message`: `"0"` with the **new reservation number** in `o_message`. 24-hour time → `"9"` ORA-01849; ride purpose and CC e-mail both blank → `"9"` ORA-01400. |
| `RES.U.RESERVATION` | Preview → Save changes | `"1"` / `Invalid reservation number.` for the test ride; a successful update not seen. |
| `RES.U.FORMAT_EMAIL_MESSAGE` | After a save with a number | `"0"` / `success` (one e-mail sent to the test login). Not in the backend test client. |

- **`"0"` = booked.** `RES.I.RESERVATION` answered `"0"` with the new number (`W6110231278`, `W6110331282`); the app shows it on the receipt. That those rides then don't appear in `LOAD_RESERVATION` or the order lists is a database issue (backend). `"5"` means a matching booking already exists (its number in `o_message`): Preview shows "Already booked" with that number and a "View your reservation" button, as the old site's duplicate warning did (§5), without its "continue anyway" box, which the contract has no parameter for. A blank trip purpose fails with `ORA-01400`, so the form requires it.
- **Value codes** sent (from stored rides and the backend test client): `P_PU_TYPE` / `P_DO_TYPE` `1` street, `2` airport, `3` landmark; `P_PAYMENT_METHOD` `1` / `2` / `3`; `P_CONFIRMATION_METHOD` `ML` / `SND`; `P_CALL_SOURCE` `W`; `P_RESERVATION_MAKE_FOR` `1` / `2`; `P_*_ADDRESS_ADD` `N`; `P_RESERVATION_TIME` `hh:mm AM|PM`. The unconfirmed ones are marked `TODO(schema-unverified)` in `src/services/reservation.ts`.
