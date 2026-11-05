# Module 26 — Validation Rules (shared reference)

Source: shipped scripts (`UtilsGeneric.js`, `UserSignin.js`, `Registration.js`, `Reservation.js`, `ReservationGeneral.js`, `CancelRide.js`, `Feedback.js`) and `data-val-*` attributes on live forms. Use this as the single source for client + server validation parity in the Revamp.

General pattern: every text value is **trimmed** before validation; fields are validated when edited and again on step submit. Generic required-field error: "Fields marked with * are required fields.".

## 1. Character-set validators

| Validator | Allowed characters / rule | Used for |
|---|---|---|
| `checkEmailAddress` | regex `^[\w-_.]*[\w-_.]@[\w].+[\w]+[a-zA-Z]$` **and** exactly one `@`, contains `.`, only `A-Z a-z 0-9 - _ @ .`, no `_` in domain | all e-mails |
| `isValidCharsForEmailCC` | `A-Z a-z 0-9 - _ @ . ,` | CC e-mail list |
| `isValidUserPassword` | any char except `'` and `"` | passwords |
| `isValidPersonName` | trimmed length ≥ 2 | last name, card holder, airport, airline, landmark |
| `isValidAlpha` | no digits, no `"` | first/last name, country, state, city |
| `isValidAlphaWithDot` / `isValidCardHolderName` | letters, space, `.`, `'` | card holder |
| `isValidAlphaWithComma` | letters, space, `.`, `,` | (unused) |
| `isValidAlphaNumericWithoutDashes` | letters, digits, space | account #, flight #, arriving from, terminal # |
| `isValidAlphaNumericWithDot` | letters, digits, space, `.` | — |
| `isValidAlphaNumericWithDotComma` | letters, digits, space, `.`, `,` | feedback name/subject, reservation # |
| `isValidAlphaNumeric` | letters, digits | — |
| `isValidNumeric` / `isValidNumeric1` | digits only | VIP #, ext, building #, intl code/number, fax |
| `isValidZip` | exactly 5 digits | ZIP |
| `isValidStreets` | letters, digits, space, `. , - ( ) / &` | street / cross-street (also guards autocomplete) |
| `isValidStreetName` | `isValidStreets` + length ≥ 4 | street names |
| `isValidAlphaNumericForPickupPoint` | letters, digits, space, `. , ~ & / - ( ) \ #` | pickup point |
| `isValidAlphaNumericForAirportAirline` | letters, digits, space, `. , ~ & / - ' ( )` | airport, airline |
| `isValidLandmark` | letters, digits, space, `. ? - _ , ( ) : / ' ~ & < > [ ] { } @ ! % $` | landmark |
| `isValidAlphaNumericForDirection` | anything except `"` | directions, company name, apt # |
| `isValidAlphaNumericWithSpecialCharacter` | anything except `"` | feedback message, complaint text |
| `isValidAlphaNumericForAccountRequirements` | letters, digits, `- _ space . , / &` | corporate requirement fields |

## 2. Phone rules

| Rule | Detail | Message |
|---|---|---|
| US phone (`isValidPhone`) | length ≥ 10 (maxlength 10 ⇒ exactly 10); first digit not `0` or `1`; digits/space only | "Invalid <field>. Please enter your <field> with area code first and without any dashes." / "<field> contains invalid character(s). …" |
| Intl phone (`isValidPhoneInternational(number, code)`) | number ≥ 4; code ≥ 3; code+number ≥ 7 | "Invalid International Phone number." / "Invalid Country+City Code." |
| Pairing | if code or number entered → both required (min-length 3/4 added dynamically) | `*` marker |
| Fax | code + number validated as a US phone; both required if either set (min 3 / 7) | |
| At least one | registration: ≥ 1 callback phone **and** ≥ 1 address phone | "Please enter at least one Callback Phone number." / "Please enter at least one Address Phone number." |

## 3. Card rules
Brand regex + Luhn (module 16 §3). Expiry ≥ current month. Holder: ≥ 2 chars, letters/space/`.`/`'`.

## 4. Date / time rules

| Picker | Format | Range |
|---|---|---|
| Ride date `.datepickerpickup` | `mm/dd/yy` | today … today + 90 days; extra check "Reservation can be made maximum of 90 days in advance." |
| Ride time | `RideHour`, `RideMinute`, `RideTimePart` selects (≠ `-1`) unless "Ready now" | "Please select reservation time." |
| Card expiry (registration) `.dtpicker` | `mm/yy` | min today; years 2026–2045 (manually maintained — a code comment records it was last bumped in May 2026); default +4y |
| Card expiry (reservation legacy) `.datepicker` | `mm/yy` | years 2013–2025 (**stale**) — reservation now uses month/year dropdowns |

## 5. Password rules
4–10 characters (maxlength 10), no `'` or `"`; confirm must match. Messages: "Invalid Password.", "Password must be at least 4 characters long.", "Invalid Confirm Password.", "Confirm Password must be at least 4 characters long.".

## 6. Field length limits (maxlength) [O]

