> ✅ **Implemented** in the XYZ app
>
> ✅ **Migrated to real gateway data** (2026-11-03): the module's action codes are mapped by heading from the gateway's real responses. Each code's real answer, and any code not yet answered or confirmed, is in §6 Gateway (real data).

# Module 22 — Round Trip / Repeat Reservation

## 1. Purpose
Create a new reservation (e.g. the return leg) pre-filled from an existing ride, so the member only adjusts date/time and confirms.

## 2. Access & flow [O pages / I trigger]
1. Member views a ride (module 20) — the server keeps that ride in session **[I]**.
2. `GET /Reservation/Trip?mode=up` renders a review page of a new reservation copied from that ride, with the instruction: *"You may edit date/time or other information first and click on 'Create Reservation' button at the bottom to complete your round trip reservation."*
3. "Create Reservation" → **`GET /Reservation/Confirmation`** → creates the reservation from the session draft **[C link; creation not executed]**.
   - Observed: when no trip draft is in session, `GET /Reservation/Confirmation` redirects to `/Reservation/Trip?mode=up` (no booking created — verified no new reservation appeared).

## 3. Data rendered on the review page [O]

| Section | Fields |
|---|---|
| Passenger Name & Ride Date | Reservation For (`MySelf`…), Ride Reason (e.g. `Business Trip`), First Name, Last Name, Ride Date, Ride Time |
| Pickup Address / Destination Address | Country, City, State, St.# and Name, Cross Street1, Cross Street2, Pickup Point |
| Billing Info | Payment Method, Account #, VIP # |
| Preferences | Confirmation By, No. of Passengers, Callback Phone (US), No. of Stops, International Phone, Intl. Phone Ext., Email |

## 4. Business rules [I]
- `mode=up` = round trip using the previous ride's data (addresses as stored for the new leg). Other `mode` values **[U]**.
- Billing, passenger and preferences copied from the source ride.
- Editing date/time happens via the booking wizard (module 13) before confirming **[U exact link]**.

## 5. Revamp notes
- `POST /reservations/{rideNo}/clone {type: "return"|"repeat"}` → draft (swap pickup/drop for return), then normal draft submit (POST + idempotency key).
- ⚠ Do **not** create bookings on GET (legacy `/Reservation/Confirmation` is a GET that books).

## 6. Gateway (real data)

Checked against the live gateway on 2026-11-03 (`docs/XYZ_INTEGRATION_GUIDE.md` §7a, §10; status per code in `docs/XYZ Real Action Codes.md`). Every value is read by the one heading its code sends; an empty one shows "Not available", and a `"9"` answer shows the screen's own copy.

| Action code | When | Real answers |
|---|---|---|
| `RES.S.LOAD_RESERVATION` | Return trip / Repeat | The record re-opens the wizard; an unknown payment code keeps the form's default method. |
| `RES.I.RESERVATION` | Book | As module 13. |

- **`"0"` = booked.** `RES.I.RESERVATION` answered `"0"` with the new number (`W6110231278`, `W6110331282`); the app shows it on the receipt. That those rides then don't appear in `LOAD_RESERVATION` or the order lists is a database issue (backend). `"5"` means a matching booking already exists (its number in `o_message`). A blank trip purpose fails with `ORA-01400`, so the form requires it.
