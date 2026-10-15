# Module 17 — Booking Step 4: Preferences, Contact & Ride Options

Part of the booking wizard (module 13). Submitted with `hfactive=3` — **this submit creates the reservation**.

## 1. Purpose
Capture vehicle type, confirmation channel, callback phones, e-mail + CC list, passenger count and number of stops; then create the reservation.

## 2. Data model [O]

| Field | Type | Max | Required | Values / rules |
|---|---|---|---|---|
| `CarTypeId` | enum | — | yes | `0` No Preference · `3` Sedan · `4` SUV · `H` Standard Wheelchair Vehicle · `K` Premium Wheelchair Vehicle |
| `chkPhone` | bool | — | no | confirmation by phone (default from profile, module 09) |
| `PhoneUS` | digits | 10 | if `chkPhone` | US phone rule |
| `ExtUS` | digits | 5 | no | |
| `PhoneIntAreaCode` | digits | 10 | with `PhoneInt` | |
| `PhoneInt` | digits | 20 | with code | |
| `ExtInt` | digits | 5 | no | |
| `Email` | e-mail | 50 | yes* | *if empty, `UserEmail` (guest) becomes required |
| `EmailListCC` | text | 500 | no | comma-separated e-mails; chars letters/digits `- _ @ . ,` |
| `NoOfPassengers` | int | — | yes | 1–4 |
| `NoOfStops` | int | — | yes | 0–4 |

Rule (when confirmation by phone is checked): at least one callback phone (US or complete international).

## 3. Vehicle-type rules [O]
| Car type | Rule |
|---|---|
| `H` Standard wheelchair | "25% tips apply for this vehicle." |
| `K` Premium wheelchair | Cannot complete online: "Premium wheelchair accessible vehicle requires extra information to dispatch. … please call XYZ at 929-XYZLimo to complete the reservation process"; rates: "Please call XYZ at 929-XYZLimo for rates of this vehicle type." |

## 4. Pickers [O/C]
- Saved phones: `POST /Base/GetPhoneList {maxResults}` → `[{CompleteContactNumber:"<number>-<ext>", ContactTypeId}]` → fills `PhoneUS` / `ExtUS`.
- Saved e-mails: `POST /Base/GetEmailList {maxResults}` → `[{ContactNumber:"<email>", ContactTypeId}]` → fills `Email`.
- CC list picker: `POST /MemberArea/EmailCC` → HTML checkbox list of the member's e-mails (`chkemailcc` values, select-all `chkallemailcc`); selected values joined with commas into `EmailListCC`.
(Sources are the contacts from module 12.)

## 5. Submit — `POST /Reservation/Index` (`hfactive=3`) [C]
Success: response `confirm` (HTML receipt) and `header`; wizard moves to **Ride Receipt** and all steps lock. Failure: `error` / duplicate handling (module 13 §5).
Guest-only post-booking: dialog to create a login (`UserEmail`, `Password`, `ConfirmPassword` → `hfGuestSelection=Finish`, `hfUserEmail`, `hfPassword`) or skip (`hfGuestSelection=SaveDonot`), then resubmit.

## 6. Errors & messages
"Please enter at least one Callback Phone number." · "Please enter International Phone number" · "Please enter International Phone Country+City Code." · "Please enter International Phone #." · "International Phone Country+City Code." · "Callback Phone (US Ext) contains invalid character(s). Please provide numeric value." · "Invalid email address." · "Email CC contains invalid character(s)." · guest: "Please enter email address.", "Please enter password.", "Invalid Password. Please enter only alpha numeric characters.", "Password must be at least 4 characters long.", "Please enter confirm password.", "Please enter correct password."

## 7. Revamp notes
`{vehicleType, confirmByPhone, callback:{us,usExt,intlCode,intl,intlExt}, email, ccEmails[], passengers, stops}`. Block `K` server-side with a "call to book" response. Send confirmation e-mail to `email` + `ccEmails`.
