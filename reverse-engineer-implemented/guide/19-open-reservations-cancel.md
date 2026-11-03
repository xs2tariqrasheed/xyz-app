> ✅ **Implemented** in the XYZ app
>
> ✅ **Migrated to real gateway data** (2026-11-03): the module's action codes are mapped by heading from the gateway's real responses. Each code's real answer, and any code not yet answered or confirmed, is in §7 Gateway (real data).

# Module 19 — Open Reservations ("Update/Cancel Reservation") & Cancellation

## 1. Purpose
List the member's upcoming (open) reservations and let the member cancel one (with a reason), print its voucher, see live status or locate the car.

## 2. Access
Member. `GET /MemberArea/RideList` [O]. The analysed account had no open reservations, so the grid columns were not observable; behaviour comes from `RideList.js` and `CancelRide.js` [C].

Empty state [O]: "No open reservation(s) found."

## 3. Row actions [C]

| Action | Behaviour |
|---|---|
| Cancel | Ajax action returns `{success, rideno, from}` → opens cancel dialog; empty `rideno` → "Not Allowed" ("You are no longer authorized to cancel reservations for the selected employee.") |
| Print voucher | opens print-voucher dialog with server-rendered voucher (module 23) |
| Live status | opens live-status window (module 21) |
| Locate car | opens car-location map (module 21) |
| Update | **[U]** — menu title says "Update/Cancel"; update action not observable without an open reservation |

If any dialog content is empty (session expired) → navigate to `/Misc/TimeOut`.

## 4. Cancel reservation API

### 4.1 Step A — obtain ride for cancellation [C]
Row "Cancel" link (Ajax) → JSON `{"success":true,"rideno":"<ride no>","from":"<origin page>"}` or `{"success":false,"message":"…"}` or `{"Redirect":"…"}`.

### 4.2 Step B — `POST /MemberArea/CancelReservation` [C — not executed]
Request:
| Param | Rule |
|---|---|
| `rideno` | ride number |
| `from` | origin marker (returned in step A / hidden `hfFrom`) |
| `reason` | required, ≤ 50 chars; letters, digits, space and `. ? - _ , ( ) : / ' ~ & < > [ ] { } @ ! % $` |

Response:
| Response | Client action |
|---|---|
| `{"success":true,"returnurl":"<url>"}` | close dialog, go to `returnurl` (from member pages) or `/MemberArea` (from confirmation page) |
| `{"success":false,"message":"…"}` | show message |
| `{"Redirect":"…"}` | navigate (session expired) |

Dialog text: "You have selected to cancel reservation <ride no>. This action is irreversible. Please mention the reason to continue and click OK button."

## 5. Errors & messages
"Please enter Reason." · "Maximum length exceeded from 50 characters" · "Reason contains invalid character(s)." · "You are no longer authorized to cancel reservations for the selected employee."

## 6. Revamp notes
`GET /me/reservations?status=open` and `POST /reservations/{rideNo}/cancel {reason}` (≤50). Enforce authorisation (own rides / authorised employees) and cut-off rules server-side **[cut-off rules U]**. Define the update/modify capability with the business (not observable).

## 7. Gateway (real data)

Checked against the live gateway on 2026-11-03 (`docs/XYZ_INTEGRATION_GUIDE.md` §7a, §10; status per code in `docs/XYZ Real Action Codes.md`). Every value is read by the one heading its code sends; an empty one shows "Not available", and a `"9"` answer shows the screen's own copy.

| Action code | When | Real answers |
|---|---|---|
| `RES.S.UPDATABLE_ORDERS` | Upcoming tab | 112 headings; 4 rows for the test login. |
| `RES.U.CANCEL_RESERVATION` | Cancel with a reason (≤ 50) | `o_code, o_message`; `"1"` / `Invalid reservation number.` for the test ride, shown as sent. A successful cancel not seen. |
