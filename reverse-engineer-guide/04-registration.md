# Module 04 — Registration (New Member Profile)

## 1. Purpose
Create a member profile billed either to a **corporate account** (activated immediately and auto-logged-in) or to a **credit card** (queued for customer-service approval).

## 2. Access
Anonymous. Page `GET /Registration/Index`. Single form posted to `POST /Registration/Index` twice: once after the billing step (server validates account) and once at the end (creates the profile).

## 3. Steps (logical order)
| Step (`hfactive`) | Content | Server call on "Next" |
|---|---|---|
| 0 | Billing info + captcha | `POST /Registration/Index` (validate billing / account) |
| 1 | Personal info | none (client validation only) |
| 2 | Mailing address | `POST /Registration/Index` (create profile) |
| 3 | Confirmation | — |

## 4. Data model (all fields are posted together)

### 4.1 Billing (step 0)
| Field | Type | Required | Rules / values |
|---|---|---|---|
| `rbAccount` | enum | yes | `True` corporate account (default), `False` credit card |
| `CompanyAccountNo` | string ≤10 | if corporate | letters/digits/space |
| `CompanyName` | string ≤50 | if corporate | no `"`; must match account (see 5.2) |
| `VIPNumber` | string ≤10 | no | digits |
| `CardType` | enum | if card | `2` Visa (default), `1` MC, `0` AmEx, `5` Discover, `3` Diners |
| `CardHolderName` | string ≤30 | if card | ≥2 chars, letters/space/`.`/`'` |
| `CardNo` | string ≤16 | if card | brand regex + Luhn (module 26 §3) |
| `ExpiryDate` | string `MM/YY` | if card | ≥ current month |
| `IsSubscribed` | bool | no | subscribe to special offers |
| `hfisrequirement` | `0`/`1` | — | 1 when account-requirement fields are present |
| account requirement fields | dynamic | per account | rendered by server (`reqhtml`), validated by server-supplied script `verifyRequirements()` |
| `g-recaptcha-response` | string | yes | |
| `hfactive` | int | — | current step |

### 4.2 Personal info (step 1)
| Field | Type | Required | Rules |
|---|---|---|---|
| `Email` | string ≤50 | yes | e-mail; unique (5.1) |
| `ConfirmEmail` | string | yes | equals Email (case-insensitive) |
| `Password` / `ConfirmPassword` | string 4–10 | yes | no `'` `"`; equal |
| `FirstName` | string ≤15 | no | no digits / `"` |
| `LastName` | string ≤20 | yes | ≥2 chars, no digits / `"` |
| `PhoneUS`, `ExtUS` | 10 digits / ≤5 digits | one phone required | US phone cannot start with 0/1 |
| `PhoneIntAreaCode`, `PhoneInt`, `ExtInt` | digits ≤10 / ≤20 / ≤5 | " | code ≥3, number ≥4, code+number ≥7, both-or-neither |
| `FaxAreaCode`, `Fax` | digits ≤10 / ≤18 | no | both-or-neither |
| `chkPhone` | bool | — | confirmation by phone (default true) |

Rule: at least one callback phone (US, or complete international).

### 4.3 Mailing address (step 2)
| Field | Type | Required | Rules |
|---|---|---|---|
| `Country` + `CountryCode` | string ≤30 + code | yes | from `GetCountries` (must pick) |
| `State` + `StateCode` | string ≤30 + code | yes | from `GetStates` (must pick) |
| `City` (+ `CityCode`) | string ≤30 | yes | `GetCities` suggestions; free text allowed |
| `Zip` | 5 digits | yes | |
| `BuildingNo` | digits ≤6 | yes | |
| `StreetName1` | string ≤30 | yes | street chars, ≥4; `GetStreets` suggestions |
| `StreetName2` | string ≤20 | no | street chars |
| `ApartementNo` | string ≤20 | no | no `"` |
| `AddressPhoneUS`, `AddressPhoneIntAreaCode`, `AddressPhoneInt` | as phones | one required | defaults copied from callback phones |
| `IsOfficeAddress` | bool | yes | `True` office (default) / `False` home |

## 5. API

### 5.1 `POST /Base/VerifyUser` — e-mail already registered? [C]
Trigger: e-mail field loses focus. Request: `Email=<value>`.
Response: `{"success":true,"error":"<message>"}` ⇒ **e-mail already exists** (show error); `{"success":false}` ⇒ available.

### 5.2 `POST /Base/VerifyCompanyName` — account # ↔ name [C]
Trigger: company name changed (both account # and name present). Request: `AccountNumber, CompanyName`.
Response: `{"success":true,"error":"<message>"}` ⇒ **mismatch**; `{"success":false}` ⇒ OK.

### 5.3 `POST /Registration/Index` — step 0 (billing) and step 2 (create) [C]
Request: entire form (fields of §4) with `hfactive=0` or `hfactive=2`.

| Response | Meaning | Next |
|---|---|---|
| `{"success":false,"error":"<msg>"}` | validation failure | show error |
| `{"success":false,"NextStep":"1"}` | billing accepted | go to step 1 |
| `{"success":false,"reqhtml":"<html>","reqhtmlscript":"<script>","message":"<msg>"}` | corporate account requires extra fields | lock account #, render requirement fields, set `hfisrequirement=1`, resubmit |
| `{"success":true,"IsCC":"1"}` | credit-card profile created as **pending** | show "Your request for a new profile is being processed by customer service. A customer service representative will contact you as soon as possible." |
| HTML (authenticated header) | corporate profile created + **logged in** | show "Your registration is complete! Now you can make reservation on-line." with links to new reservation and member home |

### 5.4 Lookups
`Base/GetCountries`, `GetStates`, `GetCities`, `GetStreets` — module 05.

## 6. Errors & messages
"Fields marked with * are required fields." · "Please select captcha." · "Invalid email address." · "Confirm Email must match with Email." · "Please enter at least one Callback Phone number." · "Please enter International Phone number" · "Please enter International Phone Country+City Code." · "Please enter at least one Address Phone number." · "Company name contains invalid character(s)." · plus field messages in module 26.

## 7. Revamp notes
- Endpoints: `GET /users/exists?email=`, `POST /corporate-accounts/verify {accountNo, name}` → `{valid, requirements[]}`, `POST /registrations`.
- Store account requirement definitions as data (label, type, required, regex) instead of server-generated HTML/JS.
- Credit-card registrations → `status=PendingApproval` + notify customer service. Tokenise cards.
- **Unknown**: exact server error strings; requirement field definitions per account.
