# How Authentication Works

A simple step-by-step guide to the login system. Follow these steps to build the same flow in another project.

---

## The big idea

Authentication has **two separate layers**:

1. **App token:** the app signs in to AWS Cognito with one shared service account. The token it gets back lets the app talk to the API gateway. This token identifies the **app**, not the user.
2. **User login:** the user's email and password are checked by a normal gateway call. If they are correct, the gateway sends back the user's profile.

The gateway does **not** give the user their own token. The app token stays the same before and after login. After login, the app knows who the user is from the **saved profile**.

---

## Step 1: Get the app token when the app starts

- When the app opens, sign in to Cognito with the shared service account. The username, password, region, client ID and auth flow all come from the environment config.
- Cognito returns an **IdToken**.
- Save this token in the app's global state.

## Step 2: Send the token with every request

- Add the token to every API request as a header: **Authorization: Bearer (token)**.
- If a request fails with **401 (Unauthorized)**, get a new token from Cognito and try the request again.

## Step 3: Show the Login screen

- The user enters their email and password.
- Change the email to lowercase while the user types, and check its format as they type.
- If "Remember me" was used last time, fill in the saved email and password.

## Step 4: Check the inputs when the user taps Login

1. Close the keyboard.
2. If any field is empty, show "(Required)" and stop.
3. If the email format is wrong, stop.
4. If "Remember me" is checked, save the email and password. If not, clear them.
5. Show a loading indicator.

## Step 5: Send the login request

Send one request to the gateway with:

| Item | Value |
|---|---|
| Action code | **S.USER** |
| View name | **LOGIN** |
| Data | Company number (from config), account number (empty), email, password |

The request also includes standard header info: device type, device ID, app version, IP address and GPS location.

## Step 6: Check the response

The gateway always returns a header with an **ActionCode** and a **Message**.

| Response | What to do |
|---|---|
| ActionCode is **0** | Login worked. Go to Step 7. |
| ActionCode is **not 0** | Wrong email or password, or another problem. Show the Message to the user, hide the loading indicator, and stay on the Login screen. Do not retry. |
| Network error | Retry up to 3 times. If it still fails, show a network error. |

## Step 7: Save the user and mark them as logged in

1. The response holds the user's profile as a list of field names (Headings) and one row of values (Data). Combine them into one user object.
2. Save the user object in global state.
3. Set **isAuthenticated = true**.
4. Hide the loading indicator and clear the form.

## Step 8: Switch to the main app

- The app's root navigation watches **isAuthenticated**.
  - **false** → show the login and sign-up screens.
  - **true** → show the main app screens.
- When it changes to true, the user moves to the home screen on their own. You don't need to navigate by hand.

## Step 9: Identify the user in later requests

- There is no user session token.
- For each later request, take the user's IDs from the saved profile and put them in the request data. The main ones are **User ID**, **Account number** and **VIP number**.

---

## Staying logged in

- **Save state to device storage:** the auth state and user profile are saved to the device. They load again when the app restarts, so the user stays logged in.
- **"Keep me logged in" setting:** on app start, read this setting.
  - On → keep the user logged in.
  - Off → log the user out.
- **Auto log-off (optional setting):** if the user does nothing for **30 minutes**, log them out. Also log them out if the app comes back from the background after 30 minutes or more.

## Logging out

1. Remove the saved preferences and profile photo from device storage.
2. Set **isAuthenticated = false**.
3. Clear the saved user profile.
4. Reset the user's preferences.
5. The app goes back to the Login screen on its own.

The app token is **not** cleared on logout, because it belongs to the app, not the user.

---

## Summary

| # | Step |
|---|---|
| 1 | App starts → get the Cognito app token → save it |
| 2 | Add the token to every request (get a new one on 401) |
| 3 | User enters email and password |
| 4 | Check the inputs |
| 5 | Send login request (**S.USER / LOGIN**) |
| 6 | ActionCode 0 = success, anything else = show the error |
| 7 | Build the user object → save it → isAuthenticated = true |
| 8 | Navigation switches to the main app |
| 9 | Later requests send the user's IDs from the saved profile |

---

## Tips for the new project

- **Don't store the password as plain text** for "Remember me". Use secure storage instead: Keychain on iOS, Keystore on Android.
- Keep the Cognito service account details in environment config, never in the code.
