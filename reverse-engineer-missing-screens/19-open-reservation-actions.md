# Missing 19 — Open-Reservation Actions & Ride-List Gaps

| | |
|---|---|
| **App today** | 🔵 Partial. In `src/app/(app)/rides.tsx`, the Upcoming tab (`RES.S.UPDATABLE_ORDERS`) offers view / modify / cancel. History (`RES.S.ALL_ORDERS`) offers view / voucher / "Leave feedback" (Ask-a-Question). Tracking lives only on the details page (`track-ride.tsx`). |
| **Legacy reference** | [`19-open-reservations-cancel.md`](../reverse-engineer-implemented/guide/19-open-reservations-cancel.md) §3, [`21-ride-tracking-live-status.md`](../reverse-engineer-implemented/guide/21-ride-tracking-live-status.md) §3–4, [`23-vouchers-receipts.md`](../reverse-engineer-guide/23-vouchers-receipts.md) §3, [`18-ride-history-search.md`](../reverse-engineer-implemented/guide/18-ride-history-search.md) §4 |
| **Gateway** | ✅ Everything needed already exists: `RES.S.LOAD_RESERVATION`, `RES.S.VEHICLE_LOG`, `RES.S.LATITUDE_LONGITUDE_FOR_CAR`, `PROF.S.CAR_INFO`, `RES.S.ALL_PREDEFINED_QUESTIONS`, `RES.I.ASKED_QUESTIONS`, `RES.S.ALL_ORDERS` |
| **Priority** | P2 |

## 1. Gaps

| # | Live-site feature [C/O] | App today | What to build |
|---|---|---|---|
| 19.1 | **Print voucher for an open reservation.** The open-reservation row has a "Print Voucher" dialog with a server-rendered voucher, used by account riders before the ride. | `voucher.tsx` is gated to completed/billed rides or rides with a voucher number. | Allow the voucher view for **open account (voucher) rides** too. Show it as "Ride voucher (unsigned)": reservation #, date and time, passenger, pickup → destination, account # / VIP, car type. Hide charges that are not billed yet. Web print exists; native has "Printing is available in the web app." Keep that unless `expo-print` is approved. |
| 19.2 | **Live status window** (`#divlivestatus`, refreshable) for an active ride, embedding Ask a Question. | Only a manual "refresh position" on `track-ride.tsx`. | On `track-ride.tsx`, when the ride is **active** (today, not billed or cancelled), auto-refresh `CAR_POSITION` + `VEHICLE_LOG` every 30 s while the screen is focused (stop on blur and in the background). Show the latest status line, e.g. "Car is at the pickup location." Show a "Last updated" time. |
| 19.3 | **Locate car** directly from the open-reservation row. | Only reachable through details → Track. | Add a "Track" row action on Upcoming rides that have a car number (`PROF.S.CAR_INFO` / record). It opens `track-ride?rideno=&car=`. |
| 19.4 | **Ask a Question on an active / open ride** (live-status panel: "How I can contact the driver?", "Why vehicle is late?"; message ≤ 200 chars, letters/digits/space/`.`). | `RideQuestionSheet` is offered only on completed or cancelled rides in the list (and on details). | Offer "Ask dispatch" on Upcoming rides too. That is the case the questions were written for. Keep message validation per guide 26 §11. |
| 19.5 | **"Not allowed" on cancel**: an empty `rideno` from the cancel lookup → "You are no longer authorized to cancel reservations for the selected employee." | Not handled. | When `RES.U.CANCEL_RESERVATION` refuses for authorisation, show that text (via file 01's Not-allowed state or inline). Never match on dummy text; use `o_code`. |
| 19.6 | **Session lost while a dialog loads** → `/Misc/TimeOut`. | No timeout screen. | Covered by file 01. |
| 19.7 | **Ride-history column sorting**: `ReservationID`, `PassengerName`, `RideDate`, `PickupShortAddress`, `DropShortAddress`, `CallStatus`, `CardNo`, ASC/DESC. | No sorting; the payment filter is client-side. | Add sort on the desktop table (`RideResultsTable`): ride #, passenger, date, pickup, destination, status, payment. Mobile cards: a "Sort by date ↑↓" toggle only (no noise). Sort client-side on the gateway rows. Do not re-query. |
| 19.8 | **History "Feedback" link** → Rate a Ride. | Opens Ask-a-Question labelled "Leave feedback". | Rename the link to "Ask a question", or point it at Rate a Ride (file 08). |

## 2. Data used (all existing)
- Ride row: `RES.S.UPDATABLE_ORDERS` / `RES.S.ALL_ORDERS`, mapped in `src/services/rides.ts`.
- Status vocabulary (guide 21):
  - Driver accepted the call.
  - System checked car location.
  - Car is at the pickup location.
  - Car is circling around the block.
  - Passenger is in the car.
  - Passenger dropped off.
- Empty vehicle log: "Vehicle log is not available against this ride."

## 3. Acceptance criteria
- [ ] An open account ride shows a printable voucher (web) without charges.
- [ ] An active ride's tracking screen refreshes on its own while focused, and stops when not focused.
- [ ] Upcoming rows with a car offer Track and Ask dispatch.
- [ ] The history table sorts by every visible column; mobile has a date sort.
- [ ] New strings are in `messages.ts` (`RIDES_MESSAGES`, `TRACKING_MESSAGES`).

## 4. Unknowns
- [U] The gateway signal for "ride is active / car assigned" before billing. Use the record status or car number defensively.
- [U] Refresh limits on `CAR_POSITION`.