| Field | Max | Field | Max |
|---|---|---|---|
| Login e-mail | 50 | Login password | 10 |
| CompanyAccountNo | 10 | CompanyName | 50 |
| VIPNumber | 10 | CardHolderName | 30 |
| CardNo | 16 | Email / ConfirmEmail | 50 |
| Password | 10 | FirstName | 15 |
| LastName | 20 | PhoneUS / AddressPhoneUS | 10 |
| ExtUS / ExtInt | 5 | PhoneIntAreaCode | 10 |
| PhoneInt | 20 | FaxAreaCode | 10 |
| Fax | 18 | Country / State / City | 30 |
| Zip | 5 | BuildingNo | 6 |
| StreetName1 | 30 | StreetName2 | 20 |
| ApartementNo | 20 | | |

## 7. Input filters [O]
`NumericKeysOnly` (0-9, backspace, tab), `NumericKeysOnlyWithdot`, `CharactersAndNumberic`, `CharactersAndNumbericWithdot`, `CharactersOnly`, `EmailCharactersOnly`; legacy IE-only ZIP+4 helpers (`CheckZipCodeFormat`, `KeyPressedZipCode`). Registration Country/State/City and booking address search fields refuse pasted text.

## 8. Global submit filter [O]
`FilterInput` strips the first occurrence of `| & ; $ % ' " < > + \ * \n \r 0x0a 0x0d` from text/password inputs on every form submit (module 01 §6) — **do not replicate as security**.

## 9. Known defects to avoid when porting
- `isValidPersonName` / `isValidAlpha` assign `heValue = trim(...)` (typo) → value is not actually trimmed before checks.
- `isValidPhone` uses `charAt(i)` before `i` is defined (resolves to index 0).
- `setTime()` can produce minutes ≥ 60.
- `FilterInput` removes only the first occurrence of each character.
- Email regex rejects valid addresses (e.g. `+` tags, new TLD rules); prefer a standard validator but keep the length limit.
- Expiry year ranges are hard-coded and must be edited yearly.

## 10. Recommended Revamp validation schema (example, zod-style)
```ts
email: string().max(50).email()
password: string().min(4).max(10).regex(/^[^'"]*$/)          // parity; consider stronger policy
lastName: string().trim().min(2).max(20).regex(/^[^0-9"]*$/)
firstName: string().trim().max(15).regex(/^[^0-9"]*$/).optional()
phoneUS: string().regex(/^[2-9]\d{9}$/)
intlCode: string().regex(/^\d{3,10}$/); intlNumber: string().regex(/^\d{4,20}$/)
zip: string().regex(/^\d{5}$/)
buildingNo: string().regex(/^\d{1,6}$/)
street: string().min(4).max(30).regex(/^[A-Za-z0-9 .,\-()\/&]+$/)
accountNo: string().max(10).regex(/^[A-Za-z0-9 ]+$/)
vip: string().max(10).regex(/^\d*$/)
flightNo: string().regex(/^[A-Za-z0-9 ]+$/)
directions: string().regex(/^[^"]*$/)
rideDate: date().min(today).max(addDays(today, 90))
```

## 11. Additional rules found in member area [O/C]

| Field | Rule | Message |
|---|---|---|
| Cancel reason (`reason`) | required, ≤ 50 chars, letters/digits/space and `. ? - _ , ( ) : / ' ~ & < > [ ] { } @ ! % $` | "Please enter Reason." / "Maximum length exceeded from 50 characters" / "Reason contains invalid character(s)." |
| Ask-a-question message | ≤ 200 chars, letters/digits/space/`.` | "Maximum length exceeded from 200 characters" / "Additional Message contains invalid character(s)." |
| Contact `ContactNumber` (type Email) | e-mail, ≤ 50 | "Please provide your email address." / "Invalid email address." |
| Contact `ContactNumber` (phone types) | US phone, ≤ 10 | "Please provide your contact number." / "Invalid Phone Number. …" |
| Contact `Extension` | digits ≤ 5 (Office Phone only) | "Extension contains invalid character(s). Please provide numeric value." |
| Change password `ConfirmPassword` | equals `NewPassword` | "Password mismatch." |
| Booking `CompanyAccountNo` | ≤ 16 (registration: ≤ 10) | "Company Account No. Please enter only alpha numeric characters." |
| Booking card expiry | `ddlMonth` 01–12, `ddlYear` 2026–2045 | "Please select month." / "Please select year." / "Please update the credit card expiration date." |
| Booking directions (`*Direction*`) | ≤ 500, no `"` | "… Direction contains invalid character(s)." |
| Booking landmark | ≤ 60 | |
| Booking `AreaName` | ≤ 10 | |
| Booking pickup point | ≤ 20 | |
| Booking `EmailListCC` | ≤ 500 | "Email CC contains invalid character(s)." |
| Guest account password (booking) | letters/digits/space only, ≥ 4, confirm equal | "Invalid Password. Please enter only alpha numeric characters." / "Please enter correct password." |
| Ride search dates | from ∈ [today−3 months, today]; to ∈ [from, today+3 months] | "No reservation(s) found in selected date range." (server) |
| Ride date (booking) | today … today+90 days | "Reservation can be made maximum of 90 days in advance." |
