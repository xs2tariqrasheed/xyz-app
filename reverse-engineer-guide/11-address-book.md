> ✅ **Implemented** in the XYZ app

# Module 11 — Address Book ("My Addresses" / Addresses Maintenance)

## 1. Purpose
Member maintains favourite pickup/drop-off locations reused by booking (module 15) and express ride (module 06).

## 2. Access
Member. Single endpoint `/MemberArea/Addresses` with `mode` and `addressid` query parameters [O].

| Operation | Method & URL | Tag |
|---|---|---|
| List + empty add form | `GET /MemberArea/Addresses` | [O] |
| Load one address into form (edit) | `GET /MemberArea/Addresses?mode=2&addressid={id}` | [O] |
| Create | `POST /MemberArea/Addresses?mode=1&addressid=0` | [O form] |
| Update | `POST /MemberArea/Addresses?mode=2&addressid={id}` | [O form] |
| Delete | `GET /MemberArea/Addresses?mode=3&addressid={id}` | [O link — not executed] |
| Cancel edit (reload list) | `POST /MemberArea/Addresses` (no body) | [C] |
| Sort list | `GET /MemberArea/Addresses?sort={PhoneUS\|PhoneInt}&sortdir={ASC\|DESC}` → partial `#MainGrid` | [O] |

## 3. Data model [O]

| Field | Type | Max | Required | Rules |
|---|---|---|---|---|
| `Country` (+`CountryCode`) | string | — | yes | `GetCountries` |
| `State` (+`StateCode`) | string | — | yes | `GetStates` |
| `City` (+`CityCode`) | string | — | yes | `GetCities` |
| `Zip` | digits | 5 | no | exactly 5 if given |
| `BuildingNo` | digits | 6 | yes | |
| `StreetName` | string | 30 | yes | street chars, ≥4 (`GetStreets`) |
| `CrossStreet` | string | 30 | no | street chars, ≥4 (`GetCrossStreets`) |
| `PickUpPoint` | string | 20 | no | letters, digits, space `. , ~ & / - ( ) \ #` |
| `PhoneUS`, `ExtUS` | digits | 10 / 5 | one phone required | |
| `PhoneIntAreaCode`, `PhoneInt`, `ExtInt` | digits | 10 / 20 / 5 | " | |
| `Directions` | text | 500 | no | no `"` |

Stored object (as returned by `Base/GetAddressInfo`, module 05):
```json
{"AddressId":1,"Country":"01","State":"NY","City":"MANHATTAN","Zip":"","BuildingNo":"",
 "StreetName":"W 41 ST","CrossStreet":"N E CORNER 41 & 8TH AVE","PickUpPoint":"ON 41 STREET",
 "PhoneUS":"…","ExtUS":"","PhoneInt":"…","PhoneIntAreaCode":null,"ExtInt":"","Directions":"",
 "ShortAddress":" W 41 ST, MANHATTAN, NY","Latitude":"","Longitude":""}
```

## 4. API responses [C]
Create/Update: `{"success":…, "error":"<msg>"}` → show error; otherwise HTML (refreshed page with updated list).

## 5. Data rendered — list [O]
Grid columns: **Address** (ShortAddress, link → edit), **Phone #.(US)** (sortable), **Phone #.(International)** (sortable), **Actions** (Delete). Header text: "Your current saved locations (click on for update/delete)".

## 6. Booking integration
- Booking step 2 checkbox `AddPickupAddress` / `AddDropAddress` ("Add this address to my saved locations") saves a Google-validated street address into this book when the reservation is submitted [O field / I server].
- Lists in booking/express are ordered: frequent addresses, separator, all saved addresses.

## 7. Errors & messages
"Fields marked with * are required fields." · "Please enter at least one Callback Phone number." · "Please enter International Phone number" · "Please enter International Phone Country+City Code." · "Pickup Point contains invalid character(s)." · "Direction contains invalid character(s)." · street/zip messages (module 26).

## 8. Revamp notes
REST: `GET/POST /me/addresses`, `GET/PUT/DELETE /me/addresses/{id}`. Add geocode (lat/lng) on save (the legacy stores empty lat/lng). Replace GET-delete with DELETE + CSRF.
