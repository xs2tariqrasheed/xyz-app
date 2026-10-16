# XYZ Integration Guide

Everything needed to call the gateway, handle its response and wire a new action code. The list of action codes and their parameters lives in [XYZ Action Codes.md](XYZ%20Action%20Codes.md).

| Piece | File |
|---|---|
| Gateway client (`callGateway`, `mapRows`, `getErrorDisplay`) | [src/services/gateway.ts](../src/services/gateway.ts) |
| Envelope context (IP, device, GPS) | [src/services/requestContext.ts](../src/services/requestContext.ts), [src/services/location.ts](../src/services/location.ts) |
| Hooks | [src/hooks/usePostData.ts](../src/hooks/usePostData.ts), [src/hooks/useFetchData.ts](../src/hooks/useFetchData.ts) |
| Action codes & protocol constants | [src/constants/actionCodes.ts](../src/constants/actionCodes.ts) |
| Env config | [src/config/gateway.ts](../src/config/gateway.ts), [.env.example](../.env.example) |
| Auth | [src/context/AuthContext.tsx](../src/context/AuthContext.tsx), [src/services/auth.ts](../src/services/auth.ts), `src/services/authStorage(.web).ts` |

---

## 1. The call at a glance

```
1. Collect context  →  client IP · device id/info · app version · GPS
2. Build envelope   →  { ActionCode, ViewName, ClientIP, JsonReq{JHeader, JMetaData, JData}, Notes }
3. POST             →  EXPO_PUBLIC_DBAPI_URL  (30 s timeout, up to 3 attempts)
4. Check            →  JHeader.ActionCode == 0 ? gateway OK : GatewayError('api')
5. Map              →  JMetaData.Headings + JData rows → keyed objects
6. Check o_code     →  the procedure's own verdict, where the action returns one
```

One endpoint for everything. **`ActionCode` picks the backend operation, `JData` carries its parameters.** Every current code is sent with `ViewName = GATEWAY_VIEW_NAME` (`"LOGIN"`).

Screens never call `fetch` or build envelopes — they use a hook (§5) or a service that wraps one.

---

## 2. Configuration

All values come from `EXPO_PUBLIC_*` env vars (inlined at build time, so keep `process.env.X` as static dot access). Keep [.env.example](../.env.example) in sync whenever you add one.

| Env var | Used for | Required |
|---|---|---|
| `EXPO_PUBLIC_DBAPI_URL` | Gateway endpoint | yes |
| `EXPO_PUBLIC_DBAPI_SOURCE` / `_TARGET` | `JHeader.Source` / `Target` | yes |
| `EXPO_PUBLIC_DBAPI_LOGIN` / `_PASSWORD` | `JHeader.APILogin` / `APIPassword` | yes |
| `EXPO_PUBLIC_DBAPI_CLIENT`, `_CLIENT_VERSION`, `_API_VERSION`, `_REQUESTED_URL` | Optional `JHeader` fields; empty if unset (`ClientVersion` falls back to `app.json` version) | no |
| `EXPO_PUBLIC_JHEADER_FALLBACK_LAT` / `_LNG` | GPS fallback (default `"0"`) | no |
| `EXPO_PUBLIC_CLIENT_IP_LOOKUP_URL` | Public-IP lookup (`{"ip":…}` or plain text); unset → `"0.0.0.0"` | no |
| `EXPO_PUBLIC_AUTH_SESSION_MAX_AGE_HOURS` | How long a stored login stays valid (default 720) | no |

If a required var is missing, `callGateway` throws before sending.

> **Security:** `EXPO_PUBLIC_` values ship in the bundle in plain text, including the gateway password.

---

## 3. Request envelope

