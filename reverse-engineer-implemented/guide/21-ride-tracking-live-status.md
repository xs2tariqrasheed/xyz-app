> ✅ **Implemented** in the XYZ app
>
> ✅ **Migrated to real gateway data** (2026-11-03): the module's action codes are mapped by heading from the gateway's real responses. Each code's real answer, and any code not yet answered or confirmed, is in §6 Gateway (real data).

# Module 21 — Ride Tracking, Live Status & Ask a Question

## 1. Purpose
Show the vehicle's event log and route for a ride, the live status of an active ride, the car's location, and let the passenger send a question to dispatch.

## 2. Track Your Route [O]

### `GET /MemberArea/TrackYourRoute?rideno={rideNo}`
Returns a page with:
- **Route detail log** rows: `Ref#`, `Date`, `Time`, `Status`, `Longitude`, `Latitude`, `Map` (per-row popup `GET /MemberArea/TrackYourRoutePopup?index={Ref#}`).
- **Map data** embedded as an array of `[statusText, latitude, longitude]`, rendered as a driving route (Google Directions, start = first point, end = last, intermediate points = waypoints) with car markers and status pop-ups.
- When no vehicle log exists: "Vehicle log is not available against this ride." (array value `"1"`).

Observed status vocabulary (vehicle events):
`Driver accepted the call.` · `System checked car location.` · `Car is at the pickup location.` · `Car is circling around the block.` · `Passenger is in the car.` · `Passenger dropped off.`

Example row: `1 | 09/10/2026 | 12:39:09 PM | Driver accepted the call. | -74.0886 | 40.5913`.

App: Rides / Home / Receipts → Reservation detail → "Track your route" (every ride except cancelled). The interactive map shows the pickup (A) → drop-off (B) drive, the logged trail and, on an open ride with a car, the car (C) — located as the screen opens and again on Refresh.

## 3. Live status & locate car [C]
From open reservations (module 19): live-status window (`#divlivestatus`, refreshable) and "Locate Car" map dialog; content is server-rendered for the ride. Endpoint names are not exposed in static code **[U]**; the live-status panel embeds the Ask-a-Question view below.

## 4. Ask a Question [O page, C submit]

### `GET /MemberArea/AskQuestion` — panel
Data: `AskQuestion` select — `1` "How I can contact the driver?", `2` "Why vehicle is late?"; free text `taAdditionalMessage`; buttons Submit, Refresh, Close; link to cancel the ride; hidden `hfRideNumber`.

### `POST /MemberArea/AskQuestion` [C — not executed]
| Param | Rule |
|---|---|
| `rideno` | ride number |
| `questionid` | `1` or `2` |
| `message` | optional, ≤ 200 chars, letters/digits/space/`.` |

Response: `{"success":true}` → "Question inserted successfully."; `{"success":false}` → "Error occurred during insertion."
Validation messages: "Maximum length exceeded from 200 characters", "Additional Message contains invalid character(s)."

## 5. Revamp notes
- `GET /reservations/{rideNo}/events` → `[{seq, at, status, lat, lng}]`; render route client-side.
- `GET /reservations/{rideNo}/live` → `{status, carLocation:{lat,lng}, eta?}` (consider WebSocket/SSE).
- `POST /reservations/{rideNo}/questions {questionId, message}`; `GET /dispatch-questions`.

## 6. Gateway (real data)

Checked against the live gateway on 2026-11-03 (`docs/XYZ_INTEGRATION_GUIDE.md` §7a, §10; status per code in `docs/XYZ Real Action Codes.md`). Every value is read by the one heading its code sends; an empty one shows "Not available", and a `"9"` answer shows the screen's own copy.

| Action code | When | Real answers |
|---|---|---|
| `RES.S.VEHICLE_LOG` | Track your route | `oetrackingdate, oetrackingtime, oestatuscode, oestatusdesc, oelongitude, oelatitude`; 31 / 10 / 50 rows for three rides. |
| `RES.S.LATITUDE_LONGITUDE_FOR_CAR` | Car position | `"0"` / `Success` + `o_latitude, o_longitude` (may be blank); `"5"` / `No Data Found` = position unknown. |
| `RES.S.ALL_PREDEFINED_QUESTIONS` | Ask about this ride | `question_id, question`; the local fallback list is removed. |
| `RES.I.ASKED_QUESTIONS` | Send | `"0"` / `Success` = sent. It doesn't show in `COMMUNICATION_LOG` yet (database issue). |
