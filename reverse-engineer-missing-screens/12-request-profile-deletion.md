# Missing 12 — Request Profile Deletion *(new — not in the old guides)*

| | |
|---|---|
| **App today** | 🔴 Missing. The app has no way to delete or ask to delete an account. |
| **Legacy reference** | None in `reverse-engineer-guide/`. Found on 2026-10-16 in the marketing-site menu (Contact Us → "Request Profile Deletion"). |
| **Gateway** | ⛔ No action code. **Blocked on backend** (suggested `PROF.I.DELETION_REQUEST`). |
| **Priority** | **P1.** The Apple App Store (guideline 5.1.1(v)) and Google Play both require apps that support account creation to let users start account deletion **from inside the app**. The app has registration, so this is a release blocker for the store builds. |

## 1. Purpose
A member asks XYZ to delete their profile and all of its associated data.

## 2. Live form (captured 2026-10-16) [O]
- **Page:** `https://xyzcar.com/request-profile-deletion/`. In-app browser DOM read.
- **Copy:**
  - title "Request Profile Deletion"
  - subtitle "Your Data, Your Choice — Request Profile Removal Here."
  - instruction "Please enter the following information to request profile deletion and all of its associated data."

| Label | Field (`form_fields[...]`) | Type | Required | Pattern |
|---|---|---|---|---|
| Login ID | `loginid` | text | yes | — |
| First Name | `fname` | text | yes | — |
| Last Name | `lname` | text | yes | — |
| Phone Number | `phone` | tel | yes | `[0-9()#&+*-=.]+` |
| Email Address | `email` | email | yes | — |
| Account Number | `Accnumber` | text | yes | — |
| Account Name | `accname` | text | yes | — |

- **Hidden:** `post_id=72015`, `form_id=0bbe8a6` (the **same form id as the Contact form**: it is a copied Elementor form, so submissions likely go to the same inbox [I]); reCAPTCHA v3.
- **Process:** handled manually by staff [I]. No confirmation flow was observed (not submitted).

## 3. App design
In the app the member is **signed in**, so do not ask for anything the profile already has (no-noise rule):
- **Pre-filled read-only summary:** login ID, name, e-mail, phone, account number and name, all from `PROF.S.LOAD_PROFILE` via `useProfile()`.
- **One required checkbox:** "I understand my profile, saved addresses, contacts and booking access will be deleted."
- **Button:** "Request deletion" (destructive style). Use a confirm sheet; it is irreversible.
- **Route:** `src/app/(app)/delete-account.tsx`. Entry: Profile → bottom "Delete my profile".

**After success:**
- Show "Your request has been sent. Customer service will confirm by e-mail." (exact copy to be agreed)
- Sign out (`signOut()`), or keep the session until the backend confirms (product decision).

## 4. API
- **Target `PROF.I.DELETION_REQUEST`** ⛔:

| Parameter | Value |
|---|---|
| `P_LOGIN_ID` | session (server-side identity; never trust UI values) |
| `P_FIRST_NAME`, `P_LAST_NAME`, `P_PHONE`, `P_EMAIL` | from profile |
| `P_ACCOUNT_NUM`, `P_ACCOUNT_NAME` | from profile |
| `P_REASON` | optional |

Response: `o_code` / `o_message`.
- **Interim** (still store-compliant, because the flow starts in-app): open `https://xyzcar.com/request-profile-deletion/` with `expo-web-browser`. Confirm with product and legal.

## 5. Acceptance criteria
- [ ] Reachable from Profile within two taps on iOS, Android and web.
- [ ] A confirmation step exists; the action cannot be triggered by accident.
- [ ] No profile data is put in URL query strings (privacy rule). The interim web hand-off opens the blank form.
- [ ] Copy is in `messages.ts` → `ACCOUNT_DELETION_MESSAGES`.

## 6. Unknowns
- [U] Retention rules (billing records usually must be kept).
- [U] Whether deletion is immediate or staff-reviewed.
- [U] Confirmation e-mail.