```json
{
  "ActionCode": "PROF.S.CHECK_LOGIN_CREDENTIALS",
  "ViewName": "LOGIN",
  "ClientIP": "203.0.113.10",
  "JsonReq": {
    "JHeader": {
      "Client": "", "Source": "", "Target": "",
      "DeviceType": "Apple", "DeviceInfo": "iPhone 15 iPhone15,4", "DeviceID": "<install id>",
      "ViewName": "LOGIN", "ActionCode": "PROF.S.CHECK_LOGIN_CREDENTIALS",
      "ClientVersion": "", "APIVersion": "", "APILogin": "", "APIPassword": "",
      "RequestedURL": "", "Debug": "false",
      "GPSLatitude": "40.7128", "GPSLongitude": "-74.0060", "GPSSpeed": "", "GPSBearing": ""
    },
    "JMetaData": {},
    "JData": { "P_LOGIN_ID": "user@example.com", "P_PASSWORD": "********" }
  },
  "Notes": "Test Notes ..."
}
```

| Field | Source |
|---|---|
| `ActionCode`, `ViewName` | Sent **twice**: top level and inside `JHeader` |
| `ClientIP` | Public IP, looked up once per session; fallback `"0.0.0.0"` |
| `DeviceType` | `"Apple"` (iOS), `"Android"`, `"Web"` |
| `DeviceInfo` | `"<model> <model id>"`; OS name/version on web |
| `DeviceID` | Random UUID created on first launch, kept on device (`xyz.device.id`) |
| `Debug` | Always `"false"` |
| `GPSSpeed` / `GPSBearing` | `JData.P_GPS_SPEED` / `P_GPS_BEARING`, else `""` |
| `JMetaData` | Always `{}` on requests |
| `JData` | Parameters exactly as named in [XYZ Action Codes.md](XYZ%20Action%20Codes.md) (`P_` prefix, string values unless the contract shows a number) |
| `Notes` | `GATEWAY_NOTES` (`"Test Notes ..."`) |

Every `JHeader` value is a **string**.

**GPS rule** — first valid pair wins, never empty:
1. Coordinates in `JData`: `P_PICKUP_LAT/LON`, then `P_LAT/LON` (`JDATA_GPS_KEYS`).
2. Last known device position (cached, `xyz.gps.last`).
3. One fresh device read per session (waits ≤ 5 s only when nothing is cached).
4. `EXPO_PUBLIC_JHEADER_FALLBACK_LAT/LNG`.

---

## 4. Sending, response and mapping

The envelope is built **once** per call; retries resend the same body. A write that must not run twice (e.g. a password change, where the resend would carry an old password that no longer matches) passes `{ retry: false }`.

| Situation | Error kind | Retried? |
|---|---|---|
| `JHeader.ActionCode == 0` | — (success) | — |
| `JHeader.ActionCode != 0` | `api` (message = `JHeader.Message`) | **No** |
| Timeout, no connection, HTTP error | `network` | Yes, 3 attempts, back-off 500 ms × attempt — unless the caller passes `retry: false` |
| HTTP `401` | `network` | No (until the service token in §8 exists) |
| Body not JSON / no `JHeader` | `parsing` | No |
| Caller's `AbortSignal` fired | the abort error | No |

**Response shape** — the body may be an object or that object JSON-encoded again as a string; `parseBody` handles both.

```json
{
  "JHeader":   { "ActionCode": 0, "Message": "", "SysVersion": "" },
  "JMetaData": { "Headings": ["login_id", "first_name", "last_login"] },
  "JData":     [["jdoe@x.com", "John", "10/11/2026 09:20 AM"]]
}
```

Data is column-oriented. `mapRows(response)` pairs each row with the heading keys and returns `Record<string, string>[]` (nulls become `""`). A heading may be a plain key or a `[key, displayName, type, …]` tuple — index 0 is always the key.

- **Single record** (login, profile): use `rows[0]`.
- **List** (addresses, orders): use every row.

**Two levels of success.** `JHeader.ActionCode == 0` only means the gateway executed the procedure. Many procedures also return `o_code` / `o_message` in row 0; `o_code === DB_SUCCESS_CODE` (`"0"`) means the operation itself succeeded. Check it in the service, and fail closed when it is missing.

---

## 5. Hooks

