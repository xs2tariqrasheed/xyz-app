> ✅ **Implemented** in the XYZ app (`/mailing-address`). Today it shows "not available", because `PROF.S.LOAD_PROFILE` sends no mailing-address headings (§7). Saving goes through `PROF.U.PROFILE` via `ProfileContext.updateMailingAddress`, and registration's address step uses the same validator.
>
> ✅ **Migrated to real gateway data** (2026-10-30): the module's action codes are mapped by heading from the gateway's real responses. Each code's real answer, and any code not yet answered or confirmed, is in §7 Gateway (real data).

# Module 08 — Profile: Update Billing / Mailing Address

## 1. Purpose
Member updates the profile's mailing (billing) address and address phone. (Menu label "Change Billing Address", page title "Update Mailing Address".)

## 2. Access
Member. Load `GET /MemberArea/BillingAddress` [O]; save `POST /MemberArea/BillingAddress` [C].

## 3. Data model [O]

| Field | Type | Max | Required | Rules / source |
|---|---|---|---|---|
| `Country` | string | 30 | yes | `Base/GetCountries`, must pick |
| `CountryCode` | hidden | — | yes | e.g. `01` |
| `State` | string | 30 | yes | `Base/GetStates`, must pick |
| `StateCode` | hidden | — | yes | e.g. `NY` |
| `City` | string | 30 | yes | `Base/GetCities` |
| `CityCode` | hidden | — | no | usually empty |
| `Zip` | digits | 5 | yes | exactly 5 |
| `BuildingNo` | digits | 6 | yes | |
| `StreetName1` | string | 30 | yes | street chars, ≥4 (`Base/GetStreets`) |
| `StreetName2` | string | 30 | no | street chars |
| `ApartementNo` | string | 30 | no | no `"` (apt / mail stop) |
| `AddressPhoneUS` | digits | 10 | one phone required | US phone rule |
| `AddressPhoneIntAreaCode` | digits | 10 | with intl | ≥3 |
| `AddressPhoneInt` | digits | 20 | with code | ≥4 |
| `IsOfficeAddress` | bool | — | yes | `True` office / `False` home |

## 4. API

### `POST /MemberArea/BillingAddress` [C]
Request: all fields above, form-urlencoded.
Response: JSON with non-empty `message` → show; otherwise HTML page (success).

## 5. Errors & messages
"Fields marked with * are required fields." · "Please enter at least one Address Phone number." · "Please enter at least one Address Phone International number." · "Please enter at least one Address Phone International Country+City Code.." · "Invalid zip code." · "Zip Code contains invalid character(s)." · "Street Name contains invalid character(s)." · "Invalid Street Name specified." · "Invalid apartment # specified."

## 6. Revamp notes
`GET/PUT /me/profile/mailing-address`. Note field length differences vs registration (StreetName2/Apt 20 at registration, 30 here) — standardise.

## 7. Gateway (real data)

Checked against the live gateway on 2026-10-30 (`docs/XYZ_INTEGRATION_GUIDE.md` §7, §10). Re-probed on 2026-11-03: each row now has one value per heading, and the headings were renamed (guide §10). The app reads the new names since the same day.

| Action code | Real answers |
|---|---|
| `PROF.S.LOAD_PROFILE` | Now sends the mailing address under its own headings: `ocountry` (code, `01`), `ostate`, `ocity`, `ozip`, `obuildingnum`, `ostreetname`, `ocrossstreet1`, `ocrossstreet2`, `oaddressphoneus`, `oaddressphone`, `oaddresstype`. The screen shows them; "not available" only when every address value is empty. |
| `PROF.S.USER_PROFILE_ADDRESSES` | Headings renamed to lower case (`ocountry`, …). It is the profile's frequent-pickup list (17 rows for the test login), not one mailing address, so it isn't used here. |
| `PROF.U.PROFILE` | Not sent yet (it writes a real profile). The app no longer refuses it before sending. |

Value codes follow the backend test client (`P_COUNTRY` `01`, `P_ADDRESS_TYPE` `HOME`). Client rules: ZIP 5 digits, building # ≤ 6 digits, street 4–30 street characters, Apt # with no `"`, and at least one address phone.

**Still unverified:**
- The office `P_ADDRESS_TYPE` code (the app sends `O`) and non-US `P_COUNTRY` codes.
- Where Apt # / Mail stop goes: the app uses `P_CROSS_STREET2`, which the test client fills with a second cross street.
