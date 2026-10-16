> ✅ **Implemented** in the XYZ app

# Module 12 — My Contacts (Additional Phones & E-mails)

## 1. Purpose
Member stores extra phone numbers and e-mail addresses. They feed the callback-phone and e-mail pickers in booking (module 17) via `Base/GetPhoneList` / `Base/GetEmailList`.

## 2. Access
Member. Endpoint `/MemberArea/AdditionalContacts` [O].

| Operation | Method & URL | Tag |
|---|---|---|
| List + add form | `GET /MemberArea/AdditionalContacts` | [O] |
| Create | `POST /MemberArea/AdditionalContacts?mode=1&contacttypeid=0` | [O form] |
| Edit / delete | same endpoint with `mode=2` / `mode=3` and the contact id | [I — pattern identical to address book; no contacts existed to observe] |
| Cancel | `GET /MemberArea/AdditionalContacts` | [C] |

## 3. Data model [O]

| Field | Type | Required | Rules |
|---|---|---|---|
| `ContactId` | enum (contact type) | yes | `3` Home Phone, `4` Office Phone, `5` Fax, `6` Cell Phone, `8` Email (from `Base/GetContactType`) |
| `ContactNumber` | string | yes | type 8: valid e-mail, max 50 · other types: US phone, 10 digits, first digit not 0/1, max 10 |
| `Extension` | digits | no | max 5; **only for Office Phone (4)** |

## 4. API

### `POST /Base/GetContactType` [O]
```json
[{"Key":"3","Value":"Home Phone"},{"Key":"4","Value":"Office Phone"},{"Key":"5","Value":"Fax"},
 {"Key":"6","Value":"Cell Phone"},{"Key":"8","Value":"Email"}]
```

### `POST /MemberArea/AdditionalContacts?mode=1&contacttypeid=0` [C]
Request: `ContactId=6&ContactNumber=2125550100&Extension=`
Response: `{"success":…, "error":"<msg>"}` → show error; otherwise HTML (refreshed list).

## 5. Data rendered
List of saved contacts (type, number/e-mail, extension) **[I — list empty for the analysed account]**. Empty state renders no grid.

## 6. Errors & messages
"Please provide your email address." · "Invalid email address." · "Please provide your contact number." · "Invalid Phone Number. Please enter your Phone Number with area code first and without any dashes." · "Extension contains invalid character(s). Please provide numeric value."

## 7. Revamp notes
`GET/POST /me/contacts`, `PUT/DELETE /me/contacts/{id}`; type enum as above; picker endpoints `GET /me/contacts?kind=phone|email`.
