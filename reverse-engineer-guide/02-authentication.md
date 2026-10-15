# Module 02 — Authentication (Login, Logout, Lockout, Session)

## 1. Purpose
Authenticate a member by e-mail + password + reCAPTCHA and start a session; end the session on logout; communicate locked/expired accounts.

## 2. Access
Anonymous. Login is the site root `/`.

## 3. Data model

| Field (sent as) | Type | Required | Rules |
|---|---|---|---|
| `email` | string | yes | max 50; valid e-mail (module 26 §1); trimmed |
| `pwd` | string | yes | 4–10 chars; must not contain `'` or `"` |
| `isremember` | boolean | no | "Remember me" |
| `CaptchaResponse` | string | yes | Google reCAPTCHA v2 token (site key `6Le9fAgUAAAAAJjqgk_OAInApdkSb2CZ5AdKs--U`) |

## 4. API

### 4.1 `POST /Misc/UserLogon` — log in [C]
Request (form-urlencoded):
```
email=user%40example.com&pwd=****&isremember=false&CaptchaResponse=<token>
```
Responses and handling:

| Response | Meaning | Client action |
|---|---|---|
| `{"success":true}` | Authenticated | Go to `/MemberArea/Index` |
| `{"success":false,"message":"<text>"}` | Bad credentials / captcha etc. | Show message, reset captcha |
| `{"success":false,"message":"","constant":"1"}` | Account locked | Go to `/Misc/UserMessages?constant=1` |
| `{"success":false,"message":"","constant":"2"}` | Account expired | Go to `/Misc/UserMessages?constant=2` |
| `{"success":false,"message":"","constant":"b"}` | Unsupported browser | Go to `/Misc/BrowserError` |

### 4.2 `GET /Misc/Logout` [O]
Ends session → 302 `/`.

### 4.3 `POST /Base/VerifyLogon` — inline login during guest booking [C]
Used only in the guest booking flow when the typed e-mail already has a profile.
Request: `email, password, phour, pmin, ppart, pdate` (the chosen ride hour/minute/AM-PM/date, preserved across reload).
Response: `{success:true}` → reload booking page logged in; `{success:false,message}` → show message.

## 5. Business rules
- Login ID = e-mail. Lockout after several failed attempts, auto-unlock after "a few minutes" (thresholds **[U]**).
- Expired accounts must call customer service.
- After login the server stores last-login timestamp (shown on member home: "Last login date/time").

## 6. Data rendered after login [O]
Header: `Welcome <email> | Logout`; authenticated menu groups: Profile (Change Personal Info, Change Billing Address, Change Preferences, My Addresses, My Contacts, Change Password), Reservation (Make New Reservation, Update/Cancel Reservation, Ride History Search).

## 7. Errors & messages

| Condition | Message |
|---|---|
| E-mail empty | Please enter email address. |
| E-mail invalid | Invalid email address. |
| Password empty | Please enter password. |
| Password contains `'`/`"` | Invalid Password. |
| Password < 4 | Password must be at least 4 characters long. |
| Captcha missing | Please select captcha. |
| Locked page | Your account is locked for security reasons after several failed login attempts. Please try again in few minutes. |
| Expired page | Your account has expired. Please call customer service at 718-499-2007 between 9:00am and 5:00pm … dispatch office 24 hours a day at 718-768-7333. |

## 8. Revamp notes
- Keep outcomes: success / invalid / locked / expired. Drop browser check.
- Use hashed passwords, longer length, rate limiting, CSRF-protected login; return a generic invalid-credentials message.
- Remember-me = persistent session.
