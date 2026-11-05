> ✅ **Implemented** in the XYZ app (2026-10-16). My Addresses now reads `PROF.S.USER_ADDRESSES` through `SavedPlacesContext` and writes with `PROF.I/U/D.USER_ADDRESS`; see `docs/XYZ_INTEGRATION_GUIDE.md` §7b. Still open: phone sort (§4.6) and "save this address" in booking (§5, tracked in file 20).

# Missing 02 — Address Book ("My Addresses") — Gateway CRUD

| | |
|---|---|
| **App today** | 🟡 Not wired. `src/app/(app)/addresses.tsx` + `src/components/addresses/{AddressForm,SavedAddressList,savedAddress}.ts(x)` start from `SEED_ADDRESSES`; add/edit/delete only change React state. Meanwhile Home and booking load the **real** list (`PROF.S.USER_ADDRESSES` via `SavedPlacesContext`), so the address book and the booking pickers show different data. |
| **Legacy reference** | [`../guide/11-address-book.md`](../guide/11-address-book.md) (full legacy contract), [`05-lookup-services.md`](../guide/05-lookup-services.md) §3 |
| **Gateway** | ✅ `PROF.S.USER_ADDRESSES` (implemented), `PROF.I.USER_ADDRESS`, `PROF.U.USER_ADDRESS`, `PROF.D.USER_ADDRESS` (not implemented) |
| **Priority** | P1 |

## 1. Purpose
The member keeps favourite pickup/drop-off locations. These are reused by:
- booking step 2 (pickup / drop-off pickers)
- Express Checkout on Home

## 2. Live-site behaviour (summary of guide 11) [O/C]
- **List:** "Your current saved locations (click on for update/delete)".
  - Columns: Address (short address, opens edit), Phone (US), Phone (International), Delete.
  - Sortable by US / international phone.
- **Form fields** (* = required):

| Field | Max | Rule |
|---|---|---|
| Country* | — | picked from list |
| State* | — | picked from list |
| City* | — | from list or free text |
| Zip | 5 | exactly 5 digits if given |
| Building #* | 6 | digits |
| Street name* | 30 | street chars, ≥ 4 |
| Cross street | 30 | street chars, ≥ 4 |
| Pickup point | 20 | letters, digits, space `. , ~ & / - ( ) \ #` |
| Phone (US) + ext | 10 / 5 | US phone rule |
| Intl code + phone + ext | 10 / 20 / 5 | complete pair |
| Directions | 500 | no `"` |

- **At least one phone** (US, or complete international) is required: "Please enter at least one Callback Phone number."
- **Delete** asks for confirmation. The legacy site used a GET link; the app must use the `D` action code.
- Ids are **list positions**: the server maps position → stored address (guide 05 §3.1). The contract calls this `P_PICKUP_COUNT`.

## 3. API (gateway)

### 3.1 Load — `PROF.S.USER_ADDRESSES` ✅ already wired in `SavedPlacesContext`
Request `{ P_LOGIN_ID }`. Rows are mapped by `src/services/savedPlaces.ts` (`COLUMNS`: `address_id | addressid | pickup_count | id`, `country`, `state`, `city`, `zip_code`, `building_num`, `street_name`, `cross_street`, `pickup_point`, `directions`, `latitude`, `longitude`, `short_address`…).

Two gaps in the mapping:
- **Phone columns are not mapped yet.** Add `phone_num_us | phone_us`, `ext_us`, `phone_num | phone_int`, `ext | ext_int`, defaulting to `''`.
- The **list position** (`P_PICKUP_COUNT`) must be kept per row. Use the id column if present, else the 1-based row index (the legacy behaviour; mark it `[I]` in a code comment).

### 3.2 Create — `PROF.I.USER_ADDRESS`
| Parameter | From form |
|---|---|
| `P_LOGIN_ID` | session |
| `P_COUNTRY` | country code (`US`) |
| `P_STATE` | state code (`NY`) |
| `P_CITY` | city |
| `P_STREET_NUM` | building # |
| `P_STREET_NAME` | street |
| `P_CROSS_STREET` | cross street |
| `P_PICKUP_POINT` | pickup point |
| `P_ZIP` | zip |
| `P_DIRECTIONS` | directions |
| `P_PHONE_NUM` | international number (code + number digits, as `PROF.U.PROFILE` does with `toIntlDigits`) |
| `P_EXT` | international ext |
| `P_PHONE_NUM_US` | US number (10 digits) |
| `P_EXT_US` | US ext |

