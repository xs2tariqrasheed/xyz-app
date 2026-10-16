# Missing 05 — Change Billing / Mailing Address — Gateway Load & Save

| | |
|---|---|
| **App today** | 🟡 Not wired. `src/app/(app)/mailing-address.tsx` + `src/components/account/{MailingAddressForm.tsx,mailingAddress.ts}` start from the stub `SAVED_MAILING_ADDRESS` (666 5 Ave, Manhattan); save only does `setSaved`. Reachable only from Profile, not from the nav. |
| **Legacy reference** | [`../reverse-engineer-guide/08-profile-mailing-address.md`](../reverse-engineer-guide/08-profile-mailing-address.md) |
| **Gateway** | ✅ `PROF.S.LOAD_PROFILE` (load), `PROF.U.PROFILE` (save) |
| **Priority** | P1 |

## 1. Purpose
The member updates the profile's mailing (billing) address and the phone at that address. The legacy menu label is "Change Billing Address"; the page title is "Update Mailing Address".

## 2. Live-site fields [O] (guide 08)

| Field | Max | Required | Rule |
|---|---|---|---|
| Country | 30 | yes | pick from list (US = `01` legacy, `US` gateway) |
| State | 30 | yes | pick from list (code) |
| City | 30 | yes | list or free text |
| Zip | 5 | yes | exactly 5 digits |
| Building # | 6 | yes | digits |
| Street name 1 | 30 | yes | street chars, ≥ 4 |
| Street name 2 | 30 | no | street chars |
| Apt / mail stop | 30 | no | no `"` |
| Address phone (US) | 10 | one phone required | US phone rule |
| Address phone intl code + number | 10 / 20 | — | complete pair |
| Address type | — | yes | Office (default) / Home |

Messages:
- "Fields marked with * are required fields."
- "Please enter at least one Address Phone number."
- "Please enter at least one Address Phone International number."
- "Please enter at least one Address Phone International Country+City Code.."
- "Invalid zip code."
- "Street Name contains invalid character(s)."
- "Invalid Street Name specified."
- "Invalid apartment # specified."

## 3. API (gateway)

### 3.1 Load — `PROF.S.LOAD_PROFILE` ✅
Add the address columns to `src/services/profile.ts` `COLUMNS`. The names below are [I], derived from the `PROF.U.PROFILE` parameter names (the service already derives pass-through columns this way: `P_CC_YEAR` → `cc_year`):

| App field | Column |
|---|---|
| country | `country` |
| state | `state` |
| city | `city` |
| postalCode | `zip` |
| buildingNumber | `building_num` |
| streetName | `street_name` |
| crossStreet (street 2) | `cross_street1` |
| unit (apt) | `cross_street2` [I — the contract has no apt param; confirm] |
| phone (US) | `address_phone_us` |
| intl | `address_phone` |
| addressType | `address_type` (`H` home / `O` office [I]) |

### 3.2 Save — `PROF.U.PROFILE` ✅
- Same whole-profile update as Personal Info. Override only `P_COUNTRY`, `P_STATE`, `P_CITY`, `P_ZIP`, `P_BUILDING_NUM`, `P_STREET_NAME`, `P_CROSS_STREET1`, `P_CROSS_STREET2`, `P_ADDRESS_PHONE`, `P_ADDRESS_PHONE_US`, `P_ADDRESS_TYPE`.
- **Response:** `o_code` / `o_message`. Success → reload the profile.

## 4. Implementation plan
1. Extend `CustomerProfile` with `mailingAddress`. Add `updateMailingAddress()` to `ProfileContext`.
2. The screen reads from `useProfile()`. Delete `SAVED_MAILING_ADDRESS`. Keep `EMPTY_MAILING_ADDRESS` only as the blank form shape when the profile has no address.
3. Bring validation to parity:
   - ZIP 5 digits
   - building # required
   - street ≥ 4
   - one address phone required
   - Office / Home required, default Office
4. State and city pickers: reuse `src/data/regions.ts` like registration does. The gateway has no country/state/city lookup codes. That is a known gap, not a reason to add seed data.
5. Add "Mailing address" to the profile section of the nav, or keep it linked from Profile (product decision).
6. Copy → `messages.ts` `MAILING_ADDRESS_MESSAGES`.

## 5. Acceptance criteria
- [ ] The form shows the address from `PROF.S.LOAD_PROFILE` (dummy values are fine), or an empty form if none.
- [ ] Save sends `PROF.U.PROFILE` with the new address and unchanged personal / billing / preference fields.
- [ ] Validation messages match §2.

## 6. Unknowns
- [U] Exact `LOAD_PROFILE` column names for the address.
- [U] Where apartment / mail stop is stored.
- [U] `P_ADDRESS_TYPE` values. Registration currently sends `'O'` (unconfirmed).
