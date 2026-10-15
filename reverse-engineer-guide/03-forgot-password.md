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
