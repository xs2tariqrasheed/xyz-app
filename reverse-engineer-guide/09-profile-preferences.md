# Module 09 — Profile: Preferences

## 1. Purpose
Member sets default confirmation channel and marketing subscription.

## 2. Access
Member. Load `GET /MemberArea/Preferences` [O]; save `POST /MemberArea/Preferences` [C].

## 3. Data model [O]

| Field | Type | Values | Meaning |
|---|---|---|---|
| `chkPhone` | bool (checkbox + hidden false) | `true`/`false` | Confirm reservations by **phone call-back** |
| `IsSubscribed` | bool (checkbox + hidden false) | `true`/`false` | Subscribe to special offers (news, online deals, mailed coupons) |

Legacy (present in code, not rendered): car year "Latest available" (id 90), preferred fleet "XYZ", smoking, car phone.

## 4. API

### `POST /MemberArea/Preferences` [C]
Request: `chkPhone=true&chkPhone=false&IsSubscribed=false` (ASP.NET checkbox pattern).
Response: JSON `message` → show; else HTML (success).

## 5. Business rules (help text) [O]
Confirmation methods: **Online** (only when pickup within ~5 minutes of ordering), **E-mail** (instant), **Phone** (operator calls back), **None** (customer must call with the confirmation #). Only *Phone* is exposed as a profile preference; the booking summary shows "Confirmation By : None" when unchecked.

## 6. Revamp notes
`GET/PUT /me/preferences {confirmByPhone, subscribeOffers}`. Booking step 4 defaults from these values (module 17).
