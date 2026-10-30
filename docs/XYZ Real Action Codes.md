# XYZ Real Action Codes — migration tracker

Which action codes are moved from the stub's dummy data to the gateway's **real** responses. Parameters are in [XYZ Action Codes.md](XYZ%20Action%20Codes.md). What each code really returns (its shape, column positions and `o_code` meanings) is in [XYZ_INTEGRATION_GUIDE.md §10](XYZ_INTEGRATION_GUIDE.md#10-actual-responses-by-action-code).

**Migrating a code:**
1. Probe it: `npm run gateway:probe -- <CODE> '<JData JSON>'`.
2. Record the response in guide §10.
3. Map it in its service, by heading or by position as §10 says.
4. Verify it in the app.
5. Set its status here to ✅.
6. Once every code a module uses is ✅ (or recorded as Blocked / Needs data / Not probed with its reason), give the module guide in `reverse-engineer-implemented/guide/` a **Gateway (real data)** section, and add this line under its `✅ Implemented` banner:
   `> ✅ **Migrated to real gateway data** (<date>): the module's action codes are mapped by heading from the gateway's real responses. Each code's real answer, and any code not yet answered or confirmed, is in §N Gateway (real data).`

**Module guides migrated:** 03 Forgot password, 04 Registration, 06 Member home & Express ride, 07 Personal info, 08 Mailing address.

Never probe a write code without an agreed test record.

## Status key

| Status | Meaning |
|---|---|
| ✅ Migrated | Real response inspected. The app maps it by its own headings only (heading *n* ↔ value *n*, one name per field, values past the last heading ignored) and shows exactly what each heading pairs with, even where the gateway's pairing is wrong |
| Ready | Probed. Headings match the row (shape A), so `mapRows` works. Check the service against the `o_code` meanings in §10. |
| Ready — review `o_code` | As Ready, but `o_code` doesn't mean "0 = success" for this code. The service's checks must change. |
| Move to heading-only reads | Probed, but the app still reads it with fallback names. Move to one heading name per field. |
| Needs data | Probed, but the record tried returned no rows. Shape still unknown. |
| Blocked | The gateway fails on this code (see §10). Needs a backend fix. |
| Not probed | Not sent yet. The reason is given. |
| Not wired | The app doesn't use this code yet |

## Codes

Probed on 2026-10-30 with a test login unless stated.

| Action code | R/W | Probed | Shape | Headings OK? | Status | Notes |
|---|---|---|---|---|---|---|
| `PROF.S.CHECK_LOGIN_CREDENTIALS` | R | 2026-10-30 | A | Yes | ✅ Migrated | `o_message` = VIP number on success, stored in the session |
| `PROF.S.LOAD_PROFILE` | R | 2026-10-30 | B | No (15 vs 44) | ✅ Migrated | Read with `mapRowsByHeadings` (fails closed when a heading stops coming); the extra values are ignored. `first_name` pairs with the password and Home's welcome line and Personal Info show it (critical backend issue). `last_login` always empty. Unknown login → `["X"]`. Preferences and mailing address are not available, and profile updates are refused. Re-probed 2026-10-30. |
| `PROF.S.USER_ADDRESSES` | R | 2026-10-30 | B | No (16 vs 17) | ✅ Migrated | Mapped by its 16 headings. `address_id` is `"01"` on every row, so update and delete are refused; list keys use the row position. Feeds the Express lists, shifted (`country` = state…). Unknown login → `["X"]` → empty list. Re-probed 2026-10-30. |
| `PROF.S.USER_PROFILE_ADDRESSES` | R | 2026-10-30 | B | Yes (`oCountry…`) | ✅ Migrated | Read by its own `o…` headings; shown in the booking form's address fields. 17 rows for the test login: the frequent-pickup list, not the mailing address (so Update Mailing Address doesn't use it). Unknown login → `"1"` / `ORA-01001`. |
| `PROF.S.CORPORATE_ADDRESSES` | R | 2026-10-30 | B | Yes (`oCountry…`) | ✅ Migrated | As above (loaded only with an account number). 2 rows for the test account; unknown account → 0 rows. |
| `RES.S.VEHICLE_TYPE` | R | 2026-10-30 | B | Partly (2 of 5) | Move to heading-only reads | `[car_type, car_type_name]` only |
| `RES.S.ALL_ORDERS` | R | 2026-10-30 | B | No (10 vs 112) | ✅ Migrated | Read with `mapRowsByHeadings`, one heading per field. `pickup_date` pairs with a first name, so no row can be listed: Home, History and Receipts show their empty states. Dates sent as `MM-DD-YYYY` (test client). Invalid JSON, repaired by `parseBody`. `P_TOTAL_RECORDS` not honoured. |
| `RES.S.UPDATABLE_ORDERS` | R | 2026-10-30 | B | No (10 vs 112) | ✅ Migrated | Same row as `ALL_ORDERS`, but its last two headings are `car_type, number_of_passengers`. Read by its own headings; no row can be listed (same shift), so Upcoming is empty. |
| `RES.S.LOAD_RESERVATION` | R | 2026-10-30 | B | No (39 vs 160) | Move to heading-only reads | Invalid JSON, now repaired |
| `RES.S.ALL_PREDEFINED_QUESTIONS` | R | 2026-10-30 | B | No | Move to heading-only reads | `[question_id, text]` under `o_code/o_message` headings |
| `PROF.S.ACCOUNT_REQUIREMENTS_RS` | R | 2026-10-30 | B | No (4 vs 1) | Needs data | `[["X"]]` for every account tried. The label is read from `o_message` alone (`TODO(schema-unverified)`). Needs an account with requirements. |
| `RES.S.ACCOUNT_REQUIREMENTS_LIST` | R | 2026-10-30 | B | No | Move to heading-only reads | As above |
| `PROF.S.IS_UNIQUE_EMAIL` | R | 2026-10-30 | A | Yes | ✅ Migrated | `"0"` / `Success` free, `"1"` / `Duplicate` taken |
| `PROF.S.IS_VALID_COMPANY_NAME` | R | 2026-10-30 | A | Yes | ✅ Migrated | `"0"` / `Success`, `"1"` / `Invalid` |
| `PROF.S.IS_VALID_VIP` | R | 2026-10-30 | A | Yes | ✅ Migrated | `"0"` / customer name, `"1"` / `Invalid user information` |
| `PROF.S.ACCOUNT_REQUIREMENTS` | R | 2026-10-30 | A | Yes | ✅ Migrated | `"0"` / `Account ok. No requirements`, `"1"` / `Invalid account` |
| `PROF.S.ACCOUNT_VIP_NUM` | R | 2026-10-30 | A | Yes (`pAccountNum, pVIPNum`) | Ready | No `o_code` |
| `RES.S.IS_CREDIT_CARD_SPECIFIC_ACCOUNT` | R | 2026-10-30 | A | Yes | Ready | `"0"` / `Corporate Account` |
| `RES.S.BILLING_METHOD` | R | 2026-10-30 | A | Yes | Ready — review `o_code` | `"1"` = Corporate Account (a method, not an error) |
| `RES.S.GOOGLE_ZONE_NUM` | R | 2026-10-30 | A | Yes | Ready — review `o_code` | `"1"` + zone number in `o_message`, also at 0,0 (`90000999`), so `"1"` doesn't prove a match. Read by heading; the app still matches only on `"0"` (fails closed into the acknowledgement) until the backend documents it. |
| `RES.S.ZONE_THE_LOCATION` | R | 2026-10-30 | A | Yes | Needs data | `[["", ""]]` for every input tried: saved addresses, the test client's sample, an airport, a made-up street. Read by heading (`o_code`, `o_message`); a match is `"0"` with the zone in `o_message` (`TODO(schema-unverified)`). Every Express stop goes to the acknowledgement today. |
| `RES.S.LATITUDE_LONGITUDE_FOR_CAR` | R | 2026-10-30 | A | Yes | Ready — review `o_code` | `"5"` / `No Data Found` |
| `RES.S.COMMUNICATION_LOG` | R | 2026-10-30 | ? | — | Needs data | No rows for the reservation tried |
| `RES.S.VEHICLE_LOG` | R | 2026-10-30 | ? | — | Needs data | No rows for the reservation tried |
| `PROF.S.PROFILE_WHO_GRANTED_ACCESS` | R | 2026-10-30 | B | Yes | ✅ Migrated | Was `LOAD_PROFILE_WHO_GRANTED_ACCESS` (not supported). Headings `oLoginID … oVIPNum`; no rows for the test login. |
| `PROF.S.PROFILE_COLUMN_VALUES` | R | 2026-10-30 | B | Yes | ✅ Migrated | Was `LOAD_PROFILE_COLUMN_VALUES` (not supported). Headings `oColumnId, oColumnValue`; no rows yet. |
| `PROF.S.PROFILE_COLUMN_VALUES_BY_TYPE` | R | 2026-10-30 | B | Yes | ✅ Migrated | Was `LOAD_PROFILE_COLUMN_VALUES_BY_TYPE` (not supported). Headings `oColumnId, oColumnValue`; no rows yet. |
| `PROF.S.CAR_INFO` | R | 2026-10-30 | — | — | Blocked | `ORA-01001: invalid cursor` |
| `RES.S.LOAD_RESERVATION_COLUMN_SINGLE_VALUE` | R | 2026-10-30 | — | — | Blocked | `ORA-01400`: the select tries an INSERT |
| `RES.S.LOAD_RESERVATION_COLUMN_VALUES_BY_TYPE` | R | — | — | — | Not probed | Its sibling above writes. Ask the backend first. |
| `RES.S.VERIFY_ACCOUNT_REQUIREMENTS` | R | — | — | — | Not probed | Needs an account with requirements |
| `RES.S.CREDIT_CARD_APPROVAL` | R | — | — | — | Not probed | Needs a request number from `RES.I.CREDIT_CARD_APPROVAL` |
| `PROF.S.PASSWORD` | R | 2026-10-30 | A | Yes | ✅ Migrated | `"0"` / `Sendmail`. Sent once through the app for the test login, which mailed one real e-mail. |
| `RES.I.RESERVATION` | W | — | — | — | Not probed: writes data | Creates a real reservation |
| `RES.U.RESERVATION` | W | — | — | — | Not probed: writes data | |
| `RES.U.CANCEL_RESERVATION` | W | — | — | — | Not probed: writes data | |
| `RES.I.CREDIT_CARD_APPROVAL` | W | — | — | — | Not probed: writes data | Sends a card authorisation |
| `RES.I.RESERVATION_COLUMN_VALUE` | W | — | — | — | Not probed: writes data | |
| `RES.U.RESERVATION_COLUMN_VALUE` | W | — | — | — | Not probed: writes data | |
| `RES.D.RESERVATION_COLUMN_VALUE` | W | — | — | — | Not probed: writes data | |
| `RES.U.FORMAT_EMAIL_MESSAGE` | W | — | — | — | Not probed: writes data | Sends an e-mail |
| `RES.I.ASKED_QUESTIONS` | W | — | — | — | Not probed: writes data | |
| `PROF.U.PASSWORD` | W | — | — | — | Not probed: writes data | Changes the test login's password |
| `PROF.I.PROFILE` | W | 2026-10-30 | A | Yes | Blocked | One real corporate create: `"9"` / `ORA-12899 … PREFERRED_KNOCKOFF_CODE (actual: 2, maximum: 1)`. No profile created. The backend must say which parameter fills that column and its codes (likely `P_CONFIRMATION_METHOD`). |
| `PROF.U.PROFILE` | W | — | — | — | Not probed: writes data | Replaces the whole profile. Refused in the app while `LOAD_PROFILE` has values past its last heading, so it can't be sent until the backend fixes that. Value codes follow the test client (`P_COUNTRY 01`, `P_ADDRESS_TYPE HOME`). The answer read is `o_code` / `o_message` by heading; `"0"` = saved is unverified. |
| `PROF.I.USER_ADDRESS` | W | — | — | — | Not probed: writes data | |
| `PROF.U.USER_ADDRESS` | W | — | — | — | Not probed: writes data | |
| `PROF.D.USER_ADDRESS` | W | — | — | — | Not probed: writes data | |
| `PROF.I.PROFILE_COLUMN_VALUE` | W | — | — | — | Not probed: writes data | Its list code is not supported |
| `PROF.U.PROFILE_COLUMN_VALUE` | W | — | — | — | Not probed: writes data | |
| `PROF.D.PROFILE_COLUMN_VALUE` | W | — | — | — | Not probed: writes data | |
| `PROF.U.BLOCK_DRIVER`, `PROF.U.UNBLOCK_DRIVER` | W | — | — | — | Not wired | |
| `PROF.U.GRANT_ACCESS_RIGHTS`, `PROF.U.REVOKE_ACCESS_RIGHTS`, `PROF.S.LOAD_MATCHING_PROFILE_LIST`, `PROF.S.GRANT_ACCESS_RIGHTS_TO_ALL`, `PROF.U.GRANT_ACCESS_RIGHTS_TO_ALL`, `PROF.U.REVOKE_ACCESS_RIGHTS_TO_ALL`, `PROF.S.LOAD_ACCESS_RIGHTS_GRANTED_PROFILE` | R/W | — | — | — | Not wired | |
| `PROF.S.DB_LOG_ERROR` | W | — | — | — | Not wired | Writes a log entry |

