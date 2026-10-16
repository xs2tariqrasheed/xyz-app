> ✅ **Implemented** in the XYZ app

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
