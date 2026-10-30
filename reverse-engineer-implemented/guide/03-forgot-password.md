> ✅ **Implemented** in the XYZ app
>
> ✅ **Migrated to real gateway data** (2026-10-30): the module's action codes are mapped by heading from the gateway's real responses. Each code's real answer, and any code not yet answered or confirmed, is in §8 Gateway (real data).

# Module 03 — Forgot Password

## 1. Purpose
Recover access when the member forgot the password. Current behaviour (help text): *"Please enter your login name and your password will be mailed to you."*

## 2. Access
Anonymous. Page `GET /Misc/Forgot`.

## 3. Data model

| Field | Type | Required | Rules |
|---|---|---|---|
| `Email` | string | yes | the login e-mail |
| `g-recaptcha-response` | string | yes | reCAPTCHA v2 token |

## 4. API

### `POST /Misc/Forgot` [C]
Request: `Email=<login e-mail>&g-recaptcha-response=<token>`
Response: **HTML view** (confirmation or error) that replaces the page content. Transport error → the raw response text is shown.

## 5. Business rules
- Sends the existing password by e-mail (reversible password storage) **[I from help text]**.
- Behaviour for unknown e-mails **[U]**.

## 6. Errors & messages

| Condition | Message |
|---|---|
| Empty e-mail | Please enter your login name. |
| Captcha missing | Please select captcha. |

## 7. Revamp notes
Implement token-based reset: `POST /auth/password/forgot {email}` (always neutral response) → e-mail link with single-use expiring token → `POST /auth/password/reset {token, newPassword}`.

## 8. Gateway (real data)

Checked against the live gateway on 2026-10-30 (`docs/XYZ_INTEGRATION_GUIDE.md` §7, §10).

| Action code | JData | Real answer |
|---|---|---|
| `PROF.S.PASSWORD` | `P_LOGIN_ID` (trimmed, lower-cased) | `o_code` / `o_message`: `"0"` / `Sendmail` when the password was mailed |

- `"0"` → the success panel ("Your password has been sent to your email."). Any other code → the gateway's `o_message`. No `o_code` → a general error (fail closed).
- **Not yet seen:** the answer for an unknown login name.
