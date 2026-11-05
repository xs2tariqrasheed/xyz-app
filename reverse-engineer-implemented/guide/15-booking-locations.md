> ✅ **Implemented** in the XYZ app
>
> ✅ **Migrated to real gateway data** (2026-11-03): the module's action codes are mapped by heading from the gateway's real responses. Each code's real answer, and any code not yet answered or confirmed, is in §8 Gateway (real data).

# Module 15 — Booking Step 2: Pickup & Drop-off Locations

Part of the booking wizard (module 13). Submitted with `hfactive=1`. Lookups in module 05.

## 1. Purpose
Capture pickup and drop-off as one of three location types — **Street address**, **Airport**, **Landmark** — from (a) a Google Places search, (b) the member's saved locations, (c) airport shortcuts, or (d) "As directed" for drop-off; validate the service area/zone; optionally save the address.

## 2. Location type selector
`hfpickuptab` / `hfdroptab`: `0` street · `1` airport · `2` landmark. Set automatically from the chosen place (§4) or saved entry.

## 3. Data model [O]

### 3.1 Search / selection fields
| Field | Meaning |
|---|---|
| `pickupaddress` / `dropaddress` | search text or selected address label (paste disabled) |
| `pickupaddressid` / `dropaddressid` | selected saved-address id; `-9999` = drop-off "As directed"; empty for Google picks |
| `PickupAirport` + `airportid` / `DropAirport` + `dropairportid` | chosen airport (detail + code) |
| `pickupaddressland` / `dropaddressland` | landmark search text |
| `AddPickupAddress` / `AddDropAddress` | bool — "Add this address to my saved locations" (offered only for Google *street_address* results) |

### 3.2 Street address (tab 0)
| Pickup field | Drop-off field | Max | Notes |
|---|---|---|---|
| `StreetCountry` + `CountryCode`, `CountryName` | `StreetCountryDrop` + `CountryCodeDrop`, `CountryNameDrop` | 30 | |
| `StreetState` + `StateCode`, `StateName` | `StreetStateDrop` + `StateCodeDrop`, `StateNameDrop` | 30 | must be service-area state |
| `StreetCity` + `CityCode`, `CityName` | `StreetCityDrop` + `CityCodeDrop`, `CityNameDrop` | 30 | |
| `Zip` | `ZipDrop` | 5 | |
| `StreetNumber` | `StreetNumberDrop` | 6 | digits |
| `StreetName` | `StreetNameDrop` | 30 | street chars, ≥4 |
| `StreetCrossStreet` | `StreetCrossStreetDrop`, `StreetCrossStreet2Drop` | 30 | |
| `StreetPickupPoint` | — | 20 | pickup-point chars |
| `StreetDirection` | `StreetDirectionDrop` | 500 | driver instructions, no `"` |

### 3.3 Airport (tab 1)
| Pickup field | Drop-off field | Max | Required |
|---|---|---|---|
| `AirportCountry`, `AirportState` | `AirportCountryDrop`, `AirportStateDrop` | 30 | |
| `AirportsPickup` (airport name) | `AirportsDrop` | 30 | |
| `PickupAirline` + `airlineid` | `DropAirline` + `dropairlineid` | 30 | **pickup: yes** |
| `PickupFlightNo` | `DropFlightNo` | 20 | **pickup: yes**; letters/digits/space |
| `PickupArrivingFrom` | — | 30 | letters/digits/space |
| `PickupOption` + `pickupoptionid` | — | 30 | **pickup: yes** — `C` Outside the terminal · `D` Inside the terminal (meet & greet surcharge: "Additional meet & greet charges will apply.") · `B` On Demand, Ready Now · `A` Outside, Standby |
| — | `TerminalNo` | 30 | letters/digits/space |
| — | `AirportCityDrop` (destination city) | 30 | |
| `AirportDirection` | `AirportDirectionDrop` | 500 | no `"` |

### 3.4 Landmark (tab 2)
| Pickup field | Drop-off field | Max |
|---|---|---|
| `LandCountry`, `LandState`, `LandCity` | `LandCountryDrop`, `LandStateDrop`, `LandCityDrop` | 30 |
| `PickupLandmark` | `DropLandmark` | 60 (≥4 for zone check) |
| `LandCrossStreet`, `LandCrossStreet2` | `LandCrossStreetDrop`, `LandCrossStreet2Drop` | 30 |
| `LandPickupPoint` | `AreaName` | 20 / 10 |
| `LandDirection` | `LandDirectionDrop` | 500 |

### 3.5 Geo / validation state (hidden)
`hfLatitude`, `hfLongitude`, `hfLatitudeDrop`, `hfLongitudeDrop`, `hfIsMapError`, `hfIsMapErrorDrop`, `hfAddressType`, `hfIsValidAddress`.

## 4. Behaviour

