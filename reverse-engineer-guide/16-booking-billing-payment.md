> ✅ **Implemented** in the XYZ app

# Module 16 — Booking Step 3: Billing Method & Payment

Part of the booking wizard (module 13). Submitted with `hfactive=2`.

## 1. Purpose
Choose how the ride is paid: **corporate account (voucher)**, **corporate account + credit card guarantee**, or **credit card**; satisfy account-specific booking requirements; authorise the card.

## 2. Billing modes (`rbAccount`) [O]

| Value | Mode | Section fields | `ChangeAccountNo.step` |
|---|---|---|---|
| `True` | Corporate account | `CompanyAccountNo`, `VIPNumber` | `1` |
| `2` | Account + credit card | `CompanyAccountNo1`, `VIPNumber1`, `CardType1`, `CardHolderName1`, `CardNo1`, `ddlMonth1`, `ddlYear1` | `2` |
| `False` | Credit card | `CardType`, `CardHolderName`, `CardNo`, `ddlMonth`, `ddlYear` | `3` |

Account type of the member's account (`acctype`) restricts modes: `1` account-only → mode `2` disabled; `2` account+card → mode `True` disabled; `3` card-only → forced to credit card [O/C].

## 3. Data model [O]

| Field | Type | Max | Rules |
|---|---|---|---|
| `CompanyAccountNo` / `CompanyAccountNo1` | string | 16 | required in account modes; letters/digits/space; pre-filled from profile and locked |
| `VIPNumber` / `VIPNumber1` | digits | 10 | optional; pre-filled & locked |
| `CardType` / `CardType1` | enum | — | `2` Visa · `1` MasterCard · `0` AmEx · `5` Discover · `3` Diners |
| `CardHolderName` / `CardHolderName1` | string | 30 | required; ≥2; letters, space, `.`, `'` |
| `CardNo` / `CardNo1` | digits | 16 | required; brand regex + Luhn; may hold a masked stored card `************1234` (then unchanged) |
| `ddlMonth` / `ddlMonth1` | `01`–`12` | — | required |
| `ddlYear` / `ddlYear1` | `2026`…`2045` | — | required; month/year ≥ current month |
| requirement fields | dynamic | — | rendered from `reqhtml`; validated by server-supplied `verifyRequirements()`; allowed chars letters, digits, `- _ space . , / &` |
| `hfisaccount`, `hfisrequirement`, `hfCardNo` | hidden | — | see module 13 |

## 4. API

### 4.1 `POST /Reservation/GetCardNo` (page load) [O]
Request: `{}` → `{"success":true,"cno":"<full stored card number>"}`. Used to detect whether the user changed the masked card. ⚠ Returns the full PAN — do not replicate.

### 4.2 `POST /Reservation/ChangeAccountNo` — billing mode change / edit account [C]
Request: `iscorporate=true|false&step=1|2|3|""&accountno=<optional>`
Response: `{"success":true[, "acctype":"yes"|"no"]}` or `{"success":false,"error":"…"}` (shown). Called when the mode radio changes, when "Edit" account is clicked (clears account/VIP, unlocks, step `1` or `2`), and when reopening the account panel (`step=""`, with `accountno`; `acctype` `yes` ⇒ account supports card ⇒ select mode `2`).

### 4.3 `POST /Reservation/GetAccountMethod` [O]
Request `accountno=<account #>` → real response `{"success":true,"acctype":1}`. `1` account only · `2` account + card · `3` card only. Client switches mode, disables invalid modes, shows notices:
- `acctype=1` in mode 2: "This account type does not support credit card payment. Your corporate account will be charged. If you want to change account number please click on edit link or click next if you want to bill your corporate account."
- `acctype=2` in mode True: "Mode of payment for entered account number is set to credit card. If you want to change account number. Please click on edit link or click next if you want to proceed with credit card payment."

### 4.4 Step submit `POST /Reservation/Index` (`hfactive=2`) — status codes in `#inner_5` (module 13): `CCAccount` → run card authorisation; `Accworeq` → call GetAccountMethod & adjust; `RAccount` → render requirement fields (`reqhtml`, `reqhtmlscript`).

### 4.5 `POST /Reservation/CardApproval` — card authorisation (polling) [C]
Request `times=<attempt #, starting 0>`.
| Response | Action |
|---|---|
| `{"success":true}` | authorised → go to step 4 (or auto-submit step 4 in express mode) |
| `{"success":false,"message":"CCcall"}` | still processing → retry after 10 s (`times+1`); overall wait `CCTimeOut`=90 s |
| `{"success":false,"message":"<text>"}` | declined/error → show, re-mask card number |
Message while waiting: "Credit Card authorization is being obtained. It may take up to 90 seconds for this process. Please wait... Note: You must present the credit card in the car when taking a ride."

## 5. Business rules
- No debit cards; card must be presented to the driver ("No debit cards are accepted. You must present the card to the driver in the car.").
- Expired card on file → step 2 returns `CCExpire` → "Your credit card on file has expired. Kindly use a new credit card or enter the updated information."
- Card holder name required; expiry ≥ current month ("Please update the credit card expiration date.").

## 6. Errors & messages
"Please enter card holder name." · "Please enter credit card number." · "Invalid Card Number." · "Please select month." · "Please select year." · "Please update the credit card expiration date." · "Company Account No. Please enter only alpha numeric characters." · "VIPNumber contains invalid character(s). Please provide numeric value." · "Fields marked with * are required fields."

## 7. Revamp notes
- `GET /me/billing` → `{accountNo, vip, accountType: ACCOUNT|ACCOUNT_AND_CARD|CARD, cardOnFile:{brand,last4,expMonth,expYear}}`.
- Account requirement schema endpoint: `GET /corporate-accounts/{no}/requirements`.
- Card capture via gateway tokenisation; authorisation async job with status polling or webhook (`PENDING` ≙ `CCcall`).
- **Unknown**: authorisation amount, decline message texts, requirement field definitions.
