> ✅ **Implemented** in the XYZ app (2026-10-16). `/preferences` edits "confirm by phone" and "special offers" and saves them as `P_CONFIRMATION_METHOD` / `P_SPECIAL_OFFER` with `PROF.U.PROFILE` through `ProfileContext.updatePreferences`; a new booking's "confirm by phone" starts from the saved value. Today `PROF.S.LOAD_PROFILE` sends no preference headings, so the screen shows "not available" (§7).
>
> ✅ **Migrated to real gateway data** (2026-10-30): the module's action codes are mapped by heading from the gateway's real responses. Each code's real answer, and any code not yet answered or confirmed, is in §7 Gateway (real data).

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

## 7. Gateway (real data)

Checked against the live gateway on 2026-10-30 (`docs/XYZ_INTEGRATION_GUIDE.md` §7, §10).

| Action code | When | Real answers |
|---|---|---|
| `PROF.S.LOAD_PROFILE` | `/preferences` opens; a new booking starts | 15 headings, 44 values. **No preference heading**: the confirmation and offer flags arrive only as single letters past the last heading, which the app never reads. So `/preferences` shows "Your preferences are not available right now." and a new booking starts with "confirm by phone" unticked. |
| `PROF.U.PROFILE` | Update | **Not sent.** It is refused while `LOAD_PROFILE` has values past its last heading ("Your preferences can't be updated right now."). With no loaded preferences the Update button can't be reached anyway. |

Value codes from the backend test client:
- `P_CONFIRMATION_METHOD`: `ML` (e-mail) in the `PROF.I.PROFILE`, `RES.I.RESERVATION` and `RES.U.RESERVATION` samples; `''` in the `PROF.U.PROFILE` sample. The app sends `ML` when "Phone" is unticked and `PHONE` when ticked (`TODO(schema-unverified)`).
- `P_SPECIAL_OFFER`: `N` in every sample. The app sends `Y` to opt in (`TODO(schema-unverified)`).
- `P_NEED_PHONE` (booking): `N` in the samples; `Y` with "confirm by phone".

**Still unverified:**
- Which `LOAD_PROFILE` headings will carry the confirmation method and the special-offer flag.
- The phone code and a code for §5's "None" (confirmation when "Phone" is unticked). The update sample's `''` may mean None or "unchanged".
- `Y` as the opt-in code, and what `PROF.U.PROFILE` answers.