## Migration order

Every code moves to **heading-only reads** (guide §4): pair each heading with its value, ignore values past the last heading, never name extra positions, and use one heading name per field.

1. ✅ `PROF.S.CHECK_LOGIN_CREDENTIALS`, `PROF.S.LOAD_PROFILE`, `PROF.S.USER_ADDRESSES`, `PROF.S.USER_PROFILE_ADDRESSES`, `PROF.S.CORPORATE_ADDRESSES`: migrated.
2. `RES.S.VEHICLE_TYPE`, `RES.S.ALL_PREDEFINED_QUESTIONS`.
3. ✅ `RES.S.ALL_ORDERS` / `UPDATABLE_ORDERS` (Home, History, Upcoming); next `RES.S.LOAD_RESERVATION`.
4. The booking-wizard lookups (shape A, `o_code` meanings per guide §10).
5. Write codes, once the backend agrees a test record and account to use.

## Backend issues to raise

- **Headings don't match the data** for most record sets (see the Shape B rows). The gateway should send the cursor's real column names.
- **Sensitive data:** `PROF.S.LOAD_PROFILE` returns the plaintext password and the full card number.
- **Invalid JSON:** backslashes in the receipt-image path (`\\192.168.168.19\Receipt_Images\…`) and quotes in Oracle error messages are not escaped.
- **Raw Oracle errors** reach the client in `JHeader.Message`.
- **`RES.S.LOAD_RESERVATION_COLUMN_SINGLE_VALUE` performs an INSERT**, failing with ORA-01400.
- **`PROF.I.PROFILE` fails in the database:** `ORA-12899` on `T_VIP_PROFILE.PREFERRED_KNOCKOFF_CODE` (a 2-character value into a 1-character column). Which parameter fills it, and its codes, are needed. Codes still missing from any sample: card `P_PAYMENT_TYPE`, office `P_ADDRESS_TYPE`, phone `P_CONFIRMATION_METHOD`, non-US `P_COUNTRY`, and what `P_CAR_YEAR` / `P_CAR_PHONE` hold.
- **Broken:** `PROF.S.CAR_INFO` (ORA-01001).
- **`P_TOTAL_RECORDS` is ignored** by `RES.S.ALL_ORDERS`.
- **`o_code` conventions differ per code** (`BILLING_METHOD`, `GOOGLE_ZONE_NUM`, `LATITUDE_LONGITUDE_FOR_CAR`). Ask for the documented outputs of each procedure.
- **`PROF.S.LOAD_PROFILE` shows the password (critical).** Its `first_name` heading pairs with the plaintext password, so the app's welcome line ("Welcome back, …") and the Personal Info first-name field display it. Every other heading is shifted too (`last_name` = first name, `email` = last name).
- **`PROF.S.LOAD_PROFILE` has no mailing-address or preference headings.** The mailing address's country code, state and city sit past the last heading, so Update Mailing Address and Preferences can't show anything, and `PROF.U.PROFILE` can't be sent.
- **`PROF.S.USER_ADDRESSES` is shifted by one** (`country` = the state, `city` = the ZIP…) and `address_id` is `"01"` on every row. The Express lists on Home show the shifted values.
- **`RES.S.ALL_ORDERS` / `UPDATABLE_ORDERS` are shifted:** `reservation_num` = the login id and `pickup_date` = a first name, so no ride can be listed on Home, History, Upcoming or Receipts.
- **`RES.S.ZONE_THE_LOCATION` never zones:** `[["", ""]]` for every input tried, including the test client's own sample.

