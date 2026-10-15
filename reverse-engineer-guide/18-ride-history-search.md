# Module 18 — Ride History Search ("Previous orders")

## 1. Purpose
Member searches past and recent reservations by date range and payment method and opens details, vouchers or feedback.

## 2. Access
Member. Load `GET /MemberArea/RideSearch` [O]; search `POST /MemberArea/RideSearch` [O — read-only query executed].

## 3. Data model [O]

| Field | Type | Required | Rules |
|---|---|---|---|
| `txtFromDate` | date `MM/DD/YYYY` | yes | min = today − 3 months; max = today |
| `txtToDate` | date `MM/DD/YYYY` | yes | ≥ from date; max = today + 3 months |
| `ddlPaymentMethod` | enum | yes | `a` All (default) · `c` Credit Card · `v` Voucher |

Defaults on load: from = today − 3 months, to = today.

## 4. API

### `POST /MemberArea/RideSearch` [O]
Request: `txtFromDate=07/15/2026&txtToDate=10/15/2026&ddlPaymentMethod=a`

| Response | Meaning |
|---|---|
| HTML page with result grid | results found |
| `{"success":false,"message":"No reservation(s) found in selected date range."}` | none |

### Sorting [O]
`GET /MemberArea/RideSearch?sort={key}&sortdir=ASC|DESC` → grid partial. Keys: `ReservationID`, `PassengerName`, `RideDate`, `PickupShortAddress`, `DropShortAddress`, `CallStatus`, `CardNo`.

## 5. Data rendered — one row per ride [O]

| Column | Field key | Example (sanitised) |
|---|---|---|
| Ride No. | `ReservationID` | `NCS0263`, `W6091020269`, 10-digit numbers — link to details (module 20) |
| Passenger Name | `PassengerName` | `JOHN DOE` |
| Pickup Date | `RideDate` | `10/13/2026 2:57 pm` |
| Pickup Location | `PickupShortAddress` | `32 ADELE ST, STATEN ISLAND NY State` |
| Destination | `DropShortAddress` | `275 20TH STREET, BROOKLYN NY State` / airport name |
| Status | `CallStatus` | `Confirmed`, `Canceled`, `Billed` |
| Payment Method | `CardNo` | `Credit Card` / `Voucher` |
| Voucher | — | for billed voucher rides: link "View Voucher" → `/MemberArea/ImageLoader?rideno=<voucher#>&ImageID=&ImagePath=` (module 23) |
| Actions | — | empty for past rides [O]; open-ride actions in module 19 |
| Feedback | — | link `https://www.xyzcar.com/rate-a-ride/?rideno=<ride no>` (module 24) |

Observed: 19 rides for a 3-month window, no paging needed **[paging behaviour U]**.

## 6. Revamp notes
`GET /me/reservations?from=&to=&payment=all|card|voucher&sort=&dir=` → `{items:[{rideNo, passengerName, pickupAt, pickupShort, dropShort, status, paymentMethod, voucherAvailable}], total}`. Enforce the 3-month back / forward window server-side if business requires.
