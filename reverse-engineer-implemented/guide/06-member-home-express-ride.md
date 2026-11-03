> ✅ **Implemented** in the XYZ app
>
> ✅ **Migrated to real gateway data** (2026-10-30): the module's action codes are mapped by heading from the gateway's real responses. Each code's real answer, and any code not yet answered or confirmed, is in §8 Gateway (real data).

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

## 8. Gateway (real data)

Checked against the live gateway on 2026-10-30 (`docs/XYZ_INTEGRATION_GUIDE.md` §7, §7a, §10). Re-probed on 2026-11-03: each row now has one value per heading, and the headings were renamed (guide §10). **The app still reads the old heading names**, so these codes fail closed with the screen's load error until the module is remapped.

| Action code | When | Real answers |
|---|---|---|
| `PROF.S.LOAD_PROFILE` | Home opens (shared with Profile) | 44 headings = 44 values. The welcome line's name is `ofirstname`; the last-login line's value is `oelastlogindate` (`DD-MON-YY`, now filled). |
| `RES.S.ALL_ORDERS` | Home opens (±92 days) | 112 headings = 112 values (`oreservationnumber`, `oreservationdate` `MM/DD/YYYY`, `oreservationtime`, `oecurrentstatusdesc`, …). 15 rows for the test login. |
| `PROF.S.USER_ADDRESSES` | Express pickup / drop-off lists | 17 headings = 17 values, the same as `USER_PROFILE_ADDRESSES` (`ocountry … oelastservicedate`). No `address_id`. 20 rows for the test login. |
| `PROF.S.USER_PROFILE_ADDRESSES`, `PROF.S.CORPORATE_ADDRESSES` | Booking form's "Your places" | 17 headings, renamed to lower case (`ocountry`, …). The first is the frequent-pickup list (17 rows). |
| `RES.S.ZONE_THE_LOCATION` | Express → both stops zoned by street | `["", ""]` for every input tried, so both stops go to the "confirm this address" step. |

- **Express writes nothing.** It opens the booking form's Preview with a live ("ready now") draft. Only "Book reservation" there sends `RES.I.RESERVATION`, and that is not tested here because it creates a real ride.
- **"What's New":** no action code exists, so Home shows no announcements.
- **The 15-minute dispatch note** is copy from the old site (§3), not a gateway value.

**Still unverified:**
- The last-login format: `oelastlogindate` answers `DD-MON-YY`, while the app reads `MM/DD/YYYY h:mm[:ss] AM|PM` (fix with the remap).
- A zoned street's answer from `ZONE_THE_LOCATION` (assumed `"0"` plus the zone in `o_message`, `TODO(schema-unverified)`).
- Ride status and payment words: `oecurrentstatusdesc` and `opaymentmethod` now carry values; check them with the remap.