| Hook | Use for | Runs |
|---|---|---|
| `usePostData()` | Writes and actions: login, create/update/cancel, delete | Only when `mutate` / `mutateAsync` is called |
| `useFetchData(code, view, jData)` | Reads: profile, lists, dropdowns | On mount, and whenever an input changes by value |

Both return `isLoading`, `isSuccess`, `isError`, `data` (raw response), `parsedData` (`mapRows` output), `error`, `errorDisplay`.

### `usePostData`

```ts
const save = usePostData();

save.mutate(ACTION_CODES.X, GATEWAY_VIEW_NAME, jData);                     // outcome lands in state
const res = await save.mutateAsync(ACTION_CODES.X, GATEWAY_VIEW_NAME, jData); // resolves or throws
await save.mutateAsync(ACTION_CODES.X, GATEWAY_VIEW_NAME, jData, { retry: false }); // never resent
save.reset();
```

- Positional arguments, not one object.
- One instance tracks only its **latest** call — use one instance per action. A slower, older call never overwrites a newer result.
- `isSuccess` does **not** check `o_code`; do that yourself.

### `useFetchData`

```ts
// src/context/ProfileContext.tsx — screens read the result through useProfile().
const { data, isLoading, errorDisplay, refetch } = useFetchData(
  ACTION_CODES.LOAD_PROFILE,
  GATEWAY_VIEW_NAME,
  { P_LOGIN_ID: loginId },
);
const profile = toCustomerProfile(data ? mapRows(data) : undefined);
```

- Inputs are compared by value (`JSON.stringify`), so an inline `jData` literal is fine — but keep timestamps / random ids out of it or it refetches forever.
- No `enabled` flag: render the component only when its inputs are ready.
- In-flight requests are aborted when inputs change or the component unmounts.
- `refetch()` reruns the same request; the previous data stays visible meanwhile.

### Where state lives

- Single-screen read → `useFetchData` in the screen.
- Shared across screens → a context in `src/context/` (provider in `src/app/_layout.tsx`, exported `use<Name>` hook only).

---

## 6. Mapping, rendering and errors

**Map once, in a service** (e.g. `toCustomerProfile` in [src/services/profile.ts](../src/services/profile.ts)), never in the screen:
- rename raw columns (`first_name`) to app names (`firstName`);
- default missing fields (`''`, `0`, `[]`, `null`);
- convert types — gateway date-times are `MM/DD/YYYY hh:mm AM|PM` local time.

**Every screen handles four states:** loading → error → empty → data. Lists use a stable key (an id, not the index).

**Errors.** `getErrorDisplay(error)` returns `{ title, customDescription, errorType }`:

| Kind | Shown to the user |
|---|---|
| `api` | The gateway's own `Message` |
| `parsing` | "Something went wrong. Please try again." |
| `network` / anything else | "We couldn't reach the server. Check your connection and try again." |

User-facing copy (titles, validation, success and error text) lives in [src/constants/messages.ts](../src/constants/messages.ts) — screens and services import it, never spell it inline. Never show raw technical text (DB codes, stack traces). There is no global error sheet — each screen renders its own error, from `errorDisplay` or a screen-specific mapping (e.g. `AuthError` vs `GatewayError` in `login.tsx`). Show one message per problem, and keep it short (see the "no noise" rule in CLAUDE.md).

---

## 7. Authentication

There is **no user token**. The gateway verifies credentials and the app keeps a local record that this device passed that check.

**Login** (`useAuth().signIn({ email, password, remember })`):
1. Normalise the email (trim + lowercase) → `loginId`.
2. `PROF.S.CHECK_LOGIN_CREDENTIALS` with `{ P_LOGIN_ID, P_PASSWORD }`.
3. Success only if **both** `JHeader.ActionCode == 0` **and** row 0 `o_code === "0"`.
   - `o_code` other than `"0"` → `AuthError(o_message)`.
   - No `o_code` → `GatewayError('parsing')` (fail closed).
4. Save session `{ version: 1, loginId, authenticatedAt }` and set status `signedIn`.

