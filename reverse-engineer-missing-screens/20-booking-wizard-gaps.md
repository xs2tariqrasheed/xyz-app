# Missing 20 — Booking Wizard Sub-Features (Reservation 2 / `reserver-2`)

| | |
|---|---|
| **App today** | 🔵 Partial. `src/app/(app)/reserver-2.tsx` + `src/context/ReservationContext.tsx` + `src/components/reservation/*` are wired:<br>• create / update<br>• zone check + acknowledgement<br>• airport pickup options C / D / B / A with airline, flight, arriving-from and terminal<br>• three billing modes<br>• account requirements<br>• card authorisation polling (10 s / 90 s)<br>• the K premium-wheelchair block<br>• e-mail and CC writes<br>• express checkout<br>The items below from the live wizard are absent. Guides 13–17 are marked "✅ Implemented", but these gaps remain. |
| **Legacy reference** | [`13-booking-wizard-core.md`](../reverse-engineer-implemented/guide/13-booking-wizard-core.md), [`14`](../reverse-engineer-implemented/guide/14-booking-passenger-time.md), [`15`](../reverse-engineer-implemented/guide/15-booking-locations.md), [`16`](../reverse-engineer-implemented/guide/16-booking-billing-payment.md), [`17`](../reverse-engineer-implemented/guide/17-booking-preferences-contact.md), [`05-lookup-services.md`](../reverse-engineer-implemented/guide/05-lookup-services.md) |
| **Gateway** | Mixed. See the "Code" column. |
| **Priority** | P1 for 20.1–20.5, which affect booking correctness. P2 for the rest. |

Also: the nav still lists **"Reservation" → `/reserve`**. It is an unwired duplicate wizard that makes up reservation numbers (`placeholderReservationNumber`). See file 21. Every gap below is about **`/reserver-2`**.

## 1. Gap list

### A. Correctness rules (P1)

| # | Live rule [O/C] | App today | Build | Code |
|---|---|---|---|---|
| 20.1 | **Service-area gate.** After a pick, pickup and drop-off state must be one of NY, NJ, CT, PA, VA, MD, DC (full or abbreviated). Otherwise Next is blocked: "You must call XYZ on 929-XYZLimo to make special arrangements for this pickup address." (or "drop off address" / "pickup and drop off address"). | Missing (only the zone check). | Validate in `src/services/reservationValidation.ts` on step 2 Next. Keep the state list in one constant. The phone number comes from config. Show the message with a "Call" action. | none (client rule; the server must re-check) |
| 20.2 | **MetLife Stadium refusal.** A pickup or drop-off containing "metlife" + "stadium" → "For Metlife Stadium jobs, please call customer service at 929-999-5466." | Missing. | Same validation path, case-insensitive on the address label / landmark / street. | none |
| 20.3 | **Duplicate / similar booking warning.** The step submit returns `isduplicate` → "Duplicate/Similar call already exists. Please click the checkbox if you want to continue processing current reservation?" The user ticks the checkbox → resubmit with `hfDuplicateCall=true`. | Missing. | Show an acknowledgement checkbox when the gateway reports a duplicate. Resubmit with an override flag. | ⛔ No code or flag in `RES.I.RESERVATION` today. Ask for either `o_code` = duplicate plus a `P_DUPLICATE_OK` param, or a `RES.S.DUPLICATE_RESERVATION` pre-check. |
| 20.4 | **Unvalidated-address acknowledgement** (separate from the zone acknowledgement). When the typed text matches neither a Google prediction nor a saved address: "We are sorry we could not validate this PICKUP adddress. This address will be validated by the dispatcher at XYZ. Please click the checkbox if you want to proceed?" (`chkConfirmInvalid`, `hfIsMapError=1`). | Missing. Only `ZONE_ACKNOWLEDGE` exists. | If the user keeps free text without choosing a suggestion, require this acknowledgement and send the address as unvalidated (no lat/lng). | Uses `RES.I.RESERVATION` as is |
| 20.5 | **Price estimate** after step 2 ("Estimated Price $": Fare, Service Charges, Meet & Greet, Event Surcharge, Fuel Surcharge, Taxes, NYS CFS, NY Sales Tax Rate %). The marketing "Price Calculator" also points here. | Missing (`ReservationSummary` shows no fare). | Show an estimate card in the step 3 / preview summary once a code exists. Never compute prices client-side. | ⛔ `RES.S.PRICE_ESTIMATE` (inputs: pickup and drop-off zone/zip/lat-lng, date-time, car type, stops, airport option) |

