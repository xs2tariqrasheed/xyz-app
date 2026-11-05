# Missing 11 — Open an Account (Corporate Account Request)

| | |
|---|---|
| **App today** | 🔴 Missing. Registration (`register.tsx`) creates a **member profile** on an existing corporate account or a credit card. There is no way to ask XYZ to open a **new corporate account**. |
| **Legacy reference** | [`../reverse-engineer-guide/24-feedback-rating-complaints.md`](../reverse-engineer-guide/24-feedback-rating-complaints.md) §2 ("Open a (corporate) account") |
| **Gateway** | ⛔ No action code. **Blocked on backend** (suggested `PROF.I.ACCOUNT_REQUEST`). |
| **Priority** | P3 |

## 1. Purpose
A sales lead form. A company asks XYZ to open a corporate (billed) account. Sales follows up manually.

## 2. Live form (captured 2026-10-16) [O]
- **Page:** `https://xyzcar.com/open-an-account/`, form "Creat An Account" *(sic)*. Evidence `ev_a682821e…` plus a DOM read.
- **Copy:**
  - title "Open an Account"
  - subtitle "Your Gateway to Premium Services: Open An Account"
  - heading "Open Your Account Today!"
  - text "Streamline your corporate transportation with XYZ Car. Open a corporate account today and simplify employee travel arrangements…"

| Label | Field (`form_fields[...]`) | Type | Required | Pattern |
|---|---|---|---|---|
| First Name | `fname` | text | yes | — |
| Last Name | `lname` | text | yes | — |
| Email Address | `email` | email | yes | — |
| Phone # | `phone` | tel | yes | `[0-9()#&+*-=.]+` |
| Company Name | `cname` | text | yes | — |
| Company Phone # | `cphone` | tel | yes | `[0-9()#&+*-=.]+` |

- **Button:** "Create Account". **Hidden:** `post_id=66248`, `form_id=5f7e815`; reCAPTCHA v3.

## 3. Where it belongs in the app
- This is a **public** (signed-out) feature: prospects have no login.
- Put it on the **login screen** ("New company? Open a corporate account") and in the Contact hub (file 10).
- **Route:** `src/app/open-account.tsx` (outside `(app)`; add it to the signed-out `Stack.Protected` group in `src/app/_layout.tsx`).

## 4. Data model & validation
| Field | Rule (app) |
|---|---|
| firstName | required, ≤ 15, no digits / `"` (guide 26 parity) |
| lastName | required, ≤ 20, ≥ 2 |
| email | required, ≤ 50, e-mail |
| phone | required, US 10 digits or international |
| companyName | required, ≤ 50, no `"` |
| companyPhone | required, phone |

## 5. API
- **Target `PROF.I.ACCOUNT_REQUEST`** ⛔: `{ P_FIRST_NAME, P_LAST_NAME, P_EMAIL, P_PHONE, P_COMPANY_NAME, P_COMPANY_PHONE }` → `o_code` / `o_message`. Needs bot protection on a signed-out endpoint (real CAPTCHA, see file 21).
- **Interim:** `expo-web-browser` → `https://xyzcar.com/open-an-account/` (URL in config).

## 6. Acceptance criteria
- [ ] Reachable while signed out. Validation messages are in `messages.ts` → `OPEN_ACCOUNT_MESSAGES`.
- [ ] **Success:** "Thanks — our sales team will contact you." No account is created client-side.

## 7. Unknowns
- [U] Sales workflow and response time.