**Session storage**

| | Remember me ticked | Not ticked |
|---|---|---|
| iOS / Android | SecureStore (Keychain / Keystore) | Memory — ends with the process |
| Web | `localStorage` | `sessionStorage` — ends with the tab |

Storage failures fall back to memory. "Remember me" keeps the **session**, it never stores the password.

**Restore on launch.** `AuthContext` starts in `restoring`; the root layout renders nothing and holds the splash. A stored session is accepted only if it parses, is version 1, has a valid email, isn't dated in the future and is younger than `EXPO_PUBLIC_AUTH_SESSION_MAX_AGE_HOURS`. Otherwise it is wiped → `signedOut`. Sessions are never re-verified with the server.

**Routing.** `Stack.Protected guard={signedIn}` wraps `(app)`; `login`, `forgot-password` and `register` are guarded by `!signedIn`. Navigation follows the status — no manual redirects.

**Identify the user in later calls** by sending `P_LOGIN_ID: session.loginId` in `JData` (e.g. `PROF.S.LOAD_PROFILE`).

**Password recovery** (`forgot-password.tsx`): `PROF.S.PASSWORD` with `{ P_LOGIN_ID }` (normalised like login) via `usePostData`. A returned `o_code` other than `"0"` → `AuthError(o_message)`; no `o_code` → sent. On success the screen shows "check your email".

**Change password** (`change-password.tsx`, form in `src/components/account/ChangePasswordForm.tsx`): `PROF.U.PASSWORD` with `{ P_LOGIN_ID: session.loginId, P_OLD_PASSWORD, P_NEW_PASSWORD }` via `usePostData`, sent with `retry: false`. The confirm field is checked on the client only — the contract has no parameter for it. A returned `o_code` other than `"0"` (e.g. a wrong old password) → `AuthError(o_message)`; no `o_code` → changed. The session holds no password, so the user stays signed in.

**Profile — Personal Info** (`profile.tsx`, state in `src/context/ProfileContext.tsx`, mapping in `src/services/profile.ts`; spec `reverse-engineer-implemented/guide/07-profile-personal-info.md`). `ProfileProvider` loads `PROF.S.LOAD_PROFILE` once per signed-in login and shares it through `useProfile()` — Home's welcome line and the Profile form read the same request. The form pre-fills name, US callback phone, international callback phone and fax from the row (`first_name`, `last_name`, `phone_number_us` / `phone_ext_us`, `dial_code_intl` / `phone_number_intl` / `phone_ext_intl`, `fax_dial_code` / `fax_number`); the column names live in one `COLUMNS` map. Update sends `PROF.U.PROFILE` via `updatePersonalInfo` with `retry: false`; anything but `o_code` `"0"` → `ProfileError(o_message)`, no `o_code` → `GatewayError('parsing')`. On success the profile is reloaded.

- **The update replaces the whole profile.** `PROF.U.PROFILE` has no personal-info-only variant, so `updateProfileJData` sends the edited fields on top of the loaded row: every other parameter (`P_PASSWORD`, address, card, account requirements, preferences) is copied from the `LOAD_PROFILE` column named like it without the `P_` prefix (`P_CC_YEAR` → `cc_year`), or sent as `''` when the row has no such column. **Today's `LOAD_PROFILE` returns none of those columns**, so they all go out blank — confirm with the backend that blanks are ignored (or that `LOAD_PROFILE` will return them) before this reaches real data.
- **Phones.** International and fax numbers go out as calling code + number in one run of digits (`P_PHONE_NUMBER`, `P_FAX`), as in registration. On load the calling code is matched back to a picker country; a code shared by several countries (+1) picks the first listed. The fax extension box is hidden — the contract has no parameter for it.
- **Validation** follows module 07: first name optional (≤15, no digits or `"`), last name required (2–20, no digits or `"`), US phone 10 digits not starting with 0/1, extensions ≤5 digits, international and fax ≥7 digits with the calling code, and at least one callback phone. Registration shares the same rules but still requires a first name.

