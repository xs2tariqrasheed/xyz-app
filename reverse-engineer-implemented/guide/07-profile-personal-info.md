> ✅ **Implemented** in the XYZ app (`/profile` → Personal Info: `PROF.S.LOAD_PROFILE` + `PROF.U.PROFILE` via `ProfileContext`)
>
> ✅ **Migrated to real gateway data** (2026-10-30): the module's action codes are mapped by heading from the gateway's real responses. Each code's real answer, and any code not yet answered or confirmed, is in §8 Gateway (real data).

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

## 8. Gateway (real data)

Checked against the live gateway on 2026-10-30 (`docs/XYZ_INTEGRATION_GUIDE.md` §7, §10). Re-probed on 2026-11-03: each row now has one value per heading, and the headings were renamed (guide §10). **The app still reads the old heading names**, so these codes fail closed with the screen's load error until the module is remapped.

| Action code | When | Real answers |
|---|---|---|
| `PROF.S.LOAD_PROFILE` | Profile opens | 44 headings = 44 values. The form's fields: `ofirstname`, `olastname`, `ophonenumberus` / `ophoneextus`, `ophonenumber` / `ophoneext` (international), `ofax`. There is no separate dial-code or fax-extension heading. `opassword` and `ocardnumber` are sensitive: never shown. |
| `PROF.U.PROFILE` | Update | Not sent yet (it writes a real profile). The app no longer refuses it before sending. |

Value codes follow the backend test client's update sample (`P_COUNTRY` `01`, `P_ADDRESS_TYPE` `HOME`, `P_PAYMENT_TYPE` `1`). Client rules are in §3: first name ≤ 15 with no digits or `"`; last name 2–20 with no digits or `"`; US phone 10 digits, not starting with 0 or 1; extensions ≤ 5 digits; international and fax numbers ≥ 7 digits with the calling code; at least one callback phone.

**Still unverified:**
- What `PROF.U.PROFILE` answers (`"0"` = saved is assumed, `TODO(schema-unverified)`), and whether it keeps the parameters the app leaves out (password, address, card, preferences) unchanged.
- The server's success message text.
