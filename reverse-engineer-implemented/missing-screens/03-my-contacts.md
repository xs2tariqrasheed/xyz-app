> ✅ **Implemented** in the XYZ app (2026-10-16). My Contacts now loads `PROF.S.LOAD_PROFILE_COLUMN_VALUES` and writes with `PROF.I/U/D.PROFILE_COLUMN_VALUE`; see `docs/XYZ_INTEGRATION_GUIDE.md` §7b. The dev gateway stub does not support these codes yet, so the screen shows its load error until the backend answers.

# Missing 03 — My Contacts (Additional Phones & E-mails) — Gateway CRUD

| | |
|---|---|
| **App today** | 🟡 Not wired. `src/app/(app)/contacts.tsx` ("Contact Management") + `src/components/contacts/*` + `src/utils/contacts.ts` start from a hard-coded `SEED_CONTACTS` list, so add/edit/remove are local only. The type set (home / mobile / work / fax / email) differs from the legacy codes. The app also adds a "make primary" concept with no backend, and has no Office-phone extension field. |
| **Legacy reference** | [`../reverse-engineer-guide/12-contacts.md`](../guide/12-contacts.md), [`17-booking-preferences-contact.md`](../guide/17-booking-preferences-contact.md) §4 |
| **Gateway** | ✅ `PROF.S.LOAD_PROFILE_COLUMN_VALUES_BY_TYPE` (implemented, used by booking), `PROF.S.LOAD_PROFILE_COLUMN_VALUES`, `PROF.I.PROFILE_COLUMN_VALUE`, `PROF.U.PROFILE_COLUMN_VALUE`, `PROF.D.PROFILE_COLUMN_VALUE` (not implemented) |
| **Priority** | P1 |

## 1. Purpose
The member stores extra phone numbers and e-mail addresses. These feed the booking pickers:
- callback phone chips
- e-mail and CC e-mail chips (module 17; `reserver-2.tsx` already reads cell = 6 and email = 8)

## 2. Live-site behaviour [O/C]
- **Contact type** (`ContactId`) comes from `Base/GetContactType`:

| Code | Type | Value rule | Extension |
|---|---|---|---|
| `3` | Home Phone | US phone, 10 digits, first digit not 0/1 | — |
| `4` | Office Phone | US phone | **yes**, digits ≤ 5 (only this type) |
| `5` | Fax | US phone | — |
| `6` | Cell Phone | US phone | — |
| `8` | Email | e-mail, ≤ 50 | — |

- Same type codes as `CONTACT_COLUMN_IDS` in `src/hooks/useReservationLookups.ts` (`home 3, office 4, cell 6, email 8`). Add **fax 5**.
- **List:** type, number / e-mail, extension. The empty state renders no grid.
- **Messages:**
  - "Please provide your email address."
  - "Invalid email address."
  - "Please provide your contact number."
  - "Invalid Phone Number. Please enter your Phone Number with area code first and without any dashes."
  - "Extension contains invalid character(s). Please provide numeric value."

## 3. API (gateway)

### 3.1 Load all — `PROF.S.LOAD_PROFILE_COLUMN_VALUES`
- **Request:** `{ P_LOGIN_ID }`.
- **Response [U]:** rows of extra profile values. Map defensively per row:
  - column id/type: `column_id | contact_type_id | type_id`
  - value: `column_value | contact_number | value`
  - extension: if the value is stored as `"<number>-<ext>"` (legacy `CompleteContactNumber`), split on the last `-` for type 4.
- ⚠ The `P_COLUMN_ID` space also holds non-contact values: the contract sample uses column 2 with value "Business Trip". **Show only types 3, 4, 5, 6 and 8** on this screen.

Fallback if `LOAD_PROFILE_COLUMN_VALUES` turns out not to return types: call the implemented `PROF.S.LOAD_PROFILE_COLUMN_VALUES_BY_TYPE` once per type (3, 4, 5, 6, 8) and merge.

### 3.2 Add — `PROF.I.PROFILE_COLUMN_VALUE`
`{ P_LOGIN_ID, P_COLUMN_ID: <3|4|5|6|8>, P_COLUMN_VALUE }`
- Phone value = 10 digits.
- Office phone with extension → `"<digits>-<ext>"` [I: legacy display format; confirm with backend].
- E-mail is trimmed and lower-cased.
- **Response:** `o_code` / `o_message`.

### 3.3 Edit — `PROF.U.PROFILE_COLUMN_VALUE`
`{ P_LOGIN_ID, P_COLUMN_ID, P_COLUMN_VALUE_OLD, P_COLUMN_VALUE_NEW }` → `o_code` / `o_message`.
- Changing the **type** of an existing contact = delete the old + add the new. The contract has no "change column id" call.

### 3.4 Delete — `PROF.D.PROFILE_COLUMN_VALUE`
`{ P_LOGIN_ID, P_COLUMN_ID, P_COLUMN_VALUE }` → `o_code` / `o_message`. Confirm first.

All writes: `usePostData`, `retry: false`, refetch afterwards.

The same codes are mirrored on the reservation side (`RES.I/U/D.RESERVATION_COLUMN_VALUE`, already implemented in `ReservationContext` for Email CC). Reuse its `column*JData` helper style.

## 4. Implementation plan
1. Add a `ContactsContext` (or keep it screen-local with `useFetchData` if only this screen uses the full list) that loads §3.1.
   - Booking keeps using the by-type hook.
   - After a write here, invalidate those lookups too, so booking shows new chips.
2. Replace the app's type set with the legacy set: Home Phone, Office Phone (+ ext), Fax, Cell Phone, Email.
3. **Remove the "primary contact" concept** (no backend). Under the "no noise" rule it adds a decision the user cannot persist.
4. Delete `SEED_CONTACTS`. Show an empty state when the gateway returns no rows, and `errorDisplay` + retry on failure.
5. Move copy into `messages.ts` → `CONTACTS_MESSAGES`.
6. Add the four codes to `actionCodes.ts`; mark them in `docs/XYZ Action Codes.md`.

## 5. Acceptance criteria
- [ ] The list renders the gateway rows (dummy is fine). No seed data remains.
- [ ] Add / edit / delete call the right code with the right `P_COLUMN_ID` and refresh.
- [ ] The extension field appears only for Office Phone and is digits ≤ 5.
- [ ] E-mail ≤ 50 characters and phone = 10 digits (first digit 2–9) are validated before sending.
- [ ] Booking step 4 phone and e-mail chips reflect the change.

## 6. Unknowns
- [U] Output column names of `PROF.S.LOAD_PROFILE_COLUMN_VALUES`.
- [U] Storage format of an office extension.
- [U] Whether duplicates are refused by the server (`o_code`).
