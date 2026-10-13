# Remember Me (Login Screen)

"Remember me" only **fills in the login form** with the last saved email and password. It does **not** skip login or keep the user signed in. The user still taps Login, and the normal login request runs (see [AUTH.md](AUTH.md)).

> This is separate from **Keep me logged in**, a different setting that decides on app launch whether the user stays signed in.

## Flow

```
Login screen opens
  └─ saved credentials exist?
        yes → fill email + password, tick the "Remember me" checkbox
        no  → empty form, checkbox unticked

User taps Login (after the fields pass validation)
  ├─ checkbox ticked   → save { email, password } on the device
  ├─ checkbox unticked → delete any saved credentials
  └─ send the login request
```

## Rules

| Step | Behaviour |
|---|---|
| Default | The checkbox starts **unticked**. |
| Toggling the checkbox | Changes only what's on screen. Nothing is saved or deleted until the user taps Login. |
| On Login, ticked | Saves the email and password exactly as typed. |
| On Login, unticked | Deletes the saved credentials. |
| Next time the screen opens | If credentials are saved, fills both fields and ticks the box. |
| Persistence | The saved credentials survive app restarts. |

## Behaviour to know

- Credentials are saved **when Login is tapped**, before the server responds, so they are saved even if the login fails.
- The only way to clear them is to log in with the box unticked. **Logout does not clear them.**
- The password is stored **unencrypted** on the device. In a new project, store it in the platform's secure storage (iOS Keychain / Android Keystore), or remember only the email.
