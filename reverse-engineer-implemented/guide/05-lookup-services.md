> ✅ **Implemented** in the XYZ app
>
> ✅ **Migrated to real gateway data** (2026-11-03): the module's action codes are mapped by heading from the gateway's real responses. Each code's real answer, and any code not yet answered or confirmed, is in §7 Gateway (real data).

# Module 05 — Lookup & Geo Services

Reference-data and validation endpoints used by registration, profile, address book, contacts and the booking flow. All are `POST`, form-urlencoded, return JSON. Responses below are **real** (captured 2026-10-15) unless tagged [C].

Common behaviour: client does not call when the search text is blank; top-N is `maxResults=10`; ".NET DAL" placeholder properties (`CountryDAL:{}` etc.) are always empty and can be ignored.

## 1. Geography

### 1.1 `POST /Base/GetCountries` (anonymous) [O]
Request `searchText, maxResults` → 
```json
[{"CountryDAL":{},"CountryId":0,"CountryCode":"01","CountryName":"United States"}]
```
Usage: label/value = `CountryName`, id = `CountryCode` → stored as `CountryCode`. Must select from list.

### 1.2 `POST /Base/GetStates` (anonymous) [O]
Request `searchText, maxResults` →
```json
[{"StateDAL":{},"StateId":0,"StateCode":"NH","StateName":"New Hampshire"},
 {"StateDAL":{},"StateId":0,"StateCode":"NJ","StateName":"New Jersey"},
 {"StateDAL":{},"StateId":0,"StateCode":"LC","StateName":"New York City"}]
```
Note: New York State is returned as `"NY State"` in other payloads; NYC is a pseudo-state `LC`.

### 1.3 `POST /Base/GetCities` (anonymous) [O]
Request `stateCode` (state code **or** state display text, e.g. `NY` or `New Jersey`), `searchText`, `maxResults` →
```json
[{"CityDAL":{},"CityId":985,"StateCode":"","CityName":"Bronx"},
 {"CityDAL":{},"CityId":986,"StateCode":"","CityName":"Brooklyn"}]
```
`stateCode=New York` → server error (302 /Misc/Error). City is free text if no match.

### 1.4 `POST /Base/GetStreets` (anonymous) [O]
Request `stateCode, city, streetPrefix, maxResults` →
```json
[{"StreetName":"Flatbush Ave","StreetId":816},{"StreetName":"Flatbush Ext","StreetId":817}]
```

### 1.5 `POST /Base/GetCrossStreets` (anonymous) [O]
Request `stateCode, city, street, crossStreetPrefix, maxResults` →
```json
[{"StreetName":"ATLANTIC AVE","StreetId":0}]
```
Only streets intersecting `street` are returned.

## 2. Travel points (member)

### 2.1 `POST /Base/GetAirports` (pickup) / `POST /Base/GetAirportsDrop` (drop-off) [O]
Request `searchText, maxResults, statename` (state filter; empty = all) →
```json
[{"AirportDAL":{},"AirportId":0,"StateCode":"NY","AirportCode":"JFK","AirportName":"John F. Kennedy",
  "AirportDetail":"JFK, John F. Kennedy","StateName":"NY State"}]
```
Usage: label/value = `AirportDetail`, id = `AirportCode`, `stname` = `StateName` (fills airport state).

### 2.2 `POST /Base/GetAirlines` [O]
Request `searchText, maxResults` →
```json
[{"AirlineDAL":{},"AirlineId":0,"AirlineName":"Delta"},{"AirlineDAL":{},"AirlineId":0,"AirlineName":"Delta Term 4"}]
```
Note: airline list includes terminal-specific entries ("Delta Term 4").

### 2.3 `POST /Base/GetLandMark` [O]
Request `city, searchText, maxResults` →
```json
[{"LandmarkDAL":{},"LandmarkId":0,"StateCode":"NY","City":"MANHATTAN","LandmarkName":"EMPIRE HOTEL",
  "PickupPoint1":"ON W 63 ST","PickupPoint2":"","PickupPoint3":"","PickupPoint4":"",
  "CrossStreet1":"BROADWAY","CrossStreet2":"","AreaName":"","Directions":""}]
```
On select: fills landmark name, cross street 1/2, directions, area name (drop-off); if >1 non-empty pickup points, offers them as a choice; else uses PickupPoint1.

## 3. Member data lookups

### 3.1 `POST /Base/GetPickupAddresses` / `POST /Base/GetDropAddresses` [O]
Request `maxResults`. Returns the member's saved addresses **plus synthetic entries** (same object shape as address book, module 11):

Observed order (pickup list):
```
-10  Click here to Select Location        (placeholder)
-9   -------------                         (separator)
-8   John F. Kennedy International Airport
-7   LaGuardia Airport
-6   Newark International Airport
-5   -------------
1,2  most-used addresses ("Frequent")
3    -------------
4…n  all saved addresses
```
Drop-off list is the same but starts with `-99999` placeholder, `-99998` separator, **`-9999` As directed** (no fixed destination).