### 4.1 Google Places pick [C]
Place → fields: `country` (US → "United States"), `administrative_area_level_1` (NY → "New York"), `locality` (fallback `sublocality`/`sublocality_level_1`), `postal_code`, `street_number` (dash removed), `route`, airport name (`establishment`/`point_of_interest` when type is airport, else place name), landmark name (`establishment`, `premise`, `subpremise`, `parking`, `point_of_interest`, `train_station`, `park`, `natural_feature`, else place name; truncated to 60). Lat/lng from geometry.
Type decision: `airport` (or name matches the regional-airport list) → tab 1; `street_address` → tab 0 (+ offer "save"); anything else → tab 2.

### 4.2 Saved location pick [O/C]
`Base/GetPickupAddresses` / `Base/GetDropAddresses` list → selecting id > 0 calls `Base/GetAddressInfo(addressid)` and fills the street tab (country, state, city, zip, number, street, cross street, pickup point, directions); then zone check + geocode. Ids `-8/-7/-6` = JFK / LGA / EWR (airport tab, fixed coordinates). `-9999` = As directed (drop-off fields disabled and cleared).

### 4.3 Service-area gate [C]
State must be NY, NJ, CT, PA, VA, MD, DC (full or abbreviated). Otherwise Next is blocked with: "You must call XYZ on 929-XYZLimo to make special arrangements for this pickup address." (or "drop off address", or "pickup and drop off address").

### 4.4 Address validity [C]
If the typed text matches neither a Google prediction nor a saved address: `hfIsMapError=1` and notice "We are sorry we could not validate this PICKUP adddress. This address will be validated by the dispatcher at XYZ. Please click the checkbox if you want to proceed?" — acknowledgement `chkConfirmInvalid` required.

### 4.5 Zone check [C]
`POST /Base/FindAddressZone` (street number/name blur, landmark select, saved pick) and `POST /Base/FindZoneByZip` (after Google pick). `{success:false,error:"yes"}` → notice "We could not match your PICKUP / DROP OFF location with our system. It can cause delay in the processing your request. Please click the checkbox if you want to proceed?" + acknowledgement `chkConfirmPickup`. (Broken in production — module 05 §4.)

### 4.6 Special rules [C]
- MetLife Stadium in pickup or drop-off → refused: "For Metlife Stadium jobs, please call customer service at 929-999-5466."
- Pickup required: "Please enter or select the pickup address."
- Airport pickup requires airline, flight #, pickup option.

## 5. API used in this step
`Base/GetPickupAddresses`, `Base/GetDropAddresses`, `Base/GetAddressInfo`, `Base/GetCountries`, `Base/GetStates`, `Base/GetCities`, `Base/GetStreets`, `Base/GetCrossStreets`, `Base/GetAirports`, `Base/GetAirportsDrop`, `Base/GetAirlines`, `Base/GetLandMark`, `Base/FindAddressZone`, `Base/FindZoneByZip`, Google Places — all in module 05. Step submit `POST /Reservation/Index` (`hfactive=1`) — module 13; on success returns the price estimate and billing requirements.

## 6. Errors & messages
Above plus field validators: "Invalid Pickup FlightNo. Please enter only alpha numeric characters.", "Invalid Pickup Airline specified.", "Pickup Airline contains invalid character(s).", "Invalid Terminal No. …", "Street Direction contains invalid character(s).", "Airport Direction contains invalid character(s).", "Pickup Landmark contains invalid character(s).".

## 7. Revamp notes
Location model: `{kind: street|airport|landmark|asDirected, savedAddressId?, country, state, city, zip, streetNo, street, crossStreet1, crossStreet2, pickupPoint, areaName, airportCode, airline, flightNo, arrivingFrom, terminal, meetOption: C|D|B|A, landmarkName, directions, lat, lng, validated: bool, zoneMatched: bool, saveToAddressBook: bool}` for both pickup and drop-off. Server must re-check service area, zone and MetLife rule.

## 8. Gateway (real data)

Checked against the live gateway on 2026-11-03 (`docs/XYZ_INTEGRATION_GUIDE.md` §7a, §10; status per code in `docs/XYZ Real Action Codes.md`). Every value is read by the one heading its code sends; an empty one shows "Not available", and a `"9"` answer shows the screen's own copy.

| Action code | When | Real answers |
|---|---|---|
| `RES.S.GOOGLE_ZONE_NUM` | Google stop | Always `"1"` + zone; only `"0"` is a match today. |
| `RES.S.ZONE_THE_LOCATION` | Saved / typed street | `["", ""]` for every input. |
| `RES.S.LOAD_RESERVATION` | Editing a ride | Stops read from `opu*` / `odo*`; the kind from `oputype` / `odotype` (`1` street, `2` airport, `3` landmark). Airline / flight / terminal are read only for an airport drop-off: on street rides those headings carry address text (backend issue). |

- `P_PU_ADDRESS_ADD` / `P_DO_ADDRESS_ADD` go out as `N`, as every stored ride carries; the Google subpremise is no longer sent there.