**Registration** (`register.tsx`, services in `src/services/registration.ts`): a three-step wizard — Account & Personal Info → Mailing Address → Billing Info. Every lookup answers `o_code` / `o_message`; anything but `"0"` → `RegistrationError(o_message)`, no `o_code` → `GatewayError('parsing')`.

| Step | Action code | JData |
|---|---|---|
| 1 → Next | `PROF.S.IS_UNIQUE_EMAIL` | `P_LOGIN_ID` (normalised email) |
| 3, VIP field left / Create account | `PROF.S.IS_VALID_VIP` | `P_ACCOUNT_NUM`, `P_VIP_NUM` |
| 3 → Create account (corporate) | `PROF.S.IS_VALID_COMPANY_NAME` | `P_ACCOUNT_NUM`, `P_COMPANY_NAME` |
| 3, account number left / Create account (corporate) | `PROF.S.ACCOUNT_REQUIREMENTS` | `P_ACCOUNT_NUM` |
| …only when that says the account has requirements | `PROF.S.ACCOUNT_REQUIREMENTS_RS` | `P_ACCOUNT_NUM` |
| 3 → Create account | `PROF.I.PROFILE` | all 41 parameters, built by `createProfileJData` |

`PROF.I.PROFILE` always sends every parameter. Mapping notes:

- **Apt # / Mail stop** has no parameter of its own and goes in `P_CROSS_STREET2`.
- **Fax** has no extension parameter, so registration hides the fax extension box.
- **Car preferences** (optional, Billing step): `P_PREFERRED_FLEET`, `P_CAR_YEAR` (4 digits), `P_CAR_PHONE` (US, 10 digits), `P_SMOKING_CAR` (`Y`/`N`), `P_IVR_PIN` (4 digits).
- **Account requirements** (two calls, as on the old site): `ACCOUNT_REQUIREMENTS` decides *whether* the account has requirement fields; only then does `ACCOUNT_REQUIREMENTS_RS` list them, one row per field (up to 4), each shown as a required field whose answer goes in `P_ACCOUNT_REQ1–4`. The answer is cached per account number, so leaving the field and then pressing Create account asks once; a new account number clears the answers. A refusal (`o_code` ≠ `"0"`) shows on the Account number field, and again above the form on Create account.
  Neither code's outputs are documented and the gateway stub returns only `o_code` / `o_message` (and placeholders for `_RS`), so `registration.ts` reads them defensively: `accountHasRequirements` treats any extra column that is not a "no" (`N`, `0`, empty) as yes; `accountRequirementLabels` takes each row's label from the first of `REQUIREMENT_LABEL_COLUMNS`, else its first non-numeric value, and checks `o_code` only when the record set carries one. Against today's stub the account has no requirements, so `_RS` is never called.
- **Unconfirmed codes**, each set in one place in the service: `P_PAYMENT_TYPE` corporate = `CA` (only `CC` is documented) and `P_ADDRESS_TYPE` office = `O` (only `H` is documented).

On success the screen links back to login; the user is not signed in automatically.

**Logout** (`signOut`): clear stored session, set `signedOut`. Local only, no gateway call.

---

## 7a. Reservations

Wired on **Reservation 2** (`src/app/(app)/reserver-2.tsx`) and the ride screens; specs `reverse-engineer-implemented/guide/05`, `06`, `13`–`22` and `reverse-engineer-guide/23`, `24`. The original `/reserve` layout stays in the menu unwired; every other entry point opens `/reserver-2`.

