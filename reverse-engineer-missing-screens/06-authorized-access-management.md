# Missing 06 — Authorised Access ("Let colleagues book for me")

| | |
|---|---|
| **App today** | 🔴 Missing. The booking side only **reads** who granted access to me (`PROF.S.LOAD_PROFILE_WHO_GRANTED_ACCESS`, used by `useGrantedProfiles` for "Reservation for"). Nobody can grant or revoke access, so that list can never be filled from the app. |
| **Legacy reference** | [`../reverse-engineer-implemented/guide/14-booking-passenger-time.md`](../reverse-engineer-implemented/guide/14-booking-passenger-time.md) §2–4 (option `4` Authorised employee, `ddlAuthorizeEmployees`, `LoadAuthorizeProfile`) |
| **Gateway** | ✅ `PROF.U.GRANT_ACCESS_RIGHTS`, `PROF.U.REVOKE_ACCESS_RIGHTS`, `PROF.S.LOAD_MATCHING_PROFILE_LIST`, `PROF.S.GRANT_ACCESS_RIGHTS_TO_ALL`, `PROF.U.GRANT_ACCESS_RIGHTS_TO_ALL`, `PROF.U.REVOKE_ACCESS_RIGHTS_TO_ALL`, `PROF.S.LOAD_ACCESS_RIGHTS_GRANTED_PROFILE` — none implemented |
| **Priority** | P2 |

## 1. Purpose
A member authorises colleagues (other profiles, normally on the same corporate account) to make reservations **using this member's profile**: passenger name, addresses, contacts and billing. The colleague then sees this member under "I want to make reservation for → Authorised employee" in booking step 1.

Live message when no one has authorised you (guide 14):
> "Please note that other employees need to authorize you in XYZ Car system so you can make reservations using their profile information."

## 2. What the live site shows [O / I]
- The analysed member account had **no** grant-management page in its menu. The Profile menu has only: Change Personal Info, Change Billing Address, Change Preferences, My Addresses, My Contacts, Change Password.
- On the legacy system, granting was done by customer service or another channel [I].
- The gateway now exposes the full grant API, so the app can offer it as **self-service**. That makes this a **new screen** with no legacy UI to copy. Keep it minimal.

## 3. API (gateway contract, `docs/XYZ Action Codes.md`)

| Code | Inputs | Output [U] | Use |
|---|---|---|---|
| `PROF.S.LOAD_ACCESS_RIGHTS_GRANTED_PROFILE` | `P_LOGIN_ID_FROM` (me) | rows: profiles I have authorised (login id, name, phone, ext) | list "People who can book for me" |
| `PROF.S.LOAD_MATCHING_PROFILE_LIST` | `P_LOGIN_ID` (me), `P_FIRST_NAME`, `P_LAST_NAME`, `P_PHONE`, `P_PHONE_EXTENSION` | rows: matching profiles | "Find a colleague" search |
| `PROF.U.GRANT_ACCESS_RIGHTS` | `P_LOGIN_ID_FROM` (me), `P_LOGIN_ID_TO` (colleague), `P_PHONE`, `P_EXTENSION` | `o_code` / `o_message` | add one |
| `PROF.U.REVOKE_ACCESS_RIGHTS` | same 4 | `o_code` / `o_message` | remove one |
| `PROF.S.GRANT_ACCESS_RIGHTS_TO_ALL` | `P_LOGIN_ID_FROM` | flag row [U] (`Y`/`N`) or `o_code` | is "everyone on my account" switched on? |
| `PROF.U.GRANT_ACCESS_RIGHTS_TO_ALL` | `P_LOGIN_ID_FROM` | `o_code` / `o_message` | switch on |
| `PROF.U.REVOKE_ACCESS_RIGHTS_TO_ALL` | `P_LOGIN_ID_FROM` | `o_code` / `o_message` | switch off |
| `PROF.S.LOAD_PROFILE_WHO_GRANTED_ACCESS` ✅ | `P_LOGIN_ID_TO` (me) | rows: people who authorised me | already used by booking |

`P_PHONE` / `P_EXTENSION` on grant and revoke: the colleague's phone as returned by the matching search [I]. Pass the row's values through unchanged.

## 4. Screen design (mobile first)
Route `src/app/(app)/authorized-bookers.tsx` (menu: Profile → "Booking access").

1. **Toggle:** "Anyone on my company account can book for me".
   - Load: `GRANT_ACCESS_RIGHTS_TO_ALL`.
   - Change: `GRANT_…_TO_ALL` / `REVOKE_…_TO_ALL`.
2. **List:** "Can book for me". Rows from `LOAD_ACCESS_RIGHTS_GRANTED_PROFILE` (name, e-mail/login, phone) with a "Remove" action → `REVOKE_ACCESS_RIGHTS` (confirm first).
3. **Add:** search by first name, last name and/or phone (+ ext).
   - Search runs `LOAD_MATCHING_PROFILE_LIST` and shows results.
   - "Allow" → `GRANT_ACCESS_RIGHTS` → refetch list.
   - Require at least last name **or** phone before searching. Avoid returning the whole directory.
4. **Empty state:** "No one can book for you yet."
5. **Read-only companion** (optional): "People who let me book for them". This is the existing `LOAD_PROFILE_WHO_GRANTED_ACCESS` list, useful to explain the booking option.

## 5. Booking-side gaps this unblocks (also in file 20)
Today `useGrantedProfiles` lists grantors, but choosing one does **not** load the grantor's name, addresses or billing. The legacy `LoadAuthorizeProfile` did that and reloaded the wizard.

The app equivalent:
- On selection, load that login's profile with `PROF.S.LOAD_PROFILE` (`P_LOGIN_ID` = grantor), addresses (`PROF.S.USER_ADDRESSES`) and contacts.
- Show the confirm dialog first:
  > "Please note that changing 'I want to make reservation for' option will have effect on pickup/drop off addresses, contact numbers, email addresses and billing information and you will be required to provide this information again for new passenger. Do you want to continue?"

## 6. Rules
- Only the profile owner can grant or revoke. Always send `P_LOGIN_ID_FROM = session.loginId`, never a value from the UI.
- Cancelling an employee's reservation after access was revoked must show "You are no longer authorized to cancel reservations for the selected employee." (module 19 / file 01).

## 7. Acceptance criteria
- [ ] All 7 codes are added to `actionCodes.ts`, wired with `usePostData` / `useFetchData`, and marked in `docs/XYZ Action Codes.md`.
- [ ] Gateway rows are rendered as returned (dummy OK). Empty and error states, no seed data.
- [ ] Grant / revoke / toggle refresh the list. `o_message` is shown on refusal.

## 8. Unknowns
- [U] Output columns of the three `S` codes.
- [U] Whether "grant to all" is scoped to the corporate account.
- [U] Whether product wants self-service granting at all (it was not on the legacy member menu). **Confirm before building.**