Response: row 0 `o_code` / `o_message`. `"0"` → success → `refetch()` the shared `SavedPlacesContext`. Any other code → show `o_message`. No `o_code` → `GatewayError('parsing')`.

### 3.3 Update — `PROF.U.USER_ADDRESS`
Same parameters as create **plus** `P_PICKUP_COUNT` (the row's position/id from §3.1). Same response handling.

### 3.4 Delete — `PROF.D.USER_ADDRESS`
`{ P_LOGIN_ID, P_PICKUP_COUNT }` → `o_code` / `o_message`. Ask for confirmation first ("Delete this saved location?"). After success, refetch, because positions shift after a delete.

All three writes use `usePostData` with `retry: false` and are added to `src/constants/actionCodes.ts` (e.g. `ADD_USER_ADDRESS`, `UPDATE_USER_ADDRESS`, `DELETE_USER_ADDRESS`), then marked `✅ Implemented` in `docs/XYZ Action Codes.md`.

## 4. Implementation plan
1. **Single source of truth:** the address book screen reads `useSavedPlaces()`, the same context that Home and booking use.
   - Expose the raw rows, or a `SavedAddress[]` mapper, in addition to the `AddressSuggestion[]` it builds today.
   - Expose `refetch` after every write.
2. Delete `SEED_ADDRESSES` from `src/components/addresses/savedAddress.ts`.
3. Add a service `src/services/addressBook.ts` with `addressJData(loginId, draft, position?)` and the `o_code` checks.
4. **Validation** (bring `validateDraft` to legacy parity):
   - building # is required, digits ≤ 6
   - street ≥ 4 characters
   - at least one phone
   - ZIP exactly 5 digits (the legacy site rejects ZIP+4)
   - pickup-point and directions character sets per guide 26
5. **Empty state:** "No saved locations yet" plus the add form.
   - Error state: the gateway `errorDisplay` with a retry button.
   - Do not fall back to any local list.
6. **Optional, legacy parity:** sort by US / international phone. Low value; product decision.
7. Move all hard-coded copy into `messages.ts` → new `ADDRESS_BOOK_MESSAGES`.

## 5. Booking integration (see also file 20)
- Booking step 2 on the live site offers **"Add this address to my saved locations"** for a Google-validated street address (`AddPickupAddress` / `AddDropAddress`). Implement it with the same `PROF.I.USER_ADDRESS` call after a successful `RES.I.RESERVATION`.
- After any change, `SavedPlacesContext.refetch()` keeps Express Checkout in sync.

## 6. Errors & messages
- "Fields marked with * are required fields."
- "Please enter at least one Callback Phone number."
- "Please enter International Phone number"
- "Please enter International Phone Country+City Code."
- "Pickup Point contains invalid character(s)."
- "Direction contains invalid character(s)."
- "Invalid zip code."
- "Invalid Street Name specified."
- Any `o_message` from the gateway.

## 7. Acceptance criteria
- [ ] The list shows exactly what `PROF.S.USER_ADDRESSES` returns. The dummy rows are acceptable; no seed data.
- [ ] Add / edit / delete call the I / U / D codes and refresh the list. The booking pickers show the same list afterwards.
- [ ] Gateway refusal shows `o_message`; a missing `o_code` fails closed.
- [ ] Works on web / iOS / Android, phone through desktop widths.
- [ ] `docs/XYZ Action Codes.md` updated.

## 8. Unknowns
- [U] Output column names for phones in `PROF.S.USER_ADDRESSES`.
- [U/I] Whether `P_PICKUP_COUNT` is the stored id or the list position. The legacy site used list positions.
- [U] Whether the gateway geocodes on save (the legacy site stored empty lat/lng).