## Questions for the backend

- **`PROF.U.PROFILE`:** does it keep omitted parameters unchanged, or must every parameter be sent? What does it answer (`o_code` / `o_message`) on success and on refusal?
- **`PROF.U.PROFILE` value codes** with no sample: office `P_ADDRESS_TYPE`, phone `P_CONFIRMATION_METHOD` (the update sample sends `''`), non-US `P_COUNTRY`.
- **Apt # / Mail stop:** the test client fills `P_CROSS_STREET1` / `P_CROSS_STREET2` with two cross streets. Which parameter takes the apartment / mail stop?
- **Mailing address:** which code returns the profile's mailing address, and under which headings?
- **`last_login`:** when is it filled, and in which format?
- **`RES.S.GOOGLE_ZONE_NUM`:** what marks "outside the service area"? `0, 0` answered `"1"` / `90000999`.
- **`RES.S.ZONE_THE_LOCATION`:** which input zones a street, and what does a match answer?
- **`RES.S.ALL_ORDERS` dates:** the test client sends `MM-DD-YYYY` and no `P_TOTAL_RECORDS`; the contract has `MM/DD/YYYY` and `P_TOTAL_RECORDS`. Which is right? Both returned the same rows.
- **Announcements ("What's New") on Home:** is there an action code for them?
