> ✅ **Implemented** in the XYZ app (`/profile` → Personal Info: `PROF.S.LOAD_PROFILE` + `PROF.U.PROFILE` via `ProfileContext`)

# Module 07 — Profile: Update Personal Information

## 1. Purpose
Member edits name, callback phones and fax. **E-mail (login) is not editable here.**

## 2. Access
Member. Load: `GET /MemberArea/PersonalInfo` (form pre-filled from profile) [O]. Save: `POST /MemberArea/PersonalInfo` [O form, C handler].

## 3. Data model [O]

| Field | Type | Max | Required | Rules |
|---|---|---|---|---|
| `FirstName` | string | 15 | no | no digits, no `"` |
| `LastName` | string | 20 | yes | ≥2 chars, no digits/`"` |
| `PhoneUS` | digits | 10 | one phone required | 10 digits, first digit not 0/1 |
| `ExtUS` | digits | 5 | no | |
| `PhoneIntAreaCode` | digits | 10 | with `PhoneInt` | ≥3 |
| `PhoneInt` | digits | 20 | with code | ≥4; code+number ≥7 |
| `ExtInt` | digits | 5 | no | |
| `FaxAreaCode` | digits | 10 | with `Fax` | ≥3 |
| `Fax` | digits | 18 | with code | ≥7 |

Rule: at least one callback phone — US, or complete international (code + number).

## 4. API

### `POST /MemberArea/PersonalInfo` [C]
Request:
```
FirstName=JOHN&LastName=DOE&PhoneUS=2125550100&ExtUS=&PhoneIntAreaCode=&PhoneInt=&ExtInt=&FaxAreaCode=&Fax=
```
Response handling:
| Response | Action |
|---|---|
| JSON with non-empty `message` | show message (validation error or success text) |
| HTML (no `message`) | updated page replaces content (success) |

## 5. Data rendered
Pre-filled current values of all fields above.

## 6. Errors & messages
"Please enter at least one Callback Phone number." · "Please enter International Phone number" · "Please enter International Phone Country+City Code." · "Invalid Callback Phone (US). Please enter your Callback Phone (US) with area code first and without any dashes." · "First Name contains invalid character(s)." · "Invalid Last Name specified." · "Last Name contains invalid character(s)." · Fax: "Invalid Fax. …".

## 7. Revamp notes
`GET /me/profile` → `{firstName,lastName,email,phones:{us,usExt,intlCode,intl,intlExt},fax:{code,number}}`; `PUT /me/profile/personal`. Server success message text **[U]**.
