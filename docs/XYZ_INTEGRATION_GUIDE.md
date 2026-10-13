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

The envelope is built **once** per call; retries resend the same body.

| Situation | Error kind | Retried? |
|---|---|---|
| `JHeader.ActionCode == 0` | — (success) | — |
| `JHeader.ActionCode != 0` | `api` (message = `JHeader.Message`) | **No** |
| Timeout, no connection, HTTP error | `network` | Yes, 3 attempts, back-off 500 ms × attempt |
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
save.reset();
```

- Positional arguments, not one object.
- One instance tracks only its **latest** call — use one instance per action. A slower, older call never overwrites a newer result.
- `isSuccess` does **not** check `o_code`; do that yourself.

### `useFetchData`

```ts
const profileRequest = useFetchData(ACTION_CODES.LOAD_PROFILE, GATEWAY_VIEW_NAME, {
  P_LOGIN_ID: session?.loginId ?? '',
});
const profile = toCustomerProfile(profileRequest.parsedData);
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

**Routing.** `Stack.Protected guard={signedIn}` wraps `(app)`; `login` and `forgot-password` are guarded by `!signedIn`. Navigation follows the status — no manual redirects.

**Identify the user in later calls** by sending `P_LOGIN_ID: session.loginId` in `JData` (e.g. `PROF.S.LOAD_PROFILE`).

**Password recovery** (`forgot-password.tsx`): `PROF.S.PASSWORD` with `{ P_LOGIN_ID }` (normalised like login) via `usePostData`. A returned `o_code` other than `"0"` → `AuthError(o_message)`; no `o_code` → sent. On success the screen shows "check your email".

**Logout** (`signOut`): clear stored session, set `signedOut`. Local only, no gateway call.

---

## 8. Not wired yet

- **Gateway service token.** The original contract sends `Authorization: Bearer <IdToken>` from a shared Cognito service account (`InitiateAuth`, `USER_PASSWORD_AUTH`, no client secret), fetched on app start, refreshed and retried once on HTTP `401`. It identifies the app, not the user, and is kept on logout. When added, it goes in `getAuthHeaders()` in `gateway.ts` (plus env vars) — nothing else changes. Prefer issuing it from a backend over shipping the service password.
- **Ride history / dispatch.** `src/services/rides.ts` still filters sample data; swap it for gateway calls inside that file only.

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
