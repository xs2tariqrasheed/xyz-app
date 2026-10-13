# Login Flow — Step by Step

What happens from app launch, through the user tapping **Login**, to logout. This guide describes behaviour only, so it can be built with any stack. Field and action names are examples; swap them for your project's.

Related: [AUTH.md](AUTH.md) (summary) · [DM.md](DM.md) (gateway request format) · [REMEMBER_ME.md](REMEMBER_ME.md)

---

## 1. Before the user logs in

1. On launch, the app signs in to the identity provider with a **shared service account**. The details come from config.
2. It saves the returned token and sends it as `Authorization: Bearer <token>` on **every** gateway request, both before and after the user logs in.
3. This token identifies the **app**, not the user.

## 2. Login screen

| Element | Behaviour |
|---|---|
| Email | Converted to lowercase as the user types. The format is checked live; an invalid entry shows "Invalid email address", and an empty field shows no error. |
| Password | Hidden by default, with an eye icon to show or hide it. |
| Remember me | Fills in the form on the next visit. See [REMEMBER_ME.md](REMEMBER_ME.md). |
| Forgot Password? | Opens the password-reset flow. |
| Login | Starts the steps below. |

## 3. When the user taps Login

```
1. Close the keyboard
2. Required check   → any empty field shows "(Required)" → stop
3. Email check      → invalid format → stop
4. Save or clear the Remember-me credentials
5. Show the loading indicator
6. Send the login request through the gateway
```

**Login request** (standard gateway envelope):

| Item | Example |
|---|---|
| ActionCode / ViewName | `S.USER` / `LOGIN` |
| JData | `p_VP_COMPANY_NUM` (from config), `p_VP_ACCOUNT_NUM` (`""`), `p_VP_LOGIN_ID` (email), `p_VP_PASSWORD` (password) |

## 4. Handling the response

| Result | What happens |
|---|---|
| `JHeader.ActionCode != 0` (wrong credentials, expired password, etc.) | The global error sheet shows `JHeader.Message`. The loading indicator hides, and the user stays on the Login screen. |
| Network failure | The request is retried up to 3 times. After that the app shows a network error and the user stays on Login. |
| `JHeader.ActionCode == 0` | Success. Continue to step 5. |

## 5. After a successful login

1. Map the response (`Headings` + the first `JData` row) into a **user profile** object.
2. Save the profile on the device so it survives restarts.
3. Set **logged in = true** and save it.
4. Clear any leftover sign-up draft data and reset the login form.
5. Navigation switches from the auth screens to the app screens. The switch is driven by the flag, so no manual navigate call is needed.
6. Every later user-specific request copies identity fields from the saved profile into `JData`, for example the account number, user ID and VIP number.

> The server returns **no session or access token** for the user. The saved profile and the local flag *are* the session.

## 6. App relaunch

| Situation | Result |
|---|---|
| "Keep me logged in" is on (default) | The user goes straight to the app screens. |
| "Keep me logged in" is off | The flag is set to false and the Login screen shows. |
| The preference was never saved | The saved flag is used as-is. |

## 7. While logged in

- **Auto log-off (optional setting):** the user is logged out after 30 minutes without activity. Time spent in the background counts toward the 30 minutes.
- **Service token expires:** a request gets HTTP `401`, so the app fetches a new service token and retries. The user is not logged out.

## 8. Logout

1. Delete the saved preferences (and any cached profile photo).
2. Set logged in = false and clear the user profile.
3. Reset the preference settings in memory.
4. Navigation returns to the auth screens.

There is **no logout request** to the server. Remember-me credentials are **not** cleared.

---

## Checklist for a new project

1. Get a service token on launch and attach it to every request.
2. Build the login screen with a required check and an email format check.
3. Send the credentials through the gateway login action.
4. Check `ActionCode == 0`. Otherwise show `Message`.
5. Save the profile and a logged-in flag, and switch navigation on that flag.
6. Send the profile's ID fields with every user-specific request.
7. On logout, clear the profile, flag and preferences locally.