### B. Locations (step 2)

| # | Live feature | App today | Build | Code |
|---|---|---|---|---|
| 20.6 | **"As directed" drop-off** (`-9999`). There is no fixed destination; the drop-off fields are disabled and cleared. | The destination is required (`DESTINATION_REQUIRED`). "As Directed" exists only as a display string in details and voucher. | Add an "As directed" choice on the drop-off field. Send empty `P_DO_*` with type "as directed" [U: `P_DO_TYPE` value; confirm]. | `RES.I.RESERVATION` |
| 20.7 | **Airport shortcuts** JFK / LGA / EWR at the top of the pickup and drop-off lists, with fixed coordinates: JFK 40.643772, −73.781993; LGA 40.77392, −73.872002; EWR 40.706467, −74.161858. | Missing. | Three quick chips in the address field (pickup and drop-off) that set an airport stop. Coordinates and names in one constant. | none |
| 20.8 | **"Add this address to my saved locations"** (`AddPickupAddress` / `AddDropAddress`), offered only for Google *street_address* results. | Missing. | A checkbox under a validated street address. After `RES.I.RESERVATION` succeeds, call `PROF.I.USER_ADDRESS` (file 02) and `SavedPlacesContext.refetch()`. | ✅ `PROF.I.USER_ADDRESS` |
| 20.9 | **Explicit location type** (Street / Airport / Landmark tabs, `hfpickuptab`) with landmark lookup (`GetLandMark`: pickup points 1–4 offered as a choice, cross streets, area name, directions). | Inferred from Google `types`. No landmark lookup, pickup-point choice or area name. | Keep the inferred type (simpler UX) **but** let the user correct it. When a landmark has several pickup points, offer them. | ⛔ `RES.S.LANDMARKS`; until then Google place name only |
| 20.10 | **Street sub-fields:** cross street, pickup point (≤ 20), separate ZIP. | Free-text directions only. | Add optional cross street + pickup point under a "More details for the driver" reveal (no noise). Map them to `P_PU_CROSS_STREET`, `P_PU_POINT`. | ✅ `RES.I.RESERVATION` params exist |
| 20.11 | **Airline lookup** (`GetAirlines`, including terminal-specific entries like "Delta Term 4"). | Free text. | Keep free text until a code exists. | ⛔ `RES.S.AIRLINES` |
| 20.12 | **Meet & greet notice.** Choosing pickup option `D` (inside) → "Additional meet & greet charges will apply." Airport Pickups page (file 15): **$20 + parking**; free waiting 15 min domestic / 20 min international. | Option label only. | Show a one-line notice under the option when `D` is chosen. | none |

### C. Passenger (step 1)

