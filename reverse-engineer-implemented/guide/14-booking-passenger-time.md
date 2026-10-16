> ✅ **Implemented** in the XYZ app

# Module 14 — Booking Step 1: Passenger, "Reservation For", Ride Date & Time

Part of the booking wizard (module 13). Submitted with `hfactive=0`.

## 1. Purpose
Identify who rides and when.

## 2. Data model [O]

| Field | Type | Required | Values / rules |
|---|---|---|---|
| `FirstName` | string ≤15 | no | no digits/`"`; pre-filled & read-only when riding for "Myself" |
| `LastName` | string ≤20 | yes | ≥2 chars, no digits/`"`; pre-filled & read-only for "Myself" |
| `rbReadyNow` | enum | yes | `True` = "I am ready now (live call)" (default) · `False` = scheduled |
| `RideDate` | date `MM/DD/YYYY` | yes | today … today+90 days |
| `RideHour` | int | if scheduled | `1`–`12` (`-1` = not chosen) |
| `RideMinute` | int | if scheduled | `0,5,10,…,55` (`-1` = not chosen) |
| `RideTimePart` | enum | if scheduled | `AM` / `PM` (`-1` = not chosen) |
| `ddlRideInfo` ("I want to make reservation for") | enum | account-dependent | `1` Myself · `2`, `3` another passenger (free-text name) · `4` Authorised employee |
| `ddlAuthorizeEmployees` | string (employee e-mail) | if `ddlRideInfo=4` | list of employees who authorised this member |
| `ddlRideReason` | enum | account-dependent | ride reason (e.g. "Business Trip", "After hours") |
| Guest only: `txtEmail`, `ConfirmEmail` | e-mail | guest | must match |

`ddlRideInfo`, `ddlAuthorizeEmployees` and `ddlRideReason` are rendered only for accounts that enable them (not rendered for the analysed account; the summary still shows "Reservation for : MySelf", "Ride Reason : …") [O].

## 3. API

### 3.1 Step submit — `POST /Reservation/Index` (`hfactive=0`) — module 13.

### 3.2 `POST /Reservation/LoadAuthorizeProfile` [C]
When: "Reservation for" = Authorised employee and an employee is chosen (after confirming the reset dialog).
Request: `email=<employee e-mail>&passengertype=<ddlRideInfo>&ridereason=<ddlRideReason>`
Response: `{"success":true}` → reload passenger name from employee (`"Last, First"` option text is split into last/first); `{"success":false,"error":"…"}` → show.
(Sent as GET due to the same `ype` typo as other calls.)

### 3.3 Passenger change reload [C]
Changing "Reservation for" after step 1 shows: "Please note that changing 'I want to make reservation for' option will have effect on pickup/drop off addresses, contact numbers, email addresses and billing information and you will be required to provide this information again for new passenger. Do you want to continue?" → Confirm → `GET /Reservation/Index?passengerid={value}`.

## 4. Business rules
- "Myself" → name forced to member's original name.
- Other passenger (`2`/`3`) → name entered freely; addresses/contacts/billing must be re-entered.
- Authorised employee (`4`) requires that the employee authorised the member; otherwise: "Please note that other employees need to authorize you in XYZ Car system so you can make reservations using their profile information."
- Ready-now = live call (dispatch ASAP). Scheduled requires date + hour + minute + AM/PM.
- Max 90 days ahead.

## 5. Errors & messages
"Please select reservation time." · "Reservation can be made maximum of 90 days in advance." · "Invalid Last Name specified." · "Last Name contains invalid character(s)." · "First Name contains invalid character(s)." · guest: "Invalid email address.", "Confirm Email must match with Email."

## 6. Revamp notes
Model: `{passengerType: self|other|employee, employeeId?, firstName, lastName, rideReasonId?, readyNow: bool, pickupAt?: datetime}`. Expose `GET /me/authorized-employees`, `GET /ride-reasons` (account-scoped). Fix "now + 20 min" helper (minute overflow) if reused.