| Piece | File |
|---|---|
| Draft, place / zone lookups, billing checks, card approval, submit | `src/context/ReservationContext.tsx` (`useReservation()`) |
| Saved addresses shared by Home and the form | `src/context/SavedPlacesContext.tsx` (`useSavedPlaces()`) |
| Draft ↔ JData, record mapping, cancel, e-mail, extra values | `src/services/reservation.ts` |
| Billing rules, requirements, card approval | `src/services/billing.ts` |
| Zones · saved places · car types · rides · tracking · questions | `src/services/zones.ts`, `savedPlaces.ts`, `vehicleTypes.ts`, `rides.ts`, `tracking.ts`, `feedback.ts` |
| Step checks (guide 26) | `src/services/reservationValidation.ts` |
| Defensive row readers (`pick`, `recordSet`, `assertResultCode`) | `src/services/gatewayRows.ts` |
| Step lookups / open-for-edit | `src/hooks/useReservationLookups.ts`, `src/hooks/useReservationActions.ts` |

| Where | Action code | JData / notes |
|---|---|---|
| Home dashboard, History tab | `RES.S.ALL_ORDERS` | `P_LOGIN_ID`, `P_DATE_FROM` / `P_DATE_TO` (`MM/DD/YYYY`), `P_TOTAL_RECORDS` (number). Payment filter runs on the client — the contract has no parameter for it. |
| Upcoming tab | `RES.S.UPDATABLE_ORDERS` | `P_LOGIN_ID` |
| Express panel, address fields | `PROF.S.USER_ADDRESSES` (+ `USER_PROFILE_ADDRESSES`, and `CORPORATE_ADDRESSES` with an account) | Listed above the Google results as "Your places". |
| Step 1 | `PROF.S.LOAD_PROFILE` ✅, `PROF.S.LOAD_PROFILE_WHO_GRANTED_ACCESS` | Names pre-fill from the profile; "Reservation for" shows only when someone granted access. |
| Step 2, stop picked | `RES.S.GOOGLE_ZONE_NUM` (has lat/lon/ZIP) or `RES.S.ZONE_THE_LOCATION` | Google stops are resolved with Place Details first. No match / no answer → the customer must acknowledge the address (guide 13). Airport stops ask for airline, flight # and pickup option. |
| Step 3 | `RES.S.BILLING_METHOD`, `RES.S.IS_CREDIT_CARD_SPECIFIC_ACCOUNT`, `RES.S.ACCOUNT_REQUIREMENTS_LIST` ×4, `PROF.S.IS_VALID_VIP` ✅, `PROF.S.ACCOUNT_VIP_NUM` | Account-keyed reads mount only with an account number. Continue → `RES.S.VERIFY_ACCOUNT_REQUIREMENTS` (`P_IS_RES 'Y'`), or for a card `RES.I.CREDIT_CARD_APPROVAL` then `RES.S.CREDIT_CARD_APPROVAL` every 10 s for up to 90 s. |
| Step 4 | `RES.S.VEHICLE_TYPE`, `PROF.S.LOAD_PROFILE_COLUMN_VALUES_BY_TYPE` (8 e-mail, 6 cell) | First car type is the default. Passengers 1–4, stops 0–4. |
| Preview → Book / Save changes | `RES.I.RESERVATION` / `RES.U.RESERVATION` | Every contract parameter, `retry: false`, behind an in-flight lock. Then (needs a reservation number) the Email CC values via `RES.*RESERVATION_COLUMN_VALUE` and `RES.U.FORMAT_EMAIL_MESSAGE`, both best effort. |
| Details | `RES.S.LOAD_RESERVATION`, `PROF.S.CAR_INFO`, `RES.S.COMMUNICATION_LOG`, `RES.S.LOAD_RESERVATION_COLUMN_SINGLE_VALUE` | Edit / return trip / repeat reload the record and open the wizard. |
| Cancel (rides, details) | `RES.U.CANCEL_RESERVATION` | Reason required, ≤ 50 characters, `retry: false`. |
| Track your route | `RES.S.VEHICLE_LOG`, `RES.S.LATITUDE_LONGITUDE_FOR_CAR` | Position refreshes on demand only, as on the old site. |
| Voucher | `RES.S.LOAD_RESERVATION` | Drawn from the record — never the old internal image server. |
| Ask about this ride | `RES.S.ALL_PREDEFINED_QUESTIONS`, `RES.I.ASKED_QUESTIONS` | Message ≤ 200 characters. |

