# Authentication Flow (via API Gateway)

How user login and session work through the API Gateway. Field names below are examples; in another project, swap them for that project's names and keep the same flow.

For the gateway request and response envelope, see [DM.md](DM.md).

---

## 1. Two separate layers

| Layer | Purpose | Who it identifies | Source |
|---|---|---|---|
| **Gateway token** | Allows *any* call to reach the gateway | The app, through one shared service account | Cognito `IdToken`, fetched on app start |
| **User login** | Checks the user's credentials and returns their profile | The end user | A normal gateway call |

> The gateway **does not return an access token** on login. The `Authorization: Bearer` header is the same before and after the user logs in.

---

## 2. Login flow

```
App start
  └─ fetch gateway token (service account) → store it → attach it to every request

User taps Login
  1. Validate the inputs on the client (email format, required fields)
  2. Gateway call:  ActionCode = <login action>,  ViewName = <login view>
                    JData = { company, account, loginId, password }
  3. Read JHeader.ActionCode
       != 0 → show JHeader.Message (e.g. invalid credentials) and stay on Login
       == 0 → JData holds the user's profile record
  4. Map the profile (Headings + JData row 0) → user object
  5. Save the user object locally (persisted)
  6. Set isAuthenticated = true  → navigation switches to the app screens
```

**Example values** ([LoginScreen.tsx:169](src/Screens/AuthScreens/LoginScreen.tsx:169)):

| Item | Example value |
|---|---|
| Login action | `ActionCode: "S.USER"`, `ViewName: "LOGIN"` |
| Request JData | `p_VP_COMPANY_NUM`, `p_VP_ACCOUNT_NUM` (empty), `p_VP_LOGIN_ID` (email), `p_VP_PASSWORD` |
| On success | `createManagedObject(response)` → `setUserInformation(...)` → `setLogin()` |

---

## 3. Identifying the user after login

There is no session token. Each later gateway call identifies the user by **copying identity fields from the saved profile into `JData`**.

| Profile field (example) | Role |
|---|---|
| `p_VP_ACCOUNT_NUM` | Account the user belongs to |
| `p_VP_USER_ID` | User identifier |
| `p_VP_VIP_NUM` | Passenger / VIP identifier |

Example of a later call:
```json
"JData": { "p_ACCOUNT_NUM": "<from profile>", "p_VIP_NUM": "<from profile>", "p_VP_USERID": "<from profile>", "...": "..." }
```

> **Other projects:** use whichever ID fields your login response returns, and send them in `JData` on every user-specific call.

---

## 4. Session state

| Concern | Behaviour |
|---|---|
| Logged-in flag | `isAuthenticated`, saved on the device. Navigation shows the app screens or the auth screens based on this flag ([RootNavigation.tsx:314](src/Navigation/RootNavigation.tsx:314)). |
| Keep me logged in | On launch, the saved `keepMeLoggedIn` preference sets the flag to logged in or logged out ([RootNavigation.tsx:103](src/Navigation/RootNavigation.tsx:102)). |
| Auto log-off (optional) | When the setting is on, the user is logged out after **30 minutes** without activity, including time spent in the background. |
| Logout | Local only: clear saved preferences and the user object, then set `isAuthenticated = false` ([More.tsx:140](src/Screens/BottomTabs/More.tsx:141)). **No gateway call.** |
| Gateway token expiry | On HTTP `401`, fetch a new service token and retry the request. The user stays logged in. |

---

## 5. Implementation checklist

1. On app start, get the gateway token and attach it to every request.
2. Build the login screen to send credentials in `JData` with your login `ActionCode` / `ViewName`.
3. Treat `JHeader.ActionCode == 0` as success. Otherwise show `JHeader.Message`.
4. Map the profile from the response and save it on the device.
5. Set and save an `isAuthenticated` flag, and switch navigation on it.
6. Add the user's ID fields from the saved profile to the `JData` of every user-specific call.
7. On logout, clear the saved profile, preferences and flag. No server call is needed.
8. Optional: add keep-me-logged-in and inactivity auto-logout.
