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
| Inspect a code's real response | [scripts/probe-action-code.mjs](../scripts/probe-action-code.mjs) — `npm run gateway:probe -- <CODE> '<JData JSON>'`; add `--summary [--show=h1,h2] [--rows]` to see the shape without the raw body (card and password columns print as their format only) and `--vars=e2e/e2e.local.env` to fill `${E2E_…}` in the JData |

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

**Mapping rule** (applies to every action code):

1. Each row carries one value per heading, in heading order (every migrated code re-probed on 2026-11-03, §10). `mapRows` pairs them. A caller that reads named headings uses `mapRowsByHeadings(response, headings)`, which fails closed when one of them is missing from the response.
2. Read each value by the heading name the code actually sends, as recorded in §10. Don't invent field names.
3. Keep the screen as it is. A field the screen shows that the response has no value for (no such heading, or an empty value) shows `COMMON_MESSAGES.NOT_AVAILABLE`.

A heading whose value is plainly wrong for its name is a gateway bug: record it in §10 and the tracker's backend issues.

- **Single record** (login, profile): use row 0.
- **List** (addresses, orders): use every row. The row count is whatever the procedure returns — `P_TOTAL_RECORDS` is not honoured today.

**Two levels of success.** `JHeader.ActionCode == 0` only means the gateway executed the procedure. The procedure's own verdict, where it returns one, is `o_code` / `o_message` in row 0 — but **their meaning is per code**, not a fixed rule:

- Login: `o_code "0"` = accepted, and `o_message` then carries **data** (the VIP number); `"1"` = refused, `o_message` = the reason.
- `RES.S.GOOGLE_ZONE_NUM` answers `o_code "1"` with the zone number in `o_message`; `RES.S.BILLING_METHOD`'s `o_code` is the account type (`"1"` Corporate Account, `"2"` Credit Card With Corporate Account); `RES.S.LATITUDE_LONGITUDE_FOR_CAR` answers `"5"` = "No Data Found"; `RES.S.ZONE_THE_LOCATION` can answer an empty `o_code`.
- `RES.I.RESERVATION` and `RES.I.CREDIT_CARD_APPROVAL` answer `"0"` with **data** in `o_message` (the reservation / request number), as `RES.S.CREDIT_CARD_APPROVAL` does with the approval number.
- A record set with nothing for the inputs answers a single `dummy` heading (`"X"`); `readRecords` reads it as no rows.

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
- rename raw columns (`ofirstname`) to app names (`firstName`);
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

**Change password** (`change-password.tsx`, form in `src/components/account/ChangePasswordForm.tsx`): `PROF.U.PASSWORD` with `{ P_LOGIN_ID: session.loginId, P_OLD_PASSWORD, P_NEW_PASSWORD }` via `usePostData`, sent with `retry: false`. The confirm field is checked on the client only — the contract has no parameter for it. `"0"` (`Changed`) = changed; `"1"` (`Invalid info`, a wrong old password) or any other code → `AuthError(o_message)`; no `o_code` / `o_message` → `GatewayError('parsing')` (§10). The session holds no password, so the user stays signed in.

**Profile — Personal Info** (`profile.tsx`, state in `src/context/ProfileContext.tsx`, mapping in `src/services/profile.ts`; spec `reverse-engineer-implemented/guide/07-profile-personal-info.md`). `ProfileProvider` loads `PROF.S.LOAD_PROFILE` once per signed-in login and shares it through `useProfile()` — Home's welcome line and last-login subtitle and the Profile form read the same request. The row is read with `mapRowsByHeadings` over the headings in one `COLUMNS` map (`toProfileRow`), so a heading that stops coming shows the screen's load error rather than blank fields. The form pre-fills name, US callback phone, international callback phone and fax from the row (`ofirstname`, `olastname`, `ophonenumberus` / `ophoneextus`, `ophonenumber` / `ophoneext`, `ofax`). The international and fax numbers arrive as `<calling code>-<number>` and are split on the first `-` (`TODO(schema-unverified)`); `212-` (code only) reads as no number. There is no fax-extension heading. Home's welcome line is `ofirstname`; its last-login line is `oelastlogindate` (`DD-MON-YY`, a date only), shown as "Last login {date}". `opassword`, `ocardnumber` and `overifycode` are never read. Update sends `PROF.U.PROFILE` via `updatePersonalInfo` with `retry: false`; the answer is read by its `o_code` / `o_message` headings — anything but `"0"` → `ProfileError(o_message)` shown in the form, no `o_code` heading or row → `GatewayError('parsing')`. `"0"` = saved is unverified (never sent). On success the profile is reloaded.