**Mapping notes**

- **Outputs are mostly undocumented.** Each service names, per field, every column the value may arrive under (today's gateway column first, then the old site's) and takes the first present; `recordSet` drops rows that carry only `o_code` / `o_message` or the stub's `placeholder_col*`. A refusal (`o_code` ≠ `"0"`) throws the service's own error; a write with no `o_code` fails closed.
- **No reservation number is ever made up.** `RES.I.RESERVATION` returns only `o_code` / `o_message` today, so the receipt says the ride is booked and links to Upcoming rides. The e-mail and Email CC writes need a number, so they run only once one is returned (and always on an edit).
- **Unconfirmed codes**, each set once in `src/services/reservation.ts`: `P_PU_TYPE` / `P_DO_TYPE` `S` / `A` / `L` (only `A` is in the samples); `P_PAYMENT_METHOD` `CA` / `AC` / `CC` (only `CC`); `P_RESERVATION_MAKE_FOR` `SELF` / `OTHER`; `P_CONFIRMATION_METHOD` `EMAIL` / `PHONE`; `P_CALL_SOURCE` `WEB`; `P_PU_DO_TYPE` `P` / `D`; Email CC column id `8` (the contact-type id).
- **Card data** stays in `ReservationContext` memory only — never stored, logged or shown unmasked — and is cleared after booking and on sign-out. An edit that keeps the card on file resends the masked number the record came with (the old site's "unchanged" convention); `RES.U.FORMAT_EMAIL_MESSAGE` gets a masked `P_CC_NUMBER1`. **The contract still posts full card numbers to the gateway**: tokenising them (00-README §5 #2) is a backend change.
- **Stub gaps today:** `PROF.S.USER_PROFILE_ADDRESSES`, `CORPORATE_ADDRESSES`, `LOAD_PROFILE_WHO_GRANTED_ACCESS`, `LOAD_PROFILE_COLUMN_VALUES_BY_TYPE` and `CAR_INFO` answer "Action code is not supported"; those lookups simply offer nothing extra. `LOAD_RESERVATION` returns the same record for every number.
- **No action code** exists for airports, airlines, streets or landmarks (guide 05) or the fare estimate: stops come from Google Places, airline and flight are typed.
- **Google Places (legacy)** backs address search: `place/autocomplete/json` and `place/details/json` on iOS / Android (`src/services/googlePlaces.ts`), and the Maps JavaScript API's `AutocompleteService` / `PlacesService` on web (`googlePlaces.web.ts`), because the web service sends no CORS headers. The route preview uses **Directions** the same way (`directions/json` with `mode=driving&departure_time=now`, and `waypoints` for stops, on iOS / Android; `DirectionsService` on web — `src/services/googleDirections(.web).ts`). The booking form shows the route on an interactive map the customer can pinch, drag and zoom with + / − / fit buttons (`src/components/reservation/RouteMapView(.web).tsx`: react-native-maps on iOS / Android, a Maps JavaScript API map on web). Track your route turns the car's position into a street address with **Geocoding** (`geocode/json?latlng=…`, which allows browser calls, so one implementation — `src/services/geocoding.ts`). The key needs **Places API**, **Directions API**, **Geocoding API**, **Maps JavaScript API**, **Maps Static API**, and **Maps SDK for Android / iOS** for native builds (`app.config.ts` passes it to react-native-maps); refusals show short copy to the customer and Google's reason in the dev console.

**Tests:** `e2e/reservation-2.spec.ts` drives every flow against the gateway and compares each request's JData keys with this contract. The card-authorisation case runs only with `E2E_CARD_TESTS=1`.

---

## 7b. Address book & contacts

Specs `reverse-engineer-implemented/guide/11`, `12` and `reverse-engineer-implemented/missing-screens/02`, `03`. Both screens render only what the gateway returns — the old seed lists are gone.

| Where | Action code | JData / notes |
|---|---|---|
| My Addresses list (`addresses.tsx`) | `PROF.S.USER_ADDRESSES` | The **same** request `SavedPlacesContext` makes for Home and the booking form; the context exposes it as `places` (booking suggestions) and `addresses` (editable entries, `toSavedAddresses` in `src/services/addressBook.ts`). |
| Add / edit / delete a location | `PROF.I.USER_ADDRESS`, `PROF.U.USER_ADDRESS`, `PROF.D.USER_ADDRESS` | Through `useSavedPlaces().saveAddress` / `deleteAddress`, `retry: false`, then the shared list reloads. `P_PICKUP_COUNT` = the row's `address_id` (the old site used the 1-based list position; that is the fallback when a row has no id). The international number goes in `P_PHONE_NUM` as dial code + number (no dial-code parameter). `P_COUNTRY` is the code (`US`). |
| My Contacts list (`contacts.tsx`) | `PROF.S.LOAD_PROFILE_COLUMN_VALUES` | `P_LOGIN_ID`. Rows mapped in `src/services/contacts.ts`; only the contact columns 3 home, 4 office, 5 fax, 6 cell, 8 e-mail are shown. |
| Add / edit / remove a contact | `PROF.I.PROFILE_COLUMN_VALUE`, `PROF.U.PROFILE_COLUMN_VALUE`, `PROF.D.PROFILE_COLUMN_VALUE` | A contact is identified by column id + stored value. Changing a contact's **type** adds it under the new column, then deletes the old one (the contract has no move). |

- **Validation** follows the old site (guide 11 §3, 12 §3, 26): a location needs country, state, city, building # (digits ≤ 6), street (4–30 street characters) and one callback number; ZIP is exactly 5 digits; pickup point ≤ 20; directions ≤ 500 without `"`. A contact phone is 10 digits not starting with 0/1; an e-mail ≤ 50; only an office phone takes an extension (≤ 5 digits).
- **Unconfirmed**, each set in one place: office extension stored as `<number>-<ext>` (`toStoredValue` in `src/utils/contacts.ts`, the old `CompleteContactNumber` form); contact load columns (`column_id` / `column_value` first, then the old site's names).
- **Stub today:** the address codes answer (the writes with a hard-coded success, so the reloaded list does not change); every contacts code answers "Action code is not supported", so My Contacts shows its load error and refuses saves with that message.

---

## 8. Not wired yet

- **Gateway service token.** The original contract sends `Authorization: Bearer <IdToken>` from a shared Cognito service account (`InitiateAuth`, `USER_PASSWORD_AUTH`, no client secret), fetched on app start, refreshed and retried once on HTTP `401`. It identifies the app, not the user, and is kept on logout. When added, it goes in `getAuthHeaders()` in `gateway.ts` (plus env vars) — nothing else changes. Prefer issuing it from a backend over shipping the service password.
- **Card tokenisation.** Reservations post card numbers through the gateway because the contract requires `P_CARD_NUMBER`; a tokenising payment gateway would replace that (reverse-engineer-guide/00-README §5 #2).

---

## 9. Adding a new action code — checklist

1. Find the code and its parameters in [XYZ Action Codes.md](XYZ%20Action%20Codes.md).
2. Add it to `ACTION_CODES` in [src/constants/actionCodes.ts](../src/constants/actionCodes.ts) with a one-line comment (`inputs → outputs`). Never hardcode the string.
3. Write a `…JData(…)` builder in the relevant `src/services/*.ts` with keys spelled exactly as the contract.
4. Pick the hook: write → `usePostData`, read → `useFetchData`. Shared across screens → put it in the context.
5. Map `parsedData` to an app type in the service (rename, default, convert types). Check `o_code` if the procedure returns one.
6. Render loading / error / empty / data; use `errorDisplay` for errors.
7. New env var? Add it to `src/config/gateway.ts` and `.env.example`.
8. Mark the code `— ✅ Implemented` in [XYZ Action Codes.md](XYZ%20Action%20Codes.md).
9. Run `npm run lint` and `npx tsc --noEmit`.
