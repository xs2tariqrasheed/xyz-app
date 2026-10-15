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
