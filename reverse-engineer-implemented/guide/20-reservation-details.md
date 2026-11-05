> ✅ **Implemented** in the XYZ app
>
> ✅ **Migrated to real gateway data** (2026-11-03): the module's action codes are mapped by heading from the gateway's real responses. Each code's real answer, and any code not yet answered or confirmed, is in §6 Gateway (real data).

# Module 20 — Reservation / Ride Details

## 1. Purpose
Show the complete record of one reservation: passenger & timing, pickup & destination, billing, driver & vehicle, preferences, itemised call charges; entry to voucher, route tracking and cancellation.

## 2. Access
Member. `GET /MemberArea/ReservationInfo?rideno={rideNo}` [O] (from ride history, open reservations). Plain `GET /MemberArea/ReservationInfo` without `rideno` → error page.

## 3. Data rendered [O] (field labels as returned; example values sanitised)

### Header
| Field | Example |
|---|---|
| Reservation # | `6081912876` / `W6091020269` |
| Voucher # | `6081912876` (empty until billed) |

### Passenger Name & Ride Info
| Field | Example |
|---|---|
| First Name / Last Name | `JOHN` / `DOE` |
| Originate Date / Originate Time | `08/19/2026` / `01:40 PM` (when booked) |
| Ride Date / Ride Time | `8/19/2026` / `2:20 pm` |
| Operator Name | dispatcher name or `Website` (booked online) |
| Status | `Confirmed` · `Canceled` · `Billed` |

### Pickup Address / Destination Address (same structure each)
Country · City, State · St.# and Name · Cross Street1 · Cross Street2 · Pickup Point

### Billing Info
Voucher Number · Invoice Number · Approval Date · Transaction Date · Transaction Amt · Payment Method (`Voucher` / `Credit Card`) · Account # (with `VIP # : …`)

### Driver & Vehicle Info
Car Number · Driver Name · Car Color · Driver Number · Car Model · Car Type (e.g. `No Preference`)

### Preferences
Confirmation By (`None` / phone) · Callback Phone (US) · International Phone · No. of Passengers · No. of Stops · Email (with mail-to)

### Call Charges (all money, 2 decimals) [O]
Fare · Phone Usage · Tolls / Parking · Package · Tips · Additional Passenger · Waiting Time · Misc · Stops · Taxes · Stop Waiting Time · State Sales Tax · Service Charge · NYS Surcharge · **Total Call Charges** (e.g. `$170.96`).
Example (billed ride): Fare 110.00, Tolls/Parking 15.75, Waiting 3.00, Stops 20.00, State Sales Tax 16.15, Service Charge 3.00, NYS Surcharge 3.06 → Total $170.96. Confirmed (not yet billed) rides also show estimated charges (e.g. Fare 78.00 → Total $90.01).

### Other
Reason (cancellation reason, when cancelled).

## 4. Actions [O]
| Action | Target |
|---|---|
| View Voucher (billed voucher rides) | `/MemberArea/ImageLoader?rideno=<voucher#>` (module 23) |
| Track Your Route | `/MemberArea/TrackYourRoute?rideno=<ride no>` (module 21) |
| Back | `/MemberArea/BackToURL` → returns to the originating list (observed → `/MemberArea/Index`) |
| Cancel (open rides) | cancel dialog → `POST /MemberArea/CancelReservation` (module 19); page form `frmReservationInfo` → `POST /MemberArea/ReservationInfo` with `hfRideNo`, `hfFrom`, `txtReason`; response `{success:false,message}` or HTML |
| Create return/repeat trip | module 22 |

## 5. Revamp notes
`GET /reservations/{rideNo}` → 
```json
{"rideNo":"","voucherNo":"","status":"CONFIRMED|CANCELED|BILLED","createdAt":"","createdBy":"Website",
 "passenger":{"firstName":"","lastName":""},"pickupAt":"",
 "pickup":{"country":"","city":"","state":"","street":"","cross1":"","cross2":"","pickupPoint":""},
 "dropoff":{…},
 "billing":{"paymentMethod":"VOUCHER|CARD","accountNo":"","vip":"","voucherNo":"","invoiceNo":"","approvalDate":null,"transactionDate":null,"transactionAmount":null},
 "driver":{"name":"","number":"","carNumber":"","carModel":"","carColor":""},"carType":"",
 "preferences":{"confirmBy":"","callbackPhone":"","intlPhone":"","email":"","passengers":1,"stops":0},
 "charges":{"fare":0,"phoneUsage":0,"tollsParking":0,"package":0,"tips":0,"additionalPassenger":0,"waitingTime":0,"misc":0,"stops":0,"taxes":0,"stopWaitingTime":0,"stateSalesTax":0,"serviceCharge":0,"nysSurcharge":0,"total":0},
 "cancelReason":null}
```

## 6. Gateway (real data)

Checked against the live gateway on 2026-11-03 (`docs/XYZ_INTEGRATION_GUIDE.md` §7a, §10; status per code in `docs/XYZ Real Action Codes.md`). Every value is read by the one heading its code sends; an empty one shows "Not available", and a `"9"` answer shows the screen's own copy.

| Action code | When | Real answers |
|---|---|---|
| `RES.S.LOAD_RESERVATION` | Details open | Read by `RESERVATION_HEADINGS`: status `oecallstatusdesc` / `oecurrentstatusdesc`, voucher `oevouchernum`, operator `oeoperatorname`, driver `oedrivername` / `oedrivernum` / `oecarcolor` / `oecarmodel`, car `oecarnum` (sent twice), charges `cc*` or, once invoiced, `idd*` with `iddtotal` and `iddinvoicenum`. |
| `RES.S.VEHICLE_TYPE` | Car Type row | The record's `ocartype` code is shown by its name. |
| `RES.S.COMMUNICATION_LOG` | Messages card | The asked-questions log (`question`, `additional_message`, `answer`, `asked_question_datetime`); no rows yet. |
| `RES.S.LOAD_RESERVATION_COLUMN_SINGLE_VALUE` | Extra contact | `o_code, o_message, o_columnvalue`; a column with no value fails with ORA-01400 and shows nothing. |

- **Not available:** the originate time (`oeoriginatedatetime` is a date only), the cancel reason (no heading), and any empty field.
- `LOAD_RESERVATION` returns another customer's record for any number (no ownership check, backend issue).