- **The update replaces the whole profile, and needs every parameter.** `PROF.U.PROFILE` has no per-section variant, and a save that leaves parameters out fails (`"9"`, `ORA-01843: not a valid month`; §10). So every save (Personal Info, Preferences, Mailing Address) sends `P_LOGIN_ID` and all 37 other contract parameters with the values `LOAD_PROFILE` returned, exactly as stored (`UPDATE_PARAMETER_HEADINGS` in `src/services/profile.ts`, password and card values included, never shown), with only the fields the customer changed on that screen replaced. One changed address field sends all 11 address parameters, since they have to agree. `"0"` (`Success`) = saved; `"9"` shows the screen's own refusal copy instead of the Oracle text.
- **Update Mailing Address** (`mailing-address.tsx`, guide 08) reads `ocountry` (`01` → United States), `ostate`, `ocity`, `ozip`, `obuildingnum`, `ostreetname`, `ocrossstreet1`, `ocrossstreet2` (Apt / Mail stop), `oaddressphoneus`, `oaddressphone` (`<code>-<number>`) and `oaddresstype` (`HOME` / `O`; empty keeps the form's Office default). When every address value is empty it shows "not available". `PROF.S.USER_PROFILE_ADDRESSES` is the frequent-pickup list, not the mailing address (§10).
- **Preferences** (`preferences.tsx`, guide 09) reads `oconfirmationmethod` (`PHONE` ticks "Phone") and `ospecialoffer` (`Y` ticks the offers). When both are empty it shows "not available" and a new booking starts with "confirm by phone" unticked. Saving sends `P_CONFIRMATION_METHOD` (`ML` / `PHONE`) and `P_SPECIAL_OFFER` (`N` / `Y`) through `PROF.U.PROFILE`.
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
  `ACCOUNT_REQUIREMENTS` answers only `o_code` / `o_message` (§10). `accountHasRequirements` treats any further heading with a value that is not a "no" as yes, so with today's answer the account has no requirements and `_RS` is never called. `ACCOUNT_REQUIREMENTS` `"0"` / `Account ok. No requirements` means none. `_RS` answers a single `dummy` heading (`"X"`) for an account with none, which `accountRequirementLabels` reads as no fields. Its label for a real requirement is read from `o_message` alone, marked `TODO(schema-unverified)`, until an account with requirements confirms it. `"9"` refusals show the step's own copy, never the Oracle text.
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
| Row readers, all by exact heading: `readRecords` (a record set; `dummy` alone = no rows), `readResult` / `assertResultCode` (`o_code` / `o_message`), `refusalMessage` (`"9"` → the screen's own copy) | `src/services/gatewayRows.ts` |
| Step lookups / open-for-edit | `src/hooks/useReservationLookups.ts`, `src/hooks/useReservationActions.ts` |

| Where | Action code | JData / notes |
|---|---|---|
| Home dashboard, History tab | `RES.S.ALL_ORDERS` | `P_LOGIN_ID`, `P_DATE_FROM` / `P_DATE_TO` (`MM-DD-YYYY`, as the backend test client sends them), `P_TOTAL_RECORDS` (number). Payment filter runs on the client — the contract has no parameter for it. Read by heading (`ORDER_HEADINGS`, `toRides`): ride number `oreservationnumber`; passenger `ofirstname` + `olastname`; pickup `oreservationdate` + `oreservationtime`; pickup / destination from the `opu*` / `odo*` street, city, state, airport and landmark headings; status from `oecallstatusdesc` (Canceled → canceled) and `oecurrentstatusdesc` (UnLoaded → completed, any other word → in progress, empty → confirmed); payment `opaymentmethod` (`1` = corporate account, other codes "not available"). Modify, Cancel, the voucher link and the receipt follow `oecanupdate`, `oecancancel`, `oecanprintvoucher` and `oeinvoiceposted` (`Y`). No heading carries a voucher number or whether feedback was left. |
| Upcoming tab | `RES.S.UPDATABLE_ORDERS` | `P_LOGIN_ID`. The same headings and mapping as `ALL_ORDERS` (`toUpdatableRides`). |
| Express panel, address fields | `PROF.S.USER_ADDRESSES` (+ `USER_PROFILE_ADDRESSES`, and `CORPORATE_ADDRESSES` with an account) | Listed above the Google results as "Your places". All three are read by the same 17 headings (`ocountry` … `oepickupcount`, §10). Express sends nothing itself: it opens the booking form's Preview with a live ("ready now") draft, and zones both stops by street. |
| Step 1 | `PROF.S.LOAD_PROFILE` ✅, `PROF.S.PROFILE_WHO_GRANTED_ACCESS` | Names pre-fill from the profile; "Reservation for" shows only when someone granted access. |
| Step 2, stop picked | `RES.S.GOOGLE_ZONE_NUM` (has lat/lon/ZIP) or `RES.S.ZONE_THE_LOCATION` | Google stops are resolved with Place Details first. No match / no answer → the customer must acknowledge the address (guide 13). Airport stops ask for airline, flight # and pickup option. |
| Step 3 | `RES.S.BILLING_METHOD`, `RES.S.IS_CREDIT_CARD_SPECIFIC_ACCOUNT`, `RES.S.ACCOUNT_REQUIREMENTS_LIST` ×4, `PROF.S.IS_VALID_VIP` ✅, `PROF.S.ACCOUNT_VIP_NUM` | Account-keyed reads mount only with an account number. `BILLING_METHOD`'s `o_code` is the account type (`1` → corporate or card, `2` → corporate + card or card, `3` → card); `IS_CREDIT_CARD_SPECIFIC_ACCOUNT` `"1"` narrows that to the card methods; any other code, or an answer that can't be read, shows the account refusal and blocks Continue. Each requirement is a select of its rows' `description`, sending `value`. Continue → `RES.S.VERIFY_ACCOUNT_REQUIREMENTS` (`P_IS_RES 'Y'`, `"0"` = accepted), or for a card `RES.I.CREDIT_CARD_APPROVAL` (`"0"` + request number) then `RES.S.CREDIT_CARD_APPROVAL` every 10 s for up to 90 s (`"0"` + approval number; anything else keeps waiting). |
| Step 4 | `RES.S.VEHICLE_TYPE`, `PROF.S.PROFILE_COLUMN_VALUES_BY_TYPE` (8 e-mail, 6 cell) | Tiles from `oevehiclecode` / `oevehicledesc`; the first (`0` No Preference) is the default. `K` must be booked by phone (guide 17). No seat count is sent, so there is no capacity check. Passengers 1–4, stops 0–4. |
| Preview → Book / Save changes | `RES.I.RESERVATION` / `RES.U.RESERVATION` | Every contract parameter, `retry: false`, behind an in-flight lock. `"0"` = saved, with the new number in `o_message`. Then (needs a reservation number) the Email CC values via `RES.*RESERVATION_COLUMN_VALUE` and `RES.U.FORMAT_EMAIL_MESSAGE`, both best effort. |
| Details | `RES.S.LOAD_RESERVATION`, `PROF.S.CAR_INFO`, `RES.S.COMMUNICATION_LOG`, `RES.S.LOAD_RESERVATION_COLUMN_SINGLE_VALUE`, `RES.S.VEHICLE_TYPE` | Read by `RESERVATION_HEADINGS` (`toReservationRecord`); an empty field shows "Not available". The car type is shown by its `VEHICLE_TYPE` name. The messages card lists the questions asked about the ride (`COMMUNICATION_LOG`). Edit / return trip / repeat reload the record and open the wizard. |
| Cancel (rides, details) | `RES.U.CANCEL_RESERVATION` | Reason required, ≤ 50 characters, `retry: false`. |
| Track your route | `RES.S.VEHICLE_LOG`, `RES.S.LATITUDE_LONGITUDE_FOR_CAR` | Timeline from `oetrackingdate` / `oetrackingtime` / `oestatusdesc`, trail from `oelatitude` / `oelongitude`. The car's position is `o_latitude` / `o_longitude` on `"0"`; `"5"` (No Data Found) shows "position unknown". Position refreshes on demand only, as on the old site. |
| Voucher | `RES.S.LOAD_RESERVATION` | Drawn from the record — never the old internal image server. Shown once the record has a voucher #. |
| Receipts list / receipt | `RES.S.ALL_ORDERS`, `RES.S.LOAD_RESERVATION` | Rides whose invoice is posted (`oeinvoiceposted` `Y`); the charges are then the `idd*` set with its total and `iddinvoicenum`, otherwise the `cc*` set. Card shown as brand + last 4. Printed with `expo-print` (native) or a hidden frame (web). |
| Ask about this ride | `RES.S.ALL_PREDEFINED_QUESTIONS`, `RES.I.ASKED_QUESTIONS` | Questions from `question_id` / `question`; none → the empty state (no local list). Message ≤ 200 characters. |

**Mapping notes**

- **One heading per field.** Every RES code is read by the headings §10 records, with `readRecords` / `readResult` (`mapRowsByHeadings` underneath: a heading that stops coming fails closed). No fallback names, no case folding. A refusal throws the service's own error; `"9"` shows the screen's copy, never the Oracle text.
- **No reservation number is ever made up.** `RES.I.RESERVATION` answers it in `o_message`; when that is empty the receipt links to Upcoming rides. The e-mail and Email CC writes need a number, so they run only once one is returned (and always on an edit).
- **Value codes**, each set once in `src/services/reservation.ts` (decoded from stored rides and the backend test client, §10): `P_PU_TYPE` / `P_DO_TYPE` `1` street, `2` airport, `3` landmark; `P_PAYMENT_METHOD` `1` corporate, `2` corporate + card, `3` card (`2` / `3` unconfirmed); `P_CONFIRMATION_METHOD` `ML` e-mail, `SND` phone (unconfirmed); `P_CALL_SOURCE` `W`; `P_RESERVATION_MAKE_FOR` `1` self, `2` someone else (unconfirmed); `P_PU_ADDRESS_ADD` / `P_DO_ADDRESS_ADD` `N`; `P_PU_COUNTRY` / `P_DO_COUNTRY` `US` (a saved address's stored `01` is sent as `US`, as the test client does); `P_RESERVATION_TIME` `hh:mm AM|PM`; `P_EXPIRATION_DATE` `MM-YYYY` (unconfirmed). Email CC column id `8`, which the gateway **rejects** (ORA-02291, §10).
- **Card data** stays in `ReservationContext` memory only — never stored, logged or shown unmasked — and is cleared after booking and on sign-out. An edit that keeps the card on file resends the masked number the record came with (the old site's "unchanged" convention); `RES.U.FORMAT_EMAIL_MESSAGE` gets a masked `P_CC_NUMBER1`. **The contract still posts full card numbers to the gateway**: tokenising them (00-README §5 #2) is a backend change.
- **Gateway gaps today:**
  - **Database issue:** `RES.I.RESERVATION` answers `"0"` (created) with a number, but the ride isn't listed, loaded, updated or cancelled afterwards (§10). The app takes `"0"` as booked and shows the number.
  - `RES.I.RESERVATION` answers `"5"` when a matching booking already exists, with that booking's number in `o_message`; nothing new is created. The app shows "Already booked" with that number and a "View your reservation" button (`DuplicateReservationError`, `assertReservationSaved`). The contract has no "book it anyway" parameter, so the old site's override isn't offered.
  - A booking without a ride purpose fails with ORA-01400, so Trip purpose is required on the Preferences step (`checkPreferences`).
  - `ZONE_THE_LOCATION` never zones a street.
  - `LOAD_RESERVATION` sends no cancel reason, no originate time and no seat count; it returns other customers' records by number.
  - `CAR_INFO` answers by car number (`driver_1st, color, make, model, model_year`), keyed by the record's `oecarnum`.
- **No action code** exists for airports, airlines, streets or landmarks (guide 05) or the fare estimate: stops come from Google Places, airline and flight are typed.
- **Google Places (legacy)** backs address search: `place/autocomplete/json` and `place/details/json` on iOS / Android (`src/services/googlePlaces.ts`), and the Maps JavaScript API's `AutocompleteService` / `PlacesService` on web (`googlePlaces.web.ts`), because the web service sends no CORS headers. The route preview uses **Directions** the same way (`directions/json` with `mode=driving&departure_time=now`, and `waypoints` for stops, on iOS / Android; `DirectionsService` on web — `src/services/googleDirections(.web).ts`). The booking form and Track your route show the route on an interactive map the customer can pinch, drag and zoom with + / − / fit buttons (`src/components/reservation/RouteMapView(.web).tsx`: react-native-maps on iOS / Android, a Maps JavaScript API map on web). Track your route turns the car's position into a street address with **Geocoding** (`geocode/json?latlng=…`, which allows browser calls, so one implementation — `src/services/geocoding.ts`). The key needs **Places API**, **Directions API**, **Geocoding API**, **Maps JavaScript API**, and **Maps SDK for Android / iOS** for native builds (`app.config.ts` passes it to react-native-maps); refusals show short copy to the customer and Google's reason in the dev console.

**Tests:** `e2e/reservation-2.spec.ts` drives every flow against the gateway and compares each request's JData keys with this contract. Writes (book, update, cancel, e-mail, card) are built and checked but aborted in the browser unless `E2E_ALLOW_WRITES=1` (`blockGatewayWrites`, `e2e/support/gateway.ts`). The card-authorisation case runs only with `E2E_CARD_TESTS=1`.

---

## 7b. Address book & contacts

Specs `reverse-engineer-implemented/guide/11`, `12` and `reverse-engineer-implemented/missing-screens/02`, `03`. Both screens render only what the gateway returns — the old seed lists are gone.

| Where | Action code | JData / notes |
|---|---|---|
| My Addresses list (`addresses.tsx`) | `PROF.S.USER_ADDRESSES` | The **same** request `SavedPlacesContext` makes for Home and the booking form; the context exposes it as `places` (booking suggestions) and `addresses` (editable entries, `toSavedAddresses` in `src/services/addressBook.ts`). |
| Add / edit / delete a location | `PROF.I.USER_ADDRESS`, `PROF.U.USER_ADDRESS`, `PROF.D.USER_ADDRESS` | Through `useSavedPlaces().saveAddress` / `deleteAddress`, `retry: false`, then the shared list reloads. `P_PICKUP_COUNT` = the row's `oepickupcount` (`TODO(schema-unverified)`: whether update / delete take it, or `oerowid`, is to confirm). The international number arrives as `ophonenum` = `<code>-<number>` and goes back in `P_PHONE_NUM` as dial code + number (no dial-code parameter). `P_COUNTRY` is the code (`US`). |
| My Contacts list (`contacts.tsx`) | `PROF.S.PROFILE_COLUMN_VALUES` | `P_LOGIN_ID`. Rows mapped in `src/services/contacts.ts`; only the contact columns 3 home, 4 office, 5 fax, 6 cell, 8 e-mail are shown. |
| Add / edit / remove a contact | `PROF.I.PROFILE_COLUMN_VALUE`, `PROF.U.PROFILE_COLUMN_VALUE`, `PROF.D.PROFILE_COLUMN_VALUE` | A contact is identified by column id + stored value. Changing a contact's **type** adds it under the new column, then deletes the old one (the contract has no move). Answers (§10): `"0"` = done, `"2"` = `Record does not Exist…`, shown as sent. **Add answers `"0"` / `Success` but stores nothing** (backend issue), so a new contact doesn't appear after the reload. |

- **Validation** follows the old site (guide 11 §3, 12 §3, 26): a location needs country, state, city, building # (digits ≤ 6), street (4–30 street characters) and one callback number; ZIP is exactly 5 digits; pickup point ≤ 20; directions ≤ 500 without `"`. A contact phone is 10 digits not starting with 0/1; an e-mail ≤ 50; only an office phone takes an extension (≤ 5 digits).
- **Unconfirmed**, each set in one place: office extension stored as `<number>-<ext>` (`toStoredValue` in `src/utils/contacts.ts`, the old `CompleteContactNumber` form); contact load columns `ocolumnid` / `ocolumnvalue` (one name each, §10).
- **Real gateway:** one `PROF.I.USER_ADDRESS` sent from the app with `P_STATE` `New york` answered `"9"` / `ORA-12899 … "T_VIP_PICKUP"."STATE" (actual: 8, maximum: 2)` (invalid JSON, so the app showed its generic error). The state column takes the 2-letter code only, so the form now requires 2 letters and sends them uppercased (`P_STATE` `NY`). Update and delete have not been sent; `P_COUNTRY` goes out as the ISO code (`US`) while stored rows hold `01`, which is unconfirmed. The contacts codes answer as in §10.

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

What each code really returned from the live gateway on **2026-10-30**, with every migrated read code re-probed on **2026-11-03** (headings renamed, one value per heading), probed with `npm run gateway:probe` and a test login. Samples are trimmed and sensitive values replaced with `<…>` — never commit real passwords, card numbers or test credentials. Codes not listed here have not been probed yet; their status is in [XYZ Real Action Codes.md](XYZ%20Real%20Action%20Codes.md).

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
| `PROF.S.ACCOUNT_VIP_NUM` | `[["<account>", "<VIP number>"]]` | No `o_code`: headings `["paccountnum", "pvipnum"]` (were `pAccountNum`, `pVIPNum` until 2026-11-03) |
| `RES.S.BILLING_METHOD` — ✅ migrated | `[["1", "Corporate Account"]]` (`99005`, `29311`) / `[["2", "Credit Card With Corporate Account"]]` (`24600`) / `[["5", "Invalid Account Number."]]` | `o_code` is the old site's **`acctype`** (guide 16), not a verdict: `"1"` account (no account + card), `"2"` account + card (no plain account), `"3"` card only (not seen). `"5"` (and any other code) is a refusal. Re-probed 2026-11-03. |
| `RES.S.IS_CREDIT_CARD_SPECIFIC_ACCOUNT` — ✅ migrated | `[["0", "Corporate Account"]]` (`99005`, `29311`) / `[["1", "Credit Card Specific"]]` (`24600`) / `[["5", "Invalid Account Number."]]` | `"0"` = not card-specific, `"1"` = card-specific (only the card methods), anything else a refusal. |
| `RES.S.VERIFY_ACCOUNT_REQUIREMENTS` — ✅ migrated | `[["0", "Account ok. No requirements"]]` (test account, any VIP) / `[["1", "Invalid account"]]` (`29311`, `00000`) / `[["1", "Failed"]]` (`24600`, no VIP) | `"0"` = accepted. Not in the backend test client. The VIP number isn't checked (a wrong one still answers `"0"`), and `29311`, which **has** a requirement list, answers "Invalid account" with or without its answer (backend issue). |
| `RES.S.GOOGLE_ZONE_NUM` | `[["1", "10001331"]]` (40.7484, -73.9857, 10001), `[["1", "11215000"]]`, `[["1", "10001850"]]` / `[["1", "90000999"]]` (0, 0, 00000) | `"1"` with a zone number in `o_message` for every input; the 8-digit form matches the stored rides' `oefromzonenum` (`10305000`). Whether `90000999` means "outside the service area" is unconfirmed, so the app still treats only `"0"` as a match (fails closed into the acknowledgement). |
| `RES.S.ZONE_THE_LOCATION` | `[["", ""]]` | Empty for **every** input tried (2026-10-30 and again 2026-11-03): saved addresses, the backend test client's own sample (`1 WADSWORTH AVE, MANHATTAN`, state `LC`), `36 ADELE ST, STATEN ISLAND, NY`, an airport and a made-up street. Every saved-address stop (Express included) goes to the acknowledgement. |
| `RES.S.LATITUDE_LONGITUDE_FOR_CAR` — ✅ migrated | `[["0", "Success", "40.5913", "-74.0887"]]` (car `888`) / `[["0", "Success", "", ""]]` (car `412`) / `[["5", "No Data Found", "", ""]]` | Headings `o_code, o_message, o_latitude, o_longitude`. `"0"` = position (blank = none), `"5"` = no position; any other code a refusal. |
| `RES.S.CREDIT_CARD_APPROVAL` — ✅ migrated | `[["0", "186254"]]` (request `753371`) / `[["1", "Invalid request number."]]` | `"0"` with the **approval number** in `o_message`. A request made minutes earlier (`753390`) still answered `"1"` after 10 minutes, so whether a decline has its own code is unknown; the app keeps polling until its 90 s limit. |
| `RES.S.LOAD_RESERVATION_COLUMN_SINGLE_VALUE` — ✅ migrated | `[["0", "Success", "1"]]` (`W5121607812`, column `1`) | Headings `o_code, o_message, o_columnvalue`. A column with no value still fails: `"9"` `ORA-01400: cannot insert NULL into WS_RESERVATION_COLUMN_VALUES.COLUMN_VALUE` (invalid JSON, so the app reads it as a failed call and shows nothing). |

### Record sets (re-probed 2026-11-03)

The backend fixed the record sets on 2026-11-03: every row now carries exactly one value per heading, and each value sits under its own heading. At the same time it **renamed every heading** to lower case without underscores (`first_name` → `ofirstname`, `oCountry` → `ocountry`). The app reads each code by these names (§7, §7a, §7b); the RES codes were remapped the same day. Earlier shapes are in git history.

| Code | Headings sent | Rows (test login) | Notes |
|---|---|---|---|
| `PROF.S.LOAD_PROFILE` — ✅ migrated | 44 = 44: `ologinid, opassword, ofirstname, olastname, ophonenumberus, ophoneextus, ophonenumber, ophoneext, ofax, ocountry, ostate, ocity, ozip, obuildingnum, ostreetname, ocrossstreet1, ocrossstreet2, oaddressphoneus, oaddressphone, oaddresstype, opaymenttype, oaccountnum, ovipnum, occtype, ocardholdername, ocardnumber, overifycode, occmonth, occyear, oaccountreq1, oaccountreq2, oaccountreq3, oaccountreq4, oconfirmationmethod, opreferredfleet, ocaryear, ocarphone, ospecialoffer, osmokingcar, oivrpin, oeemailaddress, oedatecreated, oelastserviceddate, oelastlogindate` | 1 | Was 15 headings / 44 values with `first_name` = the password. Now carries the mailing address (`ocountry` … `oaddresstype`, `ocountry` a code: `01` = US), payment and card, the four account requirements, the preferences (`oconfirmationmethod` (empty for the test login), `opreferredfleet`, `ocaryear`, `ocarphone`, `ospecialoffer`, `osmokingcar`, `Y` / `N`) and three `DD-MON-YY` dates. `oelastlogindate` replaces `last_login` and is now filled. `opassword`, `ocardnumber` and `overifycode` are sensitive: never display or log them. |
| `PROF.S.USER_ADDRESSES` — ✅ migrated | 17 = 17: `ocountry, ostate, ocity, ostreetnum, ostreetname, ocrossstreet, opickuppoint, ozip, odirections, ophonenum, oext, ophonenumus, oextus, oepickupcount, oerowid, oeusagefrequency, oelastservicedate` | 20 | Was 16 headings (`address_id, country, …`) shifted by one. Now the same 17 headings as the two codes below. There is no `address_id`; `oepickupcount` (unique per row, e.g. `102`) and `oerowid` are the row ids. Which one update / delete take as `P_PICKUP_COUNT` is to confirm. |
| `PROF.S.USER_PROFILE_ADDRESSES` — ✅ migrated | 17 = 17: same as `USER_ADDRESSES` | 17 | Was the camel-case spelling (`oCountry`, `oePickupCount`, …). The profile's frequent-pickup list (guide 06), not the mailing address. |
| `PROF.S.CORPORATE_ADDRESSES` — ✅ migrated | 17 = 17: same as `USER_ADDRESSES` | 2 (test account) | Was the camel-case spelling. |
| `RES.S.ALL_ORDERS` — ✅ migrated | 112 = 112, listed below | 15 | Was 10 headings / 112 values, shifted so no row could be listed. Dates: `oresdate` `DD-MON-YY`, `oreservationdate` `MM/DD/YYYY`, `oreservationtime` `hh:mm am\|pm`. Status in `oecallstatus` / `oecallstatusdesc` and `oecurrentstatus` / `oecurrentstatusdesc`; actions in `oecanupdate`, `oecancancel`, `oecanprintvoucher`, `oecanviewstatus`. No voucher-number or feedback heading. Invalid JSON (receipt-image path), repaired by `parseBody`. |
| `RES.S.UPDATABLE_ORDERS` — ✅ migrated | 112 = 112, the same list as `ALL_ORDERS` | 4 | Was 10 headings / 112 values. |
| `RES.S.LOAD_RESERVATION` — ✅ migrated | 160 = 160: the order headings without `oresdate`, plus the ones listed below | 1 per number (`W6091020269`, `6081912876`, `NDBG454`, …) | Now a different record per number. **`oecarnum` is sent twice** (positions 75 and 118); `mapRows` keeps the later value. An unknown number answers `dummy` alone. It also returns **another customer's** reservation when given its number (`W5121607812`, the test client's sample, belongs to a different login): no ownership check (backend issue). Invalid JSON, repaired. Value notes below. |
| `RES.S.VEHICLE_TYPE` — ✅ migrated | 2 = 2: `oevehiclecode, oevehicledesc` | 5 | `0` No Preference, `3` Sedan, `4` SUV, `H` Standard Wheelchair Vehicle, `K` Premium Wheelchair Vehicle (guide 17's codes). No seat-count or description heading. |
| `RES.S.ALL_PREDEFINED_QUESTIONS` — ✅ migrated | 2 = 2: `question_id, question` | 2 | `1` "How I can contact the driver?", `2` "Why vehicle is late?". |
| `PROF.S.ACCOUNT_REQUIREMENTS_RS` | 1 = 1: `dummy` | 1 (`"X"`) | `dummy` alone means **no rows**. Also `dummy` for `29311`, whose `ACCOUNT_REQUIREMENTS_LIST` has a requirement. |
| `RES.S.ACCOUNT_REQUIREMENTS_LIST` — ✅ migrated | 5 = 5: `account_num, requirement_num, value, description, company_num` | 2 for `29311` requirement 1 (`BUS` / `BUSINESS`, `PERS` / `PERSONAL`); `dummy` for requirement 2–4 and for `99005` / `24600` | One row per allowed answer: `value` goes in `P_ACCOUNT_REQUIREMENTn`, `description` is shown. No heading carries the field's label. |
| `RES.S.VEHICLE_LOG` — ✅ migrated | 6 = 6: `oetrackingdate, oetrackingtime, oestatuscode, oestatusdesc, oelongitude, oelatitude` | 31 (`W5121607812`), 10, 50 | Date `MM/DD/YYYY`, time `hh:mm:ss AM\|PM`. Statuses seen: `4` Accept, `30` Tracking, `9` On Scene, Circling, Load, Unload, Start Unit, Repeat Cpy, Stop. |
| `RES.S.COMMUNICATION_LOG` — ✅ migrated | 10: `question_id, question, asked_question_id, login_id, reservation_num, account_num, vip_num, additional_message, asked_question_datetime, answer` | 0 for every ride tried | The questions asked about a ride (`RES.I.ASKED_QUESTIONS`) and their answers. No rows yet, so the date format of `asked_question_datetime` is unknown. |
| `RES.S.LOAD_RESERVATION_COLUMN_VALUES_BY_TYPE` — ✅ migrated | 2 = 2: `ocolumnid, ocolumnvalue` | 1 (`W5121607812`, column `1`: `1`), 0 for column `8` | |

`ALL_ORDERS` / `UPDATABLE_ORDERS` headings: `ologinid, oreservationnumber, ofirstname, olastname, oresdate, oreservationdate, oreservationtime, oputype, opucountry, opustate, opucity, opuzipcode, opustreetnumber, opustreetname, opucrossstreet, opucrossstreet2, opupoint, opudirections, opuaddressadd, opuairportname, opuairlinename, opuflightnumber, opuflightarrivingfrom, opuairportoption, opulandmarkname, odotype, odocountry, odostate, odocity, odozipcode, odostreetnumber, odostreetname, odocrossstreet, odocrossstreet2, ododirections, odoaddressadd, odoairportname, odoairlinename, odoflightnumber, odoterminalnumber, odoflightdestinationcity, odolandmarkname, opaymentmethod, oaccountnumber, oaccountrequirement1, oaccountrequirement2, oaccountrequirement3, oaccountrequirement4, ocardtype, ocardholdername, ocardnumber, overifycode, obillingzipcode, oexpirationdate, ofleetname, oconfirmationmethod, ophonenumber, ophoneext, ophonenumberus, ophoneextus, oemail, oneedphone, ocartype, ocaryear, onumberofpassengers, onumberofstops, osmokingallowed, oapprovalnum, oevipnumber, oeoriginatedatetime, oescheduleddispatchtime, oedispatchtime, oecallstatus, oecallstatusdesc, oecurrentstatus, oecurrentstatusdesc, oecarnum, oedriverid, oeeta, oefare, oeservicecharge, oefromzonenum, oeapzonenum, oetozonenum, oedoapzonenum, oejobnum, oecanupdate, oecancancel, oecanprintvoucher, oecanviewstatus, oeimageid, oeimageidpng, oeimagefullpath, oeinvoiceposted, oeconfirmationtime, oeonscene, oeload, oecircle, oeetaupdatetime, oeetaupdate, oecircleeta, oeetanow, oecompanyname, oeapprovalflag, oepaymentpolicy, oeisopenorder, oegetbillingoption, oepickuplat, oepickuplon, oedropofflat, oedropofflon, oeusercompanyname`.

`LOAD_RESERVATION` adds: `oereservationmakefor, oeridepurpose, oeccemail, oeloginidreservationmakefor, oeapprovaldate, oeoperatorname, oevouchernum, oecarcolor, oecarmodel, oedrivernum, oedrivername, oeactualnumofstops, oetransactiondate, oetransactionamount, ccfare, ccservicecharge, cctips, cctolls, ccwaitingamount, ccstopwaitingamount, ccwaitingminutes, ccstopwaitingminutes, ccstops, ccpackage, ccadditonalpassenger, ccphone, ccmisc, ccnyssurcharge, cctotaldiscount, ccstatesalestax, iddfare, iddservicecharge, iddtips, iddtolls, iddwaitingamount, iddstopwaitingamount, iddwaitingminutes, iddstopwaitingminutes, iddstops, iddpackage, iddadditonalpassenger, iddphone, iddmisc, iddtotal, iddnyssurcharge, iddtotaldiscount, iddinvoicenum, iddstatesalestax`.

**Order and reservation values** (decoded 2026-11-03 from the test login's 15 stored rides, the old site's and the backend test client's; `npm run gateway:probe -- … --summary --show=<headings>`):

| Heading | Values seen | Read as |
|---|---|---|
| `oputype` / `odotype` | `1` with a street, `2` with `odoairportname` `LGA`, `3` with a landmark name | Place kind; also `P_PU_TYPE` / `P_DO_TYPE` |
| `opaymentmethod` | `1` (test client's rides), `3` (old site's, on the same account, no card) | `1` corporate account; `2` / `3` unconfirmed |
| `oconfirmationmethod` | `ML` (with `oneedphone` `N`), `SND` (with `oneedphone` `Y`) | `ML` e-mail; `SND` assumed "phone" (to confirm) |
| `oreservationtime` | `10:30 am`, `02:20 pm` | `hh:mm am\|pm` |
| `oeoriginatedatetime` | `10-SEP-26` | `DD-MON-YY`, a date only |
| `opuaddressadd` / `odoaddressadd` | `N` | A flag, not the contract's "Suite 200" |
| `oereservationmakefor` | `1` (booked for themself) | `P_RESERVATION_MAKE_FOR` |
| `oeridepurpose` | `1`, `4` | Codes, though the app's field is free text (to confirm) |
| `ocartype` | `0`, `3`, `4` | `RES.S.VEHICLE_TYPE` codes |
| `onumberofstops` | `0`, `1`, and `u`, `W`, `s` on old rides | Not a number on some rides (backend issue); shown as "not available" |
| `oecallstatus(desc)` / `oecurrentstatus(desc)` | `0` Open, `2` Canceled, `6` Confirmed / `E` UnLoaded | As `ALL_ORDERS` |
| `cc*` / `idd*` | `cc*` filled on every finished ride; `idd*` (with `iddtotal`, `iddinvoicenum`) only once `oeinvoiceposted` is `Y` | `cc*` the call's charges, `idd*` the posted invoice (to confirm) |
| `odoairlinename`, `odoflightnumber`, `odoterminalnumber`, `odoflightdestinationcity` | Address text (`NEW YORK`, `1650 HYLAN BLVD`, `RIVERSIDE DR`) on street drop-offs | Shifted values (backend issue); read only for an airport drop-off |
| `oeimageidpng` | `\\192.168.168.19\Receipt_Images\<number>.PNG` | Internal path, never read |

### RES. write codes (probed 2026-11-03)

Approved by the user, on one test ride (test login, account `99005`, payment `1`, Brooklyn → Manhattan, 11/17/2026). Card values only from the backend test client's samples.

| Code | Sent | `o_code` | `o_message` | Read back |
|---|---|---|---|---|
| `RES.I.RESERVATION` | Time `14:30` | `"9"` | `ORA-01849: hour must be between 1 and 12` | Nothing stored |
| `RES.I.RESERVATION` | Time `02:30 PM`, `P_RIDE_PURPOSE` and `P_CC_EMAIL` blank | `"9"` | `ORA-01400: cannot insert NULL into WS_RESERVATION_COLUMN_VALUES.COLUMN_VALUE` (invalid JSON) | Nothing stored (sent twice; the first answer couldn't be read) |
| `RES.I.RESERVATION` | As above, `P_RIDE_PURPOSE` `Test record`, `P_CC_EMAIL` = the login | `"0"` | `W6110231278` — **the new reservation number** | **Not readable:** `LOAD_RESERVATION` answers `dummy`, neither order list shows it, and update / cancel answer "Invalid reservation number." Its column values (`1`, `2`) are stored. |
| `RES.I.RESERVATION` | `P_RIDE_PURPOSE` `Test record`, `P_CC_EMAIL` **blank**, 11/18/2026 | `"0"` | `W6110331282` | So the **ride purpose is the required one**; the CC e-mail can stay blank. Not readable either. |
| `RES.U.RESERVATION` | No-op, every parameter as created, `_OLD` = new | `"1"` | `Invalid reservation number.` | — |
| `RES.U.CANCEL_RESERVATION` | Reason `Test record` | `"1"` | `Invalid reservation number.` | — |
| `RES.I.RESERVATION_COLUMN_VALUE` | Column `8` (the app's Email CC id) | `"9"` | `ORA-02291: integrity constraint (OPTIMA.R_FROM_WS_RESERVATION_COLUMN) violated - parent key not found` | Column `8` doesn't exist for reservations |
| `RES.I.RESERVATION_COLUMN_VALUE` | Column `1` | `"0"` | `Success` | **Not stored:** neither column read shows it |
| `RES.U.RESERVATION_COLUMN_VALUE` / `RES.D.…` | The value just added | `"2"` | `Record does not Exist. Cannot update value.` / `… delete value.` | — |
| `RES.I.ASKED_QUESTIONS` | Question `1`, `Test question.` | `"0"` | `Success` | `COMMUNICATION_LOG` shows no row |
| `RES.U.FORMAT_EMAIL_MESSAGE` | The test ride, to the test login's own e-mail, no card | `"0"` | `success` | One e-mail sent |
| `RES.I.CREDIT_CARD_APPROVAL` | The test client's sample card (type `0`, number `1`, `11-2027`) | `"0"` | `753390` — **the request number** | `CREDIT_CARD_APPROVAL` answered `"1"` "Invalid request number." for it for 10+ minutes |

So:
- **`P_RESERVATION_TIME` is 12-hour** (`hh:mm AM|PM`); the contract's "14:30" is refused.
- **A booking needs a ride purpose:** with it blank the insert of a reservation column fails (`ORA-01400`); the CC e-mail may stay blank. The form now requires Trip purpose (≤ 50 characters).
- **`"0"` means created.** That a `"0"` booking doesn't then show up anywhere the app reads is a **database issue** for the backend. The backend test client's own bookings of 2026-10-28 (`W61028312…`) do show.
- **`"5"` means a duplicate:** re-sending the test client's sample (11/15/2026 10:30) answered `"5"` / `W6102831262`, the existing ride with those details; the ride list stayed at 15.
- If `W6110231278` or `W6110331282` ever appears as an open ride, cancel it.

### Profile codes renamed to the backend's names

The app first sent `PROF.S.LOAD_PROFILE_WHO_GRANTED_ACCESS`, `PROF.S.LOAD_PROFILE_COLUMN_VALUES` and `PROF.S.LOAD_PROFILE_COLUMN_VALUES_BY_TYPE`, which answered "Action code is not supported". The backend's test client (postman.eliteny.com, XYZCar Profile Module) names them without `LOAD_`. Under those names they answer with real headings, each read by heading:

| Code | Headings | Read in |
|---|---|---|
| `PROF.S.PROFILE_WHO_GRANTED_ACCESS` — ✅ migrated | `ologinid, ofirstname, olastname, ophonenumberus, ophoneextus, oaccountnum, ovipnum` (camel case until 2026-11-03) | `toGrantors`, `useReservationLookups.ts` |
| `PROF.S.PROFILE_COLUMN_VALUES` — ✅ migrated | `ocolumnid, ocolumnvalue` (camel case until 2026-11-03) | `toContacts`, `src/services/contacts.ts` |
| `PROF.S.PROFILE_COLUMN_VALUES_BY_TYPE` — ✅ migrated | `ocolumnid, ocolumnvalue` (camel case until 2026-11-03) | `toContactValues`, `useReservationLookups.ts` |

The test login has no rows in any of the three yet. Re-probed 2026-10-30 while looking for a preferences source: `PROFILE_COLUMN_VALUES` still answers 0 rows, while `PROFILE_COLUMN_VALUES_BY_TYPE` answers one row `["2", "0"]` for `P_COLUMN_ID` 2 and 0 rows for ids 1 and 3–12. What column 2 holds isn't documented, so nothing reads it.

### Searching for a preferences source (2026-10-30)

No action code in either backend test client (Profile and Reservation modules) is named for preferences, confirmation method or special offers. The read codes that could hold them under another name were probed:

| Code | `JData` | Answer |
|---|---|---|
| `PROF.S.PROFILE_COLUMN_VALUES` / `_BY_TYPE` | `P_LOGIN_ID` (+ `P_COLUMN_ID` 1–12) | See above: no preference rows. |
| `PROF.S.MATCHING_PROFILE_LIST` (not wired) | `P_LOGIN_ID` | Headings `oLoginID, oFirstName, oLastName, oPhoneNumberUS, oPhoneExtUS, oAccountNum, oVIPNum` (7 = 7); 15 rows of **other customers' profiles**, no preference columns. |
| `PROF.S.ACCESS_RIGHTS_GRANTED_PROFILE` (not wired) | `P_LOGIN_ID_FROM` (`P_LOGIN_ID` alone → `"1"` / `ORA-20001: Mandatory data key "p_LOGIN_ID_FROM" is missing`, invalid JSON) | Same 7 headings, 0 rows. |

So `PROF.S.LOAD_PROFILE` remains the only source. Since 2026-11-03 it sends the preferences under their own headings (`oconfirmationmethod`, `ospecialoffer`, …, above). The test client pages answered HTTP 500 (`Cannot find module './682.js'`) on 2026-10-30 afternoon; the code lists used are the ones read from them earlier that day.

### PROF.I.PROFILE — create

Two real corporate registrations have been sent, each with a fresh e-mail and the test account.

| Date | Sent | `o_code` | `o_message` | Created? |
|---|---|---|---|---|
| 2026-10-30 | Through the app: `P_CONFIRMATION_METHOD` `ML`, the form's car preferences | `"9"` | `INTERNAL ERROR : … ORA-12899: value too large for column "OPTIMA"."T_VIP_PROFILE"."PREFERRED_KNOCKOFF_CODE" (actual: 2, maximum: 1)` (invalid JSON, so the app showed "Something went wrong") | No |
| 2026-11-03 | Probe: all 41 parameters, `P_CONFIRMATION_METHOD` `''`, `P_CAR_YEAR` `''`, `P_VIP_NUM` `''` | `"0"` | `Saved` | **No**: `IS_UNIQUE_EMAIL` still answers `Success`, `CHECK_LOGIN_CREDENTIALS` answers `User does not exists`, and `LOAD_PROFILE` returns a blank row |

- **The insert reports success without storing the profile** (backend issue), the same as `PROF.I.PROFILE_COLUMN_VALUE`.
- The 2-character value behind `ORA-12899` is `P_CONFIRMATION_METHOD` `ML` or `P_CAR_YEAR` (both were blank on the second try). The backend must say which parameter fills `PREFERRED_KNOCKOFF_CODE` and its 1-character codes; the app still sends `ML` / `PHONE`.
- The app reads the answer by `o_code` / `o_message`; `"9"` shows its own copy (`PROFILE_REJECTED`), never the Oracle text. Sent with `retry: false`.

### PROF.U.PROFILE — update (probed 2026-11-03)

Probed on the test login without changing it (every column compared before and after):

| Sent | `o_code` | `o_message` | Profile after |
|---|---|---|---|
| All 38 contract parameters, each as `LOAD_PROFILE` stored it | `"0"` | `Success` | Unchanged |
| `P_LOGIN_ID` + the 7 personal parameters only | `"9"` | `INTERNAL ERROR : ORA-01843: not a valid month` | Unchanged |

So the procedure **needs every parameter**; the app sends all of them (§7). Parameter → heading: `P_PASSWORD` `opassword`, the personal and address parameters their `o…` headings, `P_PAYMENT_TYPE` `opaymenttype`, `P_CC_TYPE` `occtype`, `P_CARD_HOLDER_NAME` `ocardholdername`, `P_CARD_NUMBER` `ocardnumber`, `P_VERIFY_CODE` `overifycode`, `P_CC_MONTH` / `P_CC_YEAR` `occmonth` / `occyear`, `P_ACCOUNT_REQ1–4` `oaccountreq1–4`, `P_CONFIRMATION_METHOD` `oconfirmationmethod`, `P_PREFERRED_FLEET` `opreferredfleet`, `P_CAR_YEAR` `ocaryear`, `P_CAR_PHONE` `ocarphone`, `P_SPECIAL_OFFER` `ospecialoffer`, `P_SMOKING_CAR` `osmokingcar`, `P_IVR_PIN` `oivrpin`.

The backend test client's sample (XYZCar Profile Module) uses `P_COUNTRY` `01`, `P_ADDRESS_TYPE` `HOME`, `P_PAYMENT_TYPE` `1`, `P_CONFIRMATION_METHOD` `''`. Its `P_CROSS_STREET1` / `P_CROSS_STREET2` are two cross streets; the app puts Apt # / Mail stop in `P_CROSS_STREET2`, which needs the backend's answer.

### PROF.U.PASSWORD — change (probed 2026-11-03)

| Sent | `o_code` | `o_message` |
|---|---|---|
| Correct old password, new = the same password | `"0"` | `Changed` |
| Wrong old password | `"1"` | `Invalid info` |

The test login still signs in afterwards.

### PROF.I / U / D.PROFILE_COLUMN_VALUE — contacts (probed 2026-11-03)

Sent with `P_COLUMN_ID` 8 (e-mail) as a number, on the test login:

| Code | `o_code` | `o_message` |
|---|---|---|
| `PROF.I.PROFILE_COLUMN_VALUE` | `"0"` | `Success`, **but nothing is stored**: neither `PROFILE_COLUMN_VALUES` nor `_BY_TYPE` lists it, and update / delete can't find it |
| `PROF.U.PROFILE_COLUMN_VALUE` (value not found) | `"2"` | `Record does not Exist. Cannot update value.` |
| `PROF.D.PROFILE_COLUMN_VALUE` (value not found) | `"2"` | `Record does not Exist. Cannot delete value.` |

### PROF.S.CAR_INFO — car and driver (probed 2026-11-03)

`P_CAR_NUM` `100`: headings `driver_1st, color, make, model, model_year, 'wc_tlc_sticker_num'` (6 = 6), one row (`""`, `BLACK`, `LINCOLN`, `TOWN CAR`, `2013`, `WC_TLC_STICKER_NUM`). Cars `1`, `1234`, `5001`: no headings, no rows. The last heading's name carries quotes and its value repeats the name (a placeholder), so it isn't read. `toCarInfo` reads the other five; no heading carries the driver number or car type. Was `"1"` / `ORA-01001` on 2026-10-30.

### PROF.S.ACCOUNT_VIP_NUM (re-probed 2026-11-03)

Headings `paccountnum, pvipnum`, one row, no `o_code`, whatever `P_ACCOUNT_NUM` / `P_VIP_NUM` hold. The test login answers its account and VIP number; an unknown login answers both blank, which the app reads as nothing on file (`toAccountOnFile`).

### Codes that fail on the gateway

| Code | Answer |
|---|---|
| `RES.S.LOAD_RESERVATION_COLUMN_SINGLE_VALUE` (for a column with no value) | `"9"` `ORA-01400: cannot insert NULL into …RESERVATION_COLUMN_VALUES…` — a select code that tries an INSERT; invalid JSON (unescaped quotes). A column that has a value answers normally (above). |
| `RES.I.RESERVATION` with neither ride purpose nor CC e-mail | `"9"` `ORA-01400` on `WS_RESERVATION_COLUMN_VALUES.COLUMN_VALUE` (write probes above) |
