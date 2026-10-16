> ✅ **Implemented** in the XYZ app

# Module 06 — Member Home & Express Ride ("I am ready for pickup")

## 1. Purpose
Landing page after login. Shows announcements and last-login time, links to new reservation and previous orders, and offers **Express ride**: pick a saved pickup and drop-off and request a car immediately ("car will be dispatched to your location in 15 minutes from now").

## 2. Access
Member. `GET /MemberArea/Index` (alias `GET /MemberArea/MemberHome` renders the same page) [O].

## 3. Data rendered [O]

| Item | Source |
|---|---|
| "What's New" announcement text | server content (static marketing copy) |
| Last login date/time, e.g. `10/15/2026 6:45:35 AM` | member record |
| Pickup list (`Pickup`) and drop-off list (`Dropoff`) | member's saved addresses — same list as `Base/GetPickupAddresses` positions 1…n (frequent addresses, separator, all saved addresses) |
| Default selection | first item (`1`) in both lists |
| Express note | "By express ride car will be dispatched to your location in 15 minutes from now." |
| Navigation targets | New reservation `/Reservation/Index`; Previous orders `/MemberArea/RideSearch` |

## 4. Data model — express ride
| Field | Type | Required | Values |
|---|---|---|---|
| `Pickup` | int | yes | list position of a saved address (separator positions must not be chosen) |
| `Dropoff` | int | yes | list position of a saved address |
| `button3` | string | — | `Express Checkout` (submit button name/value) |

## 5. API

### `POST /MemberArea/MemberHome` — request express ride [O form / C behaviour]
Request (normal form post, not AJAX):
```
Pickup=1&Dropoff=2&button3=Express+Checkout
```
Response: page/redirect **[U]**. Client code in the booking module supports an express entry `Reservation/Index?isexpress=2` that opens the booking wizard pre-filled with steps 1–3 completed (summary, price, billing requirements shown) so the member only confirms — this is the most likely continuation **[I]**. Error responses use `{success:false, message}` displayed for 5 s (`StatusChanged` handler on the page) [C].

## 6. Business rules
- Express ride uses the member's profile defaults: passenger = member, billing = profile billing, contact = profile phone/e-mail [I].
- Pickup time = ASAP; dispatch target 15 minutes (`hfNextReservation=15` on the booking form) [O].

## 7. Revamp notes
- `GET /me/home` → `{ lastLoginAt, announcements[], frequentAddresses[], savedAddresses[] }`.
- `POST /reservations/express { pickupAddressId, dropoffAddressId }` → create draft with defaults → return draft for one-click confirm (or confirm immediately if product wants true one-click).
- **Unknown**: whether the express POST books immediately or returns to the wizard; not executed (would dispatch a car).
