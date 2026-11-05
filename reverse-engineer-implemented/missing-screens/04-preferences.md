> ✅ **Implemented** in the XYZ app (2026-10-16). `ProfileContext.updatePreferences` saves through `PROF.U.PROFILE` (`updatePreferencesJData` in `src/services/profile.ts`); `DEFAULT_PREFERENCES` is gone. An untouched setting is sent back exactly as loaded. Still open: the column names / enum in §6.

# Missing 04 — Change Preferences — Gateway Load & Save

| | |
|---|---|
| **App today** | 🟡 Not wired. `src/app/(app)/preferences.tsx` + `src/components/preferences/{PreferencesForm.tsx,preferences.ts}` start from `DEFAULT_PREFERENCES` (both `false`); "Update" only does `setSaved`. Booking step 4 does not default "confirm by phone" from the profile. |
| **Legacy reference** | [`../guide/09-profile-preferences.md`](../guide/09-profile-preferences.md); help text in `/Content/HelpWindow/RidePreferences.htm` (captured, `ev_63d0bf8e…`) |
| **Gateway** | ✅ `PROF.S.LOAD_PROFILE` (load, implemented via `ProfileContext`), `PROF.U.PROFILE` (save, implemented for personal info) |
| **Priority** | P1 |

## 1. Purpose
The member sets two defaults:
- **confirmation by phone call-back** for new reservations
- **subscription to special offers** (news, online deals, mailed coupons)

## 2. Live-site behaviour [O]

| Field (legacy) | Type | Meaning |
|---|---|---|
| `chkPhone` | checkbox | "Confirm reservations by phone". The operator calls back. |
| `IsSubscribed` | checkbox | "Subscribe to special offers". |

Confirmation methods in the legacy help:
- **Online**: only when pickup is within about 5 minutes
- **E-mail**: instant
- **Phone**: operator calls back
- **None**: the customer calls with the confirmation #

Only *Phone* is a profile preference. The booking summary shows "Confirmation By : None" when it is off.

Legacy fields still present in the help file but **not rendered**, so do not build them:
- preferred fleet ("XYZ")
- car year ("Latest available", id 90)
- car phone
- smoking

## 3. API (gateway)

### 3.1 Load — `PROF.S.LOAD_PROFILE` ✅ (already in `ProfileContext`)
Read two more columns in `src/services/profile.ts` `COLUMNS`:

| App field | Column [U — confirm names] | Mapping |
|---|---|---|
| `confirmByPhone` | `confirmation_method` | `true` when the value means phone (`PHONE`, `P`, `Y`) [I]; anything else → `false` |
| `subscribeSpecialOffers` | `special_offer` | `Y` / `1` / `true` → `true` |

Default missing columns to `false` (CLAUDE.md: map defensively).

### 3.2 Save — `PROF.U.PROFILE` ✅
- Re-use the existing whole-profile update in `src/services/profile.ts`. It already passes every other column through from the loaded row.
- Override only:

| Parameter | Value |
|---|---|
| `P_CONFIRMATION_METHOD` | phone value when on (the contract sample is `'EMAIL'`; agree the enum with the backend: `PHONE` / `EMAIL` / `NONE`) [U] |
| `P_SPECIAL_OFFER` | `'Y'` / `'N'` (contract sample `'N'`) |

- **Response:** `o_code` / `o_message`. `"0"` → reload the profile (`ProfileContext.refetch`).
- ⚠ The integration guide §7 warns that `PROF.U.PROFILE` resends the whole profile. Fields that `LOAD_PROFILE` does not return go out blank. Keep the same pass-through approach as Personal Info and **never** send seed values.

## 4. Implementation plan
1. Add `updatePreferences(value)` to `ProfileContext`, next to `updatePersonalInfo`.
2. `preferences.tsx` reads the initial value from `useProfile()`. Delete `DEFAULT_PREFERENCES`.
3. On save, show success or `o_message`. Keep the Update button disabled until something changes (the screen already does this with `preferencesEqual`).
4. **Booking:** `ReservationContext` initialises the step 4 "confirm by phone" toggle from `profile.confirmByPhone`.
5. Copy → `messages.ts` `PREFERENCES_MESSAGES`. No explanatory help paragraphs (no-noise rule); labels only.

## 5. Acceptance criteria
- [x] Opening Preferences shows the values from `PROF.S.LOAD_PROFILE`.
- [x] Update calls `PROF.U.PROFILE` with only the two preference params changed. Name, phones and address are unchanged after a reload.
- [x] A new booking's confirmation toggle starts from the saved preference.

## 6. Unknowns
- [U] Column names and allowed values for confirmation method and special offer in `LOAD_PROFILE`.