| AddressId | Meaning |
|---|---|
| `-10` / `-99999` | placeholder |
| `-9`, `-5`, `-99998`, separator rows | `"-------------------------------------------"` — not selectable |
| `-8` / `-7` / `-6` | JFK / LGA / EWR shortcut (client sets airport tab + fixed coordinates: JFK 40.643772,−73.781993; LGA 40.77392,−73.872002; EWR 40.706467,−74.161858) |
| `-9999` | As directed (drop-off) |
| `>0` | list position of a saved address; resolved server-side by `GetAddressInfo(addressid)` **[I: ids are list positions, the server maps them to the stored address]** |

Item shape:
```json
{"FavoriteAddressDAL":{},"AddressId":1,"LoginId":"","Country":"01","State":"NY","City":"MANHATTAN","Zip":"",
 "BuildingNo":"","StreetName":"W 41 ST","CrossStreet":"…","PickUpPoint":"…","PhoneUS":"…","ExtUS":"",
 "PhoneInt":"…","PhoneIntAreaCode":null,"ExtInt":"","Directions":"","ListFA":null,
 "ShortAddress":" W 41 ST, MANHATTAN, NY","Latitude":"","Longitude":""}
```

### 3.2 `POST /Base/GetAddressInfo` [O]
Request `addressid` →
```json
{"fa":{ …address object as above… },"CountryName":"United States","StateName":"NY State"}
```

### 3.3 `POST /Base/GetPhoneList` / `POST /Base/GetEmailList` [O]
Request `maxResults` → `[]` when the member has no additional contacts. Item shapes [C]: phones `{CompleteContactNumber:"<number>-<ext>", ContactTypeId}`; e-mails `{ContactNumber:"<email>", ContactTypeId}`. `ContactTypeId ≤ 0` = "none" entry.

### 3.4 `POST /Base/GetContactType` [O]
```json
[{"Key":"3","Value":"Home Phone"},{"Key":"4","Value":"Office Phone"},{"Key":"5","Value":"Fax"},
 {"Key":"6","Value":"Cell Phone"},{"Key":"8","Value":"Email"}]
```

## 4. Zone (service-area) checks

### 4.1 `POST /Base/FindAddressZone` [O]
Request:
| Param | Value |
|---|---|
| `country`, `state`, `city` | address parts |
| `streetno`, `streetname` | street tab |
| `landmark` | landmark tab |
| `airport` | airport tab |
| `ispickup` | true/false |
| `isairport` | true/false |
| `type` | always `0` (client bug — intended 1 street / 2 airport / 3 landmark) |

Response: `{"success":true}` = address matched a dispatch zone; `{"success":false,"error":"yes"}` = **no zone match** → warning "We could not match your PICKUP / DROP OFF location with our system. It can cause delay in the processing your request." + mandatory acknowledgement checkbox.

⚠ Production defect: the client sends this with `ype:"Post"` (typo) → jQuery defaults to **GET** → server rejects GET (302 /Misc/Error) → warning never shown. Endpoint works when called with POST (verified).

### 4.2 `POST /Base/FindZoneByZip` [O]
Request `zip, latitude, longitude, ispickup, isairport` → `{"success":true}` or `{"success":false,"error":"yes"}` (same meaning). Same GET-typo defect.

### 4.3 State gate (client) [C]
After a Google Places pick or saved-address pick, the state must be in the service-area list (module 01 §8). Otherwise booking cannot proceed and the message is: "You must call XYZ on 929-XYZLimo to make special arrangements for this pickup / drop off / pickup and drop off address."

## 5. Google Maps / Places [C]
Booking uses Google Maps JS v3.17 + Places Autocomplete on the pickup/drop-off search fields; map defaults to NYC (40.7143528, −74.0059731). Place → field mapping is in module 15.

## 6. Revamp notes
Expose as REST: `GET /geo/countries?q=`, `/geo/states?q=`, `/geo/cities?state=&q=`, `/geo/streets?state=&city=&q=`, `/geo/cross-streets?state=&city=&street=&q=`, `/airports?q=&state=`, `/airlines?q=`, `/landmarks?city=&q=`, `/me/addresses?purpose=pickup|dropoff`, `/me/contacts?type=`, `POST /zones/match`. Normalise state codes. Keep the synthetic entries (airports, As directed) as explicit options rather than fake ids.

## 7. Gateway (real data)

Checked against the live gateway on 2026-11-03 (`docs/XYZ_INTEGRATION_GUIDE.md` §7a, §10; status per code in `docs/XYZ Real Action Codes.md`). Every value is read by the one heading its code sends; an empty one shows "Not available", and a `"9"` answer shows the screen's own copy.

| Action code | When | Real answers |
|---|---|---|
| `RES.S.VEHICLE_TYPE` | Booking step 4 | `oevehiclecode, oevehicledesc`; 5 rows (`0` No Preference, `3` Sedan, `4` SUV, `H` Standard Wheelchair, `K` Premium Wheelchair). |
| `RES.S.GOOGLE_ZONE_NUM` | A Google stop with coordinates | `o_code, o_message`: always `"1"` + an 8-digit zone (`11215000`), also at 0,0 (`90000999`). Only `"0"` is a match today, so the stop goes to the acknowledgement. |
| `RES.S.ZONE_THE_LOCATION` | A saved / typed street stop | `["", ""]` for every input, the backend test client's sample included. |
| `RES.S.ALL_PREDEFINED_QUESTIONS` | Ask about this ride | `question_id, question`; 2 rows. |

- No action code exists for airports, airlines, streets or landmarks: stops come from Google Places.
