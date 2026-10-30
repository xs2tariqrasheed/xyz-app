# XYZ Integration Guide

Everything needed to call the gateway, handle its response and wire a new action code. The list of action codes and their parameters lives in [XYZ Action Codes.md](XYZ%20Action%20Codes.md); what each code **actually returns** is in §10, and which codes are migrated to real data is tracked in [XYZ Real Action Codes.md](XYZ%20Real%20Action%20Codes.md).

| Piece | File |
|---|---|
| Gateway client (`callGateway`, `mapRows`, `getErrorDisplay`) | [src/services/gateway.ts](../src/services/gateway.ts) |
| Envelope context (IP, device, GPS) | [src/services/requestContext.ts](../src/services/requestContext.ts), [src/services/location.ts](../src/services/location.ts) |
| Hooks | [src/hooks/usePostData.ts](../src/hooks/usePostData.ts), [src/hooks/useFetchData.ts](../src/hooks/useFetchData.ts) |
| Action codes & protocol constants | [src/constants/actionCodes.ts](../src/constants/actionCodes.ts) |
| Env config | [src/config/gateway.ts](../src/config/gateway.ts), [.env.example](../.env.example) |
| Auth | [src/context/AuthContext.tsx](../src/context/AuthContext.tsx), [src/services/auth.ts](../src/services/auth.ts), `src/services/authStorage(.web).ts` |
| Inspect a code's real response | [scripts/probe-action-code.mjs](../scripts/probe-action-code.mjs) — `npm run gateway:probe -- <CODE> '<JData JSON>'` |

---

## 1. The call at a glance

