> ✅ **Implemented** in the XYZ app

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