| # | Live feature | App today | Build | Code |
|---|---|---|---|---|
| 20.13 | **"Reservation for"**: `1` Myself · `2`/`3` another passenger (free-text name) · `4` Authorised employee. | Myself or a grantor login only. Names are always editable. | Add "Someone else" (name entry; addresses, contacts and billing must be re-entered) as distinct from "Myself" (name locked to the profile). | client |
| 20.14 | **Load the authorised employee's profile** on selection (`LoadAuthorizeProfile`), with the reset confirm dialog (text in file 06 §5). | Missing. | Load the grantor's profile, addresses and contacts. Reset dependent steps. Show the confirm dialog first. | ✅ `PROF.S.LOAD_PROFILE`, `PROF.S.USER_ADDRESSES`, contacts (using the grantor's login) |
| 20.15 | **Ride reason**: an account-scoped dropdown on step 1 (e.g. "Business Trip", "After hours"), shown in the summary as "Ride Reason". | A free-text optional `ridePurpose` field on the Preferences step. | Move it to step 1 as a picker when the account defines reasons; hide it otherwise. | ⚠ Probably `PROF.S.LOAD_PROFILE_COLUMN_VALUES_BY_TYPE` with the ride-reason column id. The contract sample stores "Business Trip" under column 2 [I]. Confirm with the backend. |

### D. Billing (step 3)

| # | Live feature | App today | Build | Code |
|---|---|---|---|---|
| 20.16 | **Expired card on file** (`CCExpire`): "Your credit card on file has expired. Kindly use a new credit card or enter the updated information." | Missing. | When the stored card's month/year is earlier than the current month, show the notice and require new card details. | client (+ server refusal) |
| 20.17 | **Account-type mismatch notices**: `acctype=1` in account + card mode ("This account type does not support credit card payment. Your corporate account will be charged…"), `acctype=2` in account mode ("Mode of payment for entered account number is set to credit card…"). | The modes switch silently. | Show the matching one-line notice when the mode is forced. | ✅ `RES.S.BILLING_METHOD`, `RES.S.IS_CREDIT_CARD_SPECIFIC_ACCOUNT` |
| 20.18 | **Card authorisation terms link** (Terms §Credit card charge authorization). | Missing. | A link near the card fields (file 18). | config URL |

### E. Preferences (step 4)

| # | Live feature | App today | Build | Code |
|---|---|---|---|---|
| 20.19 | **Standard wheelchair (`H`) notice**: "25% tips apply for this vehicle." | Missing (the K block exists). | A one-line notice when H is chosen. | none |
| 20.20 | **Confirm-by-phone defaults from profile preferences** (module 09). | Not defaulted. | See file 04 §4.4. | ✅ `PROF.S.LOAD_PROFILE` |
| 20.21 | **Email CC picker**: a checkbox list of the member's e-mails with "select all" (`POST /MemberArea/EmailCC`). | Free-text CC + chips of profile e-mails (empty against the stub). | Keep the chips. Add "Select all" when there are 2 or more. Rely on file 03 for real contacts. | ✅ `PROF.S.LOAD_PROFILE_COLUMN_VALUES_BY_TYPE` (8) |
| 20.22 | **Callback phone chips** from all phone contacts (home 3, office 4, cell 6), not only cell. | Cell only. | Load 3, 4 and 6. | ✅ same code |

### F. Receipt

| # | Live | App | Build |
|---|---|---|---|
| 20.23 | The receipt shows the **reservation #** (`confirm` HTML). | `RES.I.RESERVATION` returns only `o_code` / `o_message` today, so the receipt says "booked" with no number. | Already handled defensively. When the gateway starts returning a number column, display it and enable the e-mail / CC writes. Ask the backend to return it. |

## 2. Suggested order
20.1 → 20.2 → 20.4 → 20.6 → 20.12 / 20.19 (notices) → 20.16 / 20.17 → 20.8 (after file 02) → 20.13 / 20.14 (after file 06) → 20.7 / 20.10 → blocked items (20.3, 20.5, 20.9, 20.11, 20.15) once the codes exist.

## 3. Messages to add (`RESERVATION_MESSAGES`)
- service-area refusal (×3 variants)
- MetLife
- duplicate warning + checkbox label
- unvalidated address + checkbox label
- meet & greet
- 25% tips
- card expired
- the two account-type notices
- passenger-change confirm
- "As directed"

Phone numbers come from config.

## 4. Acceptance criteria
- [ ] Each rule in section A blocks Next with its message, and the server re-check is documented as required.
- [ ] Every new param maps to an existing `RES.I.RESERVATION` / `RES.U.RESERVATION` parameter. New codes are added to `actionCodes.ts` and the doc only when the backend provides them.
- [ ] No price, airline or landmark data is invented locally.