```
1. Collect context  →  client IP · device id/info · app version · GPS
2. Build envelope   →  { ActionCode, ViewName, ClientIP, JsonReq{JHeader, JMetaData, JData}, Notes }
3. POST             →  EXPO_PUBLIC_DBAPI_URL  (30 s timeout, up to 3 attempts)
4. Parse           →  the body is a JSON string holding the object; stray backslashes repaired
5. Check            →  JHeader.ActionCode == 0 ? gateway OK : GatewayError('api')
6. Map              →  Headings + JData rows → keyed objects (or by position, see §4)
7. Check o_code     →  the procedure's own verdict — its meaning is per code (§10)
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

**Real response structure** (verified against the live gateway, 2026-10-30 — §10 has every code):

The HTTP body is a JSON **string** that holds the response object (double-encoded); `parseBody` decodes both levels. Inside, a successful call looks like this — a **heading list followed by `JData`**:

```json
{
  "JHeader":   { "ActionCode": 0, "Message": "Request is parsed and response is generated successfully", "SysVersion": "1.0.0" },
  "JMetaData": { "Headings": ["o_code", "o_message"] },
  "JData":     [["0", "9990000001"]]
}
```

A failed call carries only `JHeader`, with `ActionCode` as a **string** and the reason in `Message`:

```json
{ "JHeader": { "ActionCode": "1", "Message": "Action code is not supported: PROF.S.…", "SysVersion": "1.0.0" } }
```

Seen so far: `"1"` (code not supported, or an Oracle cursor error), `"9"` (internal DB error). Messages can be raw Oracle text (`ORA-…`), which must never reach the screen.

`JData` is column-oriented: an array of rows, each an array of string values (never `null` so far; empty is `""`). `mapRows(response)` pairs each row with the heading keys and returns `Record<string, string>[]`. A heading may be a plain key or a `[key, displayName, type, …]` tuple — index 0 is always the key.

**Mapping rule: headings only** (applies to every action code):

1. Read the column names from `JMetaData.Headings`.
2. Pair each heading with the `JData` value at the same position — `mapRows`. A caller that reads named headings uses `mapRowsByHeadings(response, headings)`, which fails closed when one of them is missing from the response.
3. Access and display only values that have a heading. When a row has more values than headings, ignore every extra value: never name, map, read or display it, and never guess what it means.
4. Don't invent field names. A field the code's headings don't include isn't in its response.

Many record sets send more values per row than headings, or values that don't belong under the heading in their position. For example, `LOAD_PROFILE` sends 15 headings and 44 values, and its `first_name` heading pairs with the password. That's a gateway bug. Record it in §10 and the tracker's backend issues, and don't work around it by remapping positions.

**Writes that send loaded values back** (`PROF.U.PROFILE`, address update and delete) are refused while the loaded response has values past its last heading (`hasUnheadedValues`). Its pairing can't be trusted to write real data back.

- **Single record** (login, profile): use row 0.
- **List** (addresses, orders): use every row. The row count is whatever the procedure returns — `P_TOTAL_RECORDS` is not honoured today.

**Two levels of success.** `JHeader.ActionCode == 0` only means the gateway executed the procedure. The procedure's own verdict, where it returns one, is `o_code` / `o_message` in row 0 — but **their meaning is per code**, not a fixed rule:

- Login: `o_code "0"` = accepted, and `o_message` then carries **data** (the VIP number); `"1"` = refused, `o_message` = the reason.
- `RES.S.GOOGLE_ZONE_NUM` answers `o_code "1"` with the zone number in `o_message`; `RES.S.BILLING_METHOD` answers `"1"` = "Corporate Account"; `RES.S.LATITUDE_LONGITUDE_FOR_CAR` answers `"5"` = "No Data Found"; `RES.S.ZONE_THE_LOCATION` can answer an empty `o_code`.

So read the code's entry in §10 and decide in its service what each `o_code` means. Where a code does follow "0 = success", check it in the service and fail closed when it is missing (`DB_SUCCESS_CODE`, `assertResultCode`).

**Invalid JSON.** The gateway does not escape every value:

| Problem | Where | Handling |
|---|---|---|
| Stray backslashes (`\\192.168.168.19\Receipt_Images\…`) | Order and reservation rows | `parseBody` retries once with them doubled, so the response parses |
| Unescaped quotes in the message (`("OPTIMA"."WS_…")`) | Oracle error bodies | Can't be repaired; when the non-zero `ActionCode` is readable it becomes `GatewayError('api', COMMON_MESSAGES.REQUEST_NOT_ACCEPTED)`, otherwise `parsing` |

**Dates and times** arrive in several formats: `DD-MON-YY` (`10-SEP-26`), `MM/DD/YYYY` (`09/10/2026`), `MM/DD/YYYY HH24:MI:SS` (`09/10/2026 12:20:16`) and a separate time `hh:mm am|pm` (`03:00 pm`). Parse each column by the format §10 records for it.

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
- convert types — gateway dates and times come in several formats (§4); each column's format is in §10, and all are local time.

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
3. Success only if **both** `JHeader.ActionCode == 0` **and** row 0 `o_code === "0"` (real responses in §10).
   - `o_code` other than `"0"` → `AuthError(o_message)`. The gateway answers `"1"` / `"User does not exists"` for a wrong password and an unknown login alike, and that text is shown as it comes.
   - No `o_code` → `GatewayError('parsing')` (fail closed).
4. On success `o_message` is the profile's **VIP number**. Save session `{ version: 2, loginId, vipNumber, authenticatedAt }` and set status `signedIn`. `vipNumber` is kept for later codes that need `P_VIP_NUM`; it is never shown.

**Session storage**

| | Remember me ticked | Not ticked |
|---|---|---|
| iOS / Android | SecureStore (Keychain / Keystore) | Memory — ends with the process |
| Web | `localStorage` | `sessionStorage` — ends with the tab |

Storage failures fall back to memory. "Remember me" keeps the **session**, it never stores the password.

**Restore on launch.** `AuthContext` starts in `restoring`; the root layout renders nothing and holds the splash. A stored session is accepted only if it parses, is version 2, has a valid email and a string `vipNumber`, isn't dated in the future and is younger than `EXPO_PUBLIC_AUTH_SESSION_MAX_AGE_HOURS`. Otherwise it is wiped → `signedOut`. Sessions are never re-verified with the server.

**Routing.** `Stack.Protected guard={signedIn}` wraps `(app)`; `login`, `forgot-password` and `register` are guarded by `!signedIn`. Navigation follows the status — no manual redirects.

**Identify the user in later calls** by sending `P_LOGIN_ID: session.loginId` in `JData` (e.g. `PROF.S.LOAD_PROFILE`).

**Password recovery** (`forgot-password.tsx`): `PROF.S.PASSWORD` with `{ P_LOGIN_ID }` (normalised like login) via `usePostData`. The real answer is `o_code` / `o_message`: `"0"` / `Sendmail` when the password was mailed (§10). Anything but `"0"` → `AuthError(o_message)`; no `o_code` → `GatewayError('parsing')` (fail closed). On success the screen says the password was sent to the email.

**Change password** (`change-password.tsx`, form in `src/components/account/ChangePasswordForm.tsx`): `PROF.U.PASSWORD` with `{ P_LOGIN_ID: session.loginId, P_OLD_PASSWORD, P_NEW_PASSWORD }` via `usePostData`, sent with `retry: false`. The confirm field is checked on the client only — the contract has no parameter for it. A returned `o_code` other than `"0"` (e.g. a wrong old password) → `AuthError(o_message)`; no `o_code` → changed. The session holds no password, so the user stays signed in.

**Profile — Personal Info** (`profile.tsx`, state in `src/context/ProfileContext.tsx`, mapping in `src/services/profile.ts`; spec `reverse-engineer-implemented/guide/07-profile-personal-info.md`). `ProfileProvider` loads `PROF.S.LOAD_PROFILE` once per signed-in login and shares it through `useProfile()` — Home's welcome line and last-login subtitle and the Profile form read the same request. The row is read with `mapRowsByHeadings` over the headings in one `COLUMNS` map (`toProfileRow`), so a heading that stops coming shows the screen's load error rather than blank fields. The form pre-fills name, US callback phone, international callback phone and fax from the row (`first_name`, `last_name`, `phone_number_us` / `phone_ext_us`, `dial_code_intl` / `phone_number_intl` / `phone_ext_intl`, `fax_dial_code` / `fax_number`). **Today's pairing is shifted (§10): `first_name` holds the password and is shown as paired** until the gateway is fixed (tracker, backend issues). Update sends `PROF.U.PROFILE` via `updatePersonalInfo` with `retry: false`; the answer is read by its `o_code` / `o_message` headings — anything but `"0"` → `ProfileError(o_message)` shown in the form, no `o_code` heading or row → `GatewayError('parsing')`. `"0"` = saved is unverified (never sent). On success the profile is reloaded. **While `LOAD_PROFILE` has values past its last heading, every update is refused before it is sent** (`UPDATE_UNAVAILABLE`).

- **The update replaces the whole profile, so the app sends only what it knows and what changed.** `PROF.U.PROFILE` has no per-section variant. Every save (Personal Info, Preferences, Mailing Address) sends `P_LOGIN_ID`, then each parameter whose `LOAD_PROFILE` column came back, with its loaded value (pass-through columns are named like the parameter without `P_`: `P_CC_YEAR` → `cc_year`), then only the fields the customer changed on that screen. The mailing address is the exception: one changed field sends all 11 address parameters, since they have to agree. A parameter whose column `LOAD_PROFILE` did not return is **left out**, not sent as `''`, so a save never clears data the app was never shown. Today's `LOAD_PROFILE` returns no password, address, card, account-requirement or preference headings, so those parameters are omitted. Value codes follow the backend test client's `PROF.U.PROFILE` sample (`P_COUNTRY` `01`, `P_ADDRESS_TYPE` `HOME`). Confirm with the backend that the procedure keeps omitted parameters unchanged (or that `LOAD_PROFILE` will return them) before this reaches real data.
- **Update Mailing Address** (`mailing-address.tsx`, guide 08) shows "not available": no `LOAD_PROFILE` heading carries the address (its country code, state and city sit past the last heading), and `PROF.S.USER_PROFILE_ADDRESSES` is the frequent-pickup list, not the mailing address (§10). The form and validator stay in place for when a heading arrives.
- **Preferences** (`preferences.tsx`, guide 09) shows "not available" for the same reason: no `LOAD_PROFILE` heading carries the confirmation method or the special-offer flag (they arrive only past the last heading). A new booking therefore starts with "confirm by phone" unticked. Saving sends `P_CONFIRMATION_METHOD` (`ML` / `PHONE`) and `P_SPECIAL_OFFER` (`N` / `Y`) through `PROF.U.PROFILE`, refused like every profile update while `LOAD_PROFILE` has unheaded values. Each screen refuses with its own copy (`UPDATE_UNAVAILABLE`).
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
  `ACCOUNT_REQUIREMENTS` answers only `o_code` / `o_message` (§10). `accountHasRequirements` treats any further heading with a value that is not a "no" as yes, so with today's answer the account has no requirements and `_RS` is never called. `_RS` sends `o_code, o_message, placeholder_col1, placeholder_col2`. `accountRequirementLabels` reads each label from `o_message` alone, marked `TODO(schema-unverified)`, until an account with requirements confirms it.
- **Unconfirmed codes**, each set in one place in the service: `P_PAYMENT_TYPE` corporate = `CA` (only `CC` is documented) and `P_ADDRESS_TYPE` office = `O` (only `H` is documented).

On success the screen links back to login; the user is not signed in automatically.

**Logout** (`signOut`): clear stored session, set `signedOut`. Local only, no gateway call.

---

## 7a. Reservations

Wired on **Reservation 2** (`src/app/(app)/reserver-2.tsx`) and the ride screens; specs `reverse-engineer-implemented/guide/05`, `06`, `13`–`23` and `reverse-engineer-guide/24`. Every entry point opens `/reserver-2`.

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
| Home dashboard, History tab | `RES.S.ALL_ORDERS` | `P_LOGIN_ID`, `P_DATE_FROM` / `P_DATE_TO` (`MM-DD-YYYY`, as the backend test client sends them), `P_TOTAL_RECORDS` (number). Payment filter runs on the client — the contract has no parameter for it. Read by its own 10 headings (`toRides`); today no row has a date under `pickup_date`, so Home, History and Receipts show their empty states (§10). |
| Upcoming tab | `RES.S.UPDATABLE_ORDERS` | `P_LOGIN_ID`. Read by its own headings (`toUpdatableRides`), which have no voucher or feedback column; empty today for the same reason. |
| Express panel, address fields | `PROF.S.USER_ADDRESSES` (+ `USER_PROFILE_ADDRESSES`, and `CORPORATE_ADDRESSES` with an account) | Listed above the Google results as "Your places". The Express panel lists `USER_ADDRESSES` as its headings pair them (shifted, §10). Express sends nothing itself: it opens the booking form's Preview with a live ("ready now") draft, and zones both stops by street. |
| Step 1 | `PROF.S.LOAD_PROFILE` ✅, `PROF.S.PROFILE_WHO_GRANTED_ACCESS` | Names pre-fill from the profile; "Reservation for" shows only when someone granted access. |
| Step 2, stop picked | `RES.S.GOOGLE_ZONE_NUM` (has lat/lon/ZIP) or `RES.S.ZONE_THE_LOCATION` | Google stops are resolved with Place Details first. No match / no answer → the customer must acknowledge the address (guide 13). Airport stops ask for airline, flight # and pickup option. |
| Step 3 | `RES.S.BILLING_METHOD`, `RES.S.IS_CREDIT_CARD_SPECIFIC_ACCOUNT`, `RES.S.ACCOUNT_REQUIREMENTS_LIST` ×4, `PROF.S.IS_VALID_VIP` ✅, `PROF.S.ACCOUNT_VIP_NUM` | Account-keyed reads mount only with an account number. Continue → `RES.S.VERIFY_ACCOUNT_REQUIREMENTS` (`P_IS_RES 'Y'`), or for a card `RES.I.CREDIT_CARD_APPROVAL` then `RES.S.CREDIT_CARD_APPROVAL` every 10 s for up to 90 s. |
| Step 4 | `RES.S.VEHICLE_TYPE`, `PROF.S.PROFILE_COLUMN_VALUES_BY_TYPE` (8 e-mail, 6 cell) | First car type is the default. Passengers 1–4, stops 0–4. |
| Preview → Book / Save changes | `RES.I.RESERVATION` / `RES.U.RESERVATION` | Every contract parameter, `retry: false`, behind an in-flight lock. Then (needs a reservation number) the Email CC values via `RES.*RESERVATION_COLUMN_VALUE` and `RES.U.FORMAT_EMAIL_MESSAGE`, both best effort. |
| Details | `RES.S.LOAD_RESERVATION`, `PROF.S.CAR_INFO`, `RES.S.COMMUNICATION_LOG`, `RES.S.LOAD_RESERVATION_COLUMN_SINGLE_VALUE` | Edit / return trip / repeat reload the record and open the wizard. |
| Cancel (rides, details) | `RES.U.CANCEL_RESERVATION` | Reason required, ≤ 50 characters, `retry: false`. |
| Track your route | `RES.S.VEHICLE_LOG`, `RES.S.LATITUDE_LONGITUDE_FOR_CAR` | Position refreshes on demand only, as on the old site. |
| Voucher | `RES.S.LOAD_RESERVATION` | Drawn from the record — never the old internal image server. Shown once the record has a voucher #. |
| Receipts list / receipt | `RES.S.ALL_ORDERS`, `RES.S.LOAD_RESERVATION` | Completed rides; card shown as brand + last 4. Printed with `expo-print` (native) or a hidden frame (web). No invoice code exists yet. |
| Ask about this ride | `RES.S.ALL_PREDEFINED_QUESTIONS`, `RES.I.ASKED_QUESTIONS` | Message ≤ 200 characters. |

**Mapping notes**

- **Outputs are mostly undocumented.** Services not yet migrated still name, per field, every column the value may arrive under and take the first present; `recordSet` drops rows that carry only `o_code` / `o_message` or the stub's `placeholder_col*`. A refusal (`o_code` ≠ `"0"`) throws the service's own error; a write with no `o_code` fails closed. Migrated to one heading per field: `ALL_ORDERS`, `UPDATABLE_ORDERS` (`src/services/rides.ts`) and both zone codes (`toZoneState`: `o_code` `"0"` = match with the zone in `o_message`; anything else, including `ZONE_THE_LOCATION`'s empty answer and `GOOGLE_ZONE_NUM`'s `"1"`, goes to the acknowledgement).
- **No reservation number is ever made up.** `RES.I.RESERVATION` returns only `o_code` / `o_message` today, so the receipt says the ride is booked and links to Upcoming rides. The e-mail and Email CC writes need a number, so they run only once one is returned (and always on an edit).
- **Unconfirmed codes**, each set once in `src/services/reservation.ts`: `P_PU_TYPE` / `P_DO_TYPE` `S` / `A` / `L` (only `A` is in the samples); `P_PAYMENT_METHOD` `CA` / `AC` / `CC` (only `CC`); `P_RESERVATION_MAKE_FOR` `SELF` / `OTHER`; `P_CONFIRMATION_METHOD` `EMAIL` / `PHONE`; `P_CALL_SOURCE` `WEB`; `P_PU_DO_TYPE` `P` / `D`; Email CC column id `8` (the contact-type id).
- **Card data** stays in `ReservationContext` memory only — never stored, logged or shown unmasked — and is cleared after booking and on sign-out. An edit that keeps the card on file resends the masked number the record came with (the old site's "unchanged" convention); `RES.U.FORMAT_EMAIL_MESSAGE` gets a masked `P_CC_NUMBER1`. **The contract still posts full card numbers to the gateway**: tokenising them (00-README §5 #2) is a backend change.
- **Gateway gaps today:** `CAR_INFO` fails (`ORA-01001`), and `ZONE_THE_LOCATION` never zones a street (§10). `LOAD_RESERVATION` returns the same record for every number.
- **No action code** exists for airports, airlines, streets or landmarks (guide 05) or the fare estimate: stops come from Google Places, airline and flight are typed.
- **Google Places (legacy)** backs address search: `place/autocomplete/json` and `place/details/json` on iOS / Android (`src/services/googlePlaces.ts`), and the Maps JavaScript API's `AutocompleteService` / `PlacesService` on web (`googlePlaces.web.ts`), because the web service sends no CORS headers. The route preview uses **Directions** the same way (`directions/json` with `mode=driving&departure_time=now`, and `waypoints` for stops, on iOS / Android; `DirectionsService` on web — `src/services/googleDirections(.web).ts`). The booking form and Track your route show the route on an interactive map the customer can pinch, drag and zoom with + / − / fit buttons (`src/components/reservation/RouteMapView(.web).tsx`: react-native-maps on iOS / Android, a Maps JavaScript API map on web). Track your route turns the car's position into a street address with **Geocoding** (`geocode/json?latlng=…`, which allows browser calls, so one implementation — `src/services/geocoding.ts`). The key needs **Places API**, **Directions API**, **Geocoding API**, **Maps JavaScript API**, and **Maps SDK for Android / iOS** for native builds (`app.config.ts` passes it to react-native-maps); refusals show short copy to the customer and Google's reason in the dev console.

**Tests:** `e2e/reservation-2.spec.ts` drives every flow against the gateway and compares each request's JData keys with this contract. The card-authorisation case runs only with `E2E_CARD_TESTS=1`.

---

## 7b. Address book & contacts

Specs `reverse-engineer-implemented/guide/11`, `12` and `reverse-engineer-implemented/missing-screens/02`, `03`. Both screens render only what the gateway returns — the old seed lists are gone.

| Where | Action code | JData / notes |
|---|---|---|
| My Addresses list (`addresses.tsx`) | `PROF.S.USER_ADDRESSES` | The **same** request `SavedPlacesContext` makes for Home and the booking form; the context exposes it as `places` (booking suggestions) and `addresses` (editable entries, `toSavedAddresses` in `src/services/addressBook.ts`). |
| Add / edit / delete a location | `PROF.I.USER_ADDRESS`, `PROF.U.USER_ADDRESS`, `PROF.D.USER_ADDRESS` | Through `useSavedPlaces().saveAddress` / `deleteAddress`, `retry: false`, then the shared list reloads. `P_PICKUP_COUNT` = the row's `address_id`. Update and delete are refused while `USER_ADDRESSES` sends more values than headings (§10). The international number goes in `P_PHONE_NUM` as dial code + number (no dial-code parameter). `P_COUNTRY` is the code (`US`). |
| My Contacts list (`contacts.tsx`) | `PROF.S.PROFILE_COLUMN_VALUES` | `P_LOGIN_ID`. Rows mapped in `src/services/contacts.ts`; only the contact columns 3 home, 4 office, 5 fax, 6 cell, 8 e-mail are shown. |
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
2. **Inspect the real response first:** `npm run gateway:probe -- <CODE> '<JData JSON>'` (read codes only; a write needs an agreed test record and `--write`). Record its shape, whether the headings match, the column list and what each `o_code` means in §10, and its status in [XYZ Real Action Codes.md](XYZ%20Real%20Action%20Codes.md).
3. Add it to `ACTION_CODES` in [src/constants/actionCodes.ts](../src/constants/actionCodes.ts) with a one-line comment (`inputs → outputs`). Never hardcode the string.
4. Write a `…JData(…)` builder in the relevant `src/services/*.ts` with keys spelled exactly as the contract.
5. Pick the hook: write → `usePostData`, read → `useFetchData`. Shared across screens → put it in the context.
6. Map the rows to an app type in the service (rename, default, convert types) — by heading only if §10 says the headings match, otherwise by position. Interpret `o_code` as §10 records it for this code.
7. Render loading / error / empty / data; use `errorDisplay` for errors.
8. New env var? Add it to `src/config/gateway.ts` and `.env.example`.
9. Mark the code `— ✅ Implemented` in [XYZ Action Codes.md](XYZ%20Action%20Codes.md).
10. Run `npm run lint` and `npx tsc --noEmit`.

---

## 10. Actual responses by action code

What each code really returned from the live gateway on **2026-10-30**, probed with `npm run gateway:probe` and a test login. Samples are trimmed and sensitive values replaced with `<…>` — never commit real passwords, card numbers or test credentials. Codes not listed here have not been probed yet; their status is in [XYZ Real Action Codes.md](XYZ%20Real%20Action%20Codes.md).

"Shape" refers to §4: **A** = result values (headings match), **B** = record set. "Positions" marked *to confirm* are read from the values, not from a backend definition — confirm them with the backend before relying on them.

### PROF.S.CHECK_LOGIN_CREDENTIALS — ✅ migrated to real data

Shape **A**, headings match: `["o_code", "o_message"]`, one row of 2 values. `p_LOGIN_ID` / `P_LOGIN_ID` both work (keys are case-insensitive); the app sends the contract's `P_` spelling.

| Case | `JData` | Meaning |
|---|---|---|
| Correct login + password | `[["0", "<VIP number>"]]` | Accepted. `o_message` is the profile's **VIP number** (e.g. `9990000001`; `PROF.S.IS_VALID_VIP` with the account number and this value returns the customer's name). |
| Wrong password | `[["1", "User does not exists"]]` | Refused |
| Unknown login | `[["1", "User does not exists"]]` | Refused — same answer, so it does not reveal which logins exist |

App: `sessionFromLoginResponse` in `src/services/auth.ts` — `"0"` → session with `vipNumber`, anything else → `AuthError(o_message)`, no `o_code` → `parsing` (§7).

### Shape A codes (headings match)

| Code | Sample `JData` | Observed `o_code` meaning |
|---|---|---|
| `PROF.S.IS_UNIQUE_EMAIL` — ✅ migrated | `[["0", "Success"]]` new address / `[["1", "Duplicate"]]` login in use | `"0"` = free, `"1"` = taken |
| `PROF.S.IS_VALID_VIP` — ✅ migrated | `[["0", "LEE, JENNIFER"]]` / `[["1", "Invalid user information"]]` | `"0"` = valid, `o_message` = customer name `LAST, FIRST`; `"1"` = not on the account |
| `PROF.S.IS_VALID_COMPANY_NAME` — ✅ migrated | `[["0", "Success"]]` / `[["1", "Invalid"]]` | `"0"` = the name matches the account, `"1"` = it doesn't |
| `PROF.S.ACCOUNT_REQUIREMENTS` — ✅ migrated | `[["0", "Account ok. No requirements"]]` / `[["1", "Invalid account"]]` | `"0"` = usable (no requirements for the test account), `"1"` = unknown account; a requirement-bearing account not yet seen |
| `PROF.S.PASSWORD` — ✅ migrated | `[["0", "Sendmail"]]` for `j.lee@xyzcar.com` (one real e-mail sent, 2026-10-30) | `"0"` = password mailed; a refusal not yet seen |
| `PROF.S.ACCOUNT_VIP_NUM` | `[["<account>", "<VIP number>"]]` | No `o_code`: headings `["pAccountNum", "pVIPNum"]` |
| `RES.S.BILLING_METHOD` | `[["1", "Corporate Account"]]` | `o_code` is the **method**, not an error: `"1"` = Corporate Account |
| `RES.S.IS_CREDIT_CARD_SPECIFIC_ACCOUNT` | `[["0", "Corporate Account"]]` | `"0"` + account kind |
| `RES.S.GOOGLE_ZONE_NUM` | `[["1", "10001331"]]` (40.7484, -73.9857, 10001) / `[["1", "90000999"]]` (0, 0, 00000) | `"1"` with a zone number in `o_message` for both. Whether `90000999` means "outside the service area" is unconfirmed, so `"1"` alone doesn't prove a match. The app still treats only `"0"` as a match, which fails closed into the acknowledgement. |
| `RES.S.ZONE_THE_LOCATION` | `[["", ""]]` | Empty for **every** input tried on 2026-10-30: two of the test login's saved addresses (`275 20 ST, BROOKLYN, NY` and `180 EAST END AVE, MANHATTAN, NY`), the backend test client's own sample (`1 WADSWORTH AVE, MANHATTAN`, state `LC`), an airport (`JFK`) and a made-up street. No answer has been seen for a zoned street, so every saved-address stop (Express included) goes to the acknowledgement. |
| `RES.S.LATITUDE_LONGITUDE_FOR_CAR` | `[["5", "No Data Found", "", ""]]` | Headings `o_code, o_message, o_Latitude, o_Longitude`; `"5"` = no position |

Record sets whose headings also match (17 values, same layout as each other), both ✅ migrated: `PROF.S.USER_PROFILE_ADDRESSES` and `PROF.S.CORPORATE_ADDRESSES` — headings `oCountry, oState, oCity, oStreetNum, oStreetName, oCrossStreet, oPickupPoint, oZip, oDirections, oPhoneNum, oExt, oPhoneNumUS, oExtUS, oePickupCount, oeRowID, oeUsageFrequency, oeLastServiceDate`. `oCountry` is a code (`"01"` = US), `oeLastServiceDate` is `DD-MON-YY`. Both are read by these headings (`addressRecordSuggestions` in `src/services/savedPlaces.ts`); no heading carries a dial code or coordinates.

- `USER_PROFILE_ADDRESSES` for the test login: **17 rows**, `oePickupCount` 1…17, each with a usage frequency. That's the profile's frequent-pickup list (guide 06's "frequent addresses"), not a single mailing address. The backend test client doesn't describe it otherwise, so it isn't used for Update Mailing Address. Unknown login: `JHeader.ActionCode "1"`, `ORA-01001: invalid cursor`.
- `CORPORATE_ADDRESSES` for the test account: 2 rows. Unknown account (`00000`): headings with **0 rows**.

### Codes with more values than headings

Each is mapped by heading (§4): heading *n* pairs with value *n*, and the values past the last heading are ignored. Where the pairing is plainly wrong, the screen shows that wrong value until the gateway is fixed.

| Code | Headings sent | Values per row | What heading pairing gives today |
|---|---|---|---|
| `PROF.S.LOAD_PROFILE` — ✅ migrated | 15: `login_id, first_name, last_name, email, phone_number_us, phone_ext_us, dial_code_intl, phone_number_intl, phone_ext_intl, fax_dial_code, fax_number, fax_ext, account_number, company_name, last_login` | **44** | `login_id` = the login id; `first_name` = **the password**; `last_name` = the first name; `email` = the last name; the phone, fax and account headings pair with phone fragments, a country code, a state and a city; `last_login` is empty. The 29 extra values (which include the full card number, the VIP number, the mailing address's country code / state / city, single-letter flags that look like the preferences (`Y`, `N`, `N`) and dates in `DD-MON-YY`) are ignored. No preference or mailing-address headings, so the Preferences and Update Mailing Address screens show "not available". Profile updates are refused. Unknown login: one row `["X"]` (1 value), which pairs as a blank profile. Read with `mapRowsByHeadings` (`PROFILE_HEADINGS` in `src/services/profile.ts`), so a heading that stops coming fails the load. `last_login` has never carried a value; the app reads `MM/DD/YYYY hh:mm[:ss] AM\|PM` (guide 06 shows `10/15/2026 6:45:35 AM`). |
| `PROF.S.USER_ADDRESSES` — ✅ migrated | 16: `address_id, country, state, city, zip_code, building_num, street_name, cross_street, pickup_point, phone_number_us, phone_ext_us, dial_code_intl, phone_number_intl, phone_ext_intl, directions, driver_notes` | **17** | `address_id` = `"01"` on every row, then each heading pairs with the value meant for the next one (`country` = the state, `city` = the ZIP, `street_name` = the cross street…). List keys use the row position, because `address_id` isn't unique. Update and delete are refused; adding a location still works. 20 rows for the test login. Unknown login: one row `["X"]`, which has no street or city and is dropped, so the list is empty. |
| `RES.S.ALL_ORDERS` — ✅ migrated | 10: `reservation_num, passenger_name, pickup_date, pickup_time, pickup_location, destination, status, payment_method, voucher_num, feedback_left` | **112** | `reservation_num` = the login id; `passenger_name` = the reservation number (`W…`); `pickup_date` = a first name (`TEST_FIRST_NAME`); `pickup_time` = a last name; `pickup_location` = the date as `DD-MON-YY`; `destination` = the date as `MM/DD/YYYY`; `status` = the time (`10:30 am`); `payment_method` = `"1"`; `voucher_num` = a country code (`01`); `feedback_left` = a state. Because `pickup_date` never holds a date, **no row can be listed**: Home's tiles count 0 and History, Receipts and Home show their empty states. 15 rows for the test login with `MM/DD/YYYY` and with the test client's `MM-DD-YYYY` dates alike; the app sends the test client's format. `P_TOTAL_RECORDS` isn't honoured (the test client doesn't send it; the contract does, so the app keeps it). Unknown login: one row `["X"]`, which can't be listed. Invalid JSON (receipt-image path), repaired by `parseBody`. Read with `mapRowsByHeadings` (`ALL_ORDERS_HEADINGS` in `src/services/rides.ts`). |
| `RES.S.UPDATABLE_ORDERS` — ✅ migrated | 10: `reservation_num, passenger_name, pickup_date, pickup_time, pickup_location, destination, status, payment_method, car_type, number_of_passengers` (the last two differ from `ALL_ORDERS`) | **112** | The same shift as `ALL_ORDERS`, so no row can be listed and the Upcoming tab is empty. 4 rows for the test login; unknown login: `["X"]`. Has no voucher or feedback heading, so those stay empty. Read with `mapRowsByHeadings` (`UPDATABLE_ORDERS_HEADINGS`). |
| `RES.S.LOAD_RESERVATION` | 39 | **160** | Not yet reviewed. Invalid JSON, repaired. |
| `RES.S.VEHICLE_TYPE` | 5: `car_type, car_type_name, max_passengers, max_luggage, description` | **2** | `car_type` and `car_type_name` pair correctly (`"3"` / `Sedan`); the other three headings have no value (`''`). |
| `RES.S.ALL_PREDEFINED_QUESTIONS` | 4: `o_code, o_message, placeholder_col1, placeholder_col2` | **2** | `o_code` = the question id, `o_message` = the question text. |
| `PROF.S.ACCOUNT_REQUIREMENTS_RS`, `RES.S.ACCOUNT_REQUIREMENTS_LIST` | 4: `o_code, o_message, placeholder_col1, placeholder_col2` | **1** | `o_code` = `"X"` for every account tried (the test account, an unknown number, an e-mail). No account with requirements known yet. |
| `RES.S.COMMUNICATION_LOG`, `RES.S.VEHICLE_LOG` | 4 | — | No rows for the reservation tried. |

### Profile codes renamed to the backend's names

The app first sent `PROF.S.LOAD_PROFILE_WHO_GRANTED_ACCESS`, `PROF.S.LOAD_PROFILE_COLUMN_VALUES` and `PROF.S.LOAD_PROFILE_COLUMN_VALUES_BY_TYPE`, which answered "Action code is not supported". The backend's test client (postman.eliteny.com, XYZCar Profile Module) names them without `LOAD_`. Under those names they answer with real headings, each read by heading:

| Code | Headings | Read in |
|---|---|---|
| `PROF.S.PROFILE_WHO_GRANTED_ACCESS` — ✅ migrated | `oLoginID, oFirstName, oLastName, oPhoneNumberUS, oPhoneExtUS, oAccountNum, oVIPNum` | `toGrantors`, `useReservationLookups.ts` |
| `PROF.S.PROFILE_COLUMN_VALUES` — ✅ migrated | `oColumnId, oColumnValue` | `toContacts`, `src/services/contacts.ts` |
| `PROF.S.PROFILE_COLUMN_VALUES_BY_TYPE` — ✅ migrated | `oColumnId, oColumnValue` | `toContactValues`, `useReservationLookups.ts` |

The test login has no rows in any of the three yet. Re-probed 2026-10-30 while looking for a preferences source: `PROFILE_COLUMN_VALUES` still answers 0 rows, while `PROFILE_COLUMN_VALUES_BY_TYPE` answers one row `["2", "0"]` for `P_COLUMN_ID` 2 and 0 rows for ids 1 and 3–12. What column 2 holds isn't documented, so nothing reads it.

### Searching for a preferences source (2026-10-30)

No action code in either backend test client (Profile and Reservation modules) is named for preferences, confirmation method or special offers. The read codes that could hold them under another name were probed:

| Code | `JData` | Answer |
|---|---|---|
| `PROF.S.PROFILE_COLUMN_VALUES` / `_BY_TYPE` | `P_LOGIN_ID` (+ `P_COLUMN_ID` 1–12) | See above: no preference rows. |
| `PROF.S.MATCHING_PROFILE_LIST` (not wired) | `P_LOGIN_ID` | Headings `oLoginID, oFirstName, oLastName, oPhoneNumberUS, oPhoneExtUS, oAccountNum, oVIPNum` (7 = 7); 15 rows of **other customers' profiles**, no preference columns. |
| `PROF.S.ACCESS_RIGHTS_GRANTED_PROFILE` (not wired) | `P_LOGIN_ID_FROM` (`P_LOGIN_ID` alone → `"1"` / `ORA-20001: Mandatory data key "p_LOGIN_ID_FROM" is missing`, invalid JSON) | Same 7 headings, 0 rows. |

So `PROF.S.LOAD_PROFILE` remains the only candidate, and its preference values have no heading (§10 above). The test client pages answered HTTP 500 (`Cannot find module './682.js'`) on 2026-10-30 afternoon; the code lists used are the ones read from them earlier that day.

### PROF.I.PROFILE — create

One real corporate registration was sent through the app on 2026-10-30. It used a fresh e-mail, the test account, a matching company name, a Home address, e-mail confirmation and no car preferences, with the value codes from the backend test client (`P_COUNTRY` `01`, `P_ADDRESS_TYPE` `HOME`, `P_PAYMENT_TYPE` `1`, `P_CONFIRMATION_METHOD` `ML`).

| `o_code` | `o_message` |
|---|---|
| `"9"` | `INTERNAL ERROR : … ORA-12899: value too large for column "OPTIMA"."T_VIP_PROFILE"."PREFERRED_KNOCKOFF_CODE" (actual: 2, maximum: 1) ORA-01403: no data found` |

- **No profile was created:** `IS_UNIQUE_EMAIL` still answers `Success` for that e-mail.
- **Which value is too long isn't known.** The 2-character values sent were `P_COUNTRY` `01`, `P_STATE` `NY` and `P_CONFIRMATION_METHOD` `ML`. The column is a preference, so `P_CONFIRMATION_METHOD` is the likely one, but the backend must say which parameter fills `PREFERRED_KNOCKOFF_CODE` and which 1-character codes it takes.
- **The app showed "Something went wrong":** the body's message has unescaped quotes, so it isn't valid JSON and its `o_code` can't be read.
- The create is sent with `retry: false`.

### PROF.U.PROFILE — update (not probed)

Never sent: it writes the whole profile, and the app refuses it while `LOAD_PROFILE` has values past its last heading (§4). So no `o_code` answer has been seen. The app treats `"0"` as saved and anything else as refused (`TODO(schema-unverified)` in `assertProfileUpdated`). A missing `o_code` fails closed.

The backend test client's sample (XYZCar Profile Module, "Dynamic SQL test 7") sends the same 37 parameters as the contract. It uses these value codes: `P_COUNTRY` `01`, `P_ADDRESS_TYPE` `HOME`, `P_PAYMENT_TYPE` `1`, `P_CONFIRMATION_METHOD` `''`, `P_SPECIAL_OFFER` / `P_SMOKING_CAR` / `P_CAR_PHONE` `N`, and `P_CAR_YEAR` `90`. `P_CROSS_STREET1` and `P_CROSS_STREET2` are **two cross streets** (`BROADWAY`, `8TH AVE`). The app puts Apt # / Mail stop in `P_CROSS_STREET2` because no apartment parameter exists, which needs the backend's answer.

### Codes that fail on the gateway

| Code | Answer |
|---|---|
| `PROF.S.CAR_INFO` | `"1"` `ORA-01001: invalid cursor` |
| `RES.S.LOAD_RESERVATION_COLUMN_SINGLE_VALUE` | `"9"` `ORA-01400: cannot insert NULL into …RESERVATION_COLUMN_VALUES…` — a select code that tries an INSERT; invalid JSON (unescaped quotes) |
