# Module 10 — Change Password

## 1. Purpose
Member changes password by supplying old and new password.

## 2. Access
Member. Load `GET /MemberArea/ChangePassword` [O]; save `POST /MemberArea/ChangePassword` [C].

## 3. Data model [O]

| Field | Type | Max | Required | Rules |
|---|---|---|---|---|
| `OldPassword` | password | 10 | yes | 4–10, no `'` `"` |
| `NewPassword` | password | 10 | yes | 4–10, no `'` `"` |
| `ConfirmPassword` | password | 10 | yes | must equal `NewPassword` (`data-val-equalto` "Password mismatch.") |

## 4. API

### `POST /MemberArea/ChangePassword` [C]
Request: `OldPassword=…&NewPassword=…&ConfirmPassword=…`
Response: JSON `message` (e.g. wrong old password) → show; else HTML (success).

## 5. Errors & messages
"Invalid Old Password." · "Old Password must be at least 4 characters long." · "Invalid New Password." · "New Password must be at least 4 characters long." · "Invalid Confirm Password." · "Confirm Password must be at least 4 characters long." · "Password mismatch."

## 6. Revamp notes
`POST /me/password {currentPassword,newPassword}`; stronger policy; invalidate other sessions; hash.
