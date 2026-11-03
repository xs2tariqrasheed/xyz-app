# XYZ Real Action Codes — migration tracker

Which action codes are moved from the stub's dummy data to the gateway's **real** responses. Parameters are in [XYZ Action Codes.md](XYZ%20Action%20Codes.md). What each code really returns (its shape, column positions and `o_code` meanings) is in [XYZ_INTEGRATION_GUIDE.md §10](XYZ_INTEGRATION_GUIDE.md#10-actual-responses-by-action-code).

**Migrating a code:**
1. Probe it: `npm run gateway:probe -- <CODE> '<JData JSON>'`.
2. Record the response in guide §10.
3. Map it in its service, by the heading names §10 records.
4. Verify it in the app.
5. Set its status here to ✅.
6. Once every code a module uses is ✅ (or recorded as Blocked / Needs data / Not probed with its reason), give the module guide in `reverse-engineer-implemented/guide/` a **Gateway (real data)** section, and add this line under its `✅ Implemented` banner:
   `> ✅ **Migrated to real gateway data** (<date>): the module's action codes are mapped by heading from the gateway's real responses. Each code's real answer, and any code not yet answered or confirmed, is in §N Gateway (real data).`

**Module guides migrated:** 03 Forgot password, 04 Registration, 06 Member home & Express ride, 07 Personal info, 08 Mailing address, 09 Preferences.

Never probe a write code without an agreed test record.

## Status key

| Status | Meaning |
|---|---|
| ✅ Migrated | Real response inspected. The app reads it by the headings the code sends, one name per field |
| Remap to new headings | Was ✅ Migrated, but the gateway renamed its headings on 2026-11-03 (guide §10). The app still reads the old names, so the call fails closed until the service is remapped |
| Ready | Probed. Headings match the row (shape A), so `mapRows` works. Check the service against the `o_code` meanings in §10. |
| Ready — review `o_code` | As Ready, but `o_code` doesn't mean "0 = success" for this code. The service's checks must change. |
| Move to heading-only reads | Probed, but the app still reads it with fallback names. Move to one heading name per field. |
| Needs data | Probed, but the record tried returned no rows. Shape still unknown. |
| Blocked | The gateway fails on this code (see §10). Needs a backend fix. |
| Not probed | Not sent yet. The reason is given. |
| Not wired | The app doesn't use this code yet |

## Codes

Probed on 2026-10-30 with a test login unless stated. Every migrated read code was re-probed on 2026-11-03: each row now has one value per heading, and the record sets' headings were renamed to lower case without underscores (guide §10).

| Action code | R/W | Probed | Shape | Headings OK? | Status | Notes |
|---|---|---|---|---|---|---|
| `PROF.S.CHECK_LOGIN_CREDENTIALS` | R | 2026-10-30 | A | Yes | ✅ Migrated | `o_message` = VIP number on success, stored in the session |
| `PROF.S.LOAD_PROFILE` | R | 2026-11-03 | B | Yes (44 = 44, renamed) | Remap to new headings | Now `ologinid, opassword, ofirstname, …` with each value under its own heading, including the mailing address and the preferences. `oelastlogindate` is filled. The app still reads `first_name`, …, so the profile load fails until `toProfileRow` is remapped. |
| `PROF.S.USER_ADDRESSES` | R | 2026-11-03 | B | Yes (17 = 17, renamed) | Remap to new headings | Now the same 17 headings as `USER_PROFILE_ADDRESSES` (`ocountry … oelastservicedate`). No `address_id`: the row id for update / delete (`oepickupcount` or `oerowid`) is to confirm. 20 rows. |
| `PROF.S.USER_PROFILE_ADDRESSES` | R | 2026-11-03 | B | Yes (renamed: `ocountry…`) | Remap to new headings | Was `oCountry…`. 17 rows for the test login: the frequent-pickup list, not the mailing address. |
| `PROF.S.CORPORATE_ADDRESSES` | R | 2026-11-03 | B | Yes (renamed: `ocountry…`) | Remap to new headings | Was `oCountry…`. Loaded only with an account number; 2 rows for the test account. |
| `RES.S.VEHICLE_TYPE` | R | 2026-11-03 | B | Yes (2 = 2, renamed) | Remap to new headings | `oevehiclecode, oevehicledesc`; 5 rows. Was 5 headings / 2 values. |
| `RES.S.ALL_ORDERS` | R | 2026-11-03 | B | Yes (112 = 112, renamed) | Remap to new headings | Each value now under its own heading (`oreservationnumber`, `oreservationdate`, `oecurrentstatusdesc`, …; list in guide §10). 15 rows. No voucher or feedback heading. Dates sent as `MM-DD-YYYY` (test client). Invalid JSON, repaired by `parseBody`. |
| `RES.S.UPDATABLE_ORDERS` | R | 2026-11-03 | B | Yes (112 = 112, renamed) | Remap to new headings | The same 112 headings as `ALL_ORDERS`; 4 rows. |
| `RES.S.LOAD_RESERVATION` | R | 2026-11-03 | B | Yes (160 = 160) | Remap to new headings | The order headings without `oresdate`, plus 48 more (fare breakdown, driver, car…). `oecarnum` is sent twice. Invalid JSON, repaired. |
| `RES.S.ALL_PREDEFINED_QUESTIONS` | R | 2026-11-03 | B | Yes (2 = 2, renamed) | Remap to new headings | `question_id, question`; 2 rows. Was under `o_code / o_message` headings. |
| `PROF.S.ACCOUNT_REQUIREMENTS_RS` | R | 2026-11-03 | B | Yes (1 = 1) | Needs data | One `dummy` heading, `[["X"]]` for the test account. The label is read from `o_message` alone (`TODO(schema-unverified)`). Needs an account with requirements. |
| `RES.S.ACCOUNT_REQUIREMENTS_LIST` | R | 2026-11-03 | B | Yes (1 = 1) | Needs data | As above |
| `PROF.S.IS_UNIQUE_EMAIL` | R | 2026-10-30 | A | Yes | ✅ Migrated | `"0"` / `Success` free, `"1"` / `Duplicate` taken |
| `PROF.S.IS_VALID_COMPANY_NAME` | R | 2026-10-30 | A | Yes | ✅ Migrated | `"0"` / `Success`, `"1"` / `Invalid` |
| `PROF.S.IS_VALID_VIP` | R | 2026-10-30 | A | Yes | ✅ Migrated | `"0"` / customer name, `"1"` / `Invalid user information` |
| `PROF.S.ACCOUNT_REQUIREMENTS` | R | 2026-10-30 | A | Yes | ✅ Migrated | `"0"` / `Account ok. No requirements`, `"1"` / `Invalid account` |
| `PROF.S.ACCOUNT_VIP_NUM` | R | 2026-11-03 | A | Yes (renamed: `paccountnum, pvipnum`) | Ready | No `o_code`. Was `pAccountNum, pVIPNum`. |
| `RES.S.IS_CREDIT_CARD_SPECIFIC_ACCOUNT` | R | 2026-10-30 | A | Yes | Ready | `"0"` / `Corporate Account` |
| `RES.S.BILLING_METHOD` | R | 2026-10-30 | A | Yes | Ready — review `o_code` | `"1"` = Corporate Account (a method, not an error) |
| `RES.S.GOOGLE_ZONE_NUM` | R | 2026-10-30 | A | Yes | Ready — review `o_code` | `"1"` + zone number in `o_message`, also at 0,0 (`90000999`), so `"1"` doesn't prove a match. Read by heading; the app still matches only on `"0"` (fails closed into the acknowledgement) until the backend documents it. |
| `RES.S.ZONE_THE_LOCATION` | R | 2026-10-30 | A | Yes | Needs data | `[["", ""]]` for every input tried: saved addresses, the test client's sample, an airport, a made-up street. Read by heading (`o_code`, `o_message`); a match is `"0"` with the zone in `o_message` (`TODO(schema-unverified)`). Every Express stop goes to the acknowledgement today. |
| `RES.S.LATITUDE_LONGITUDE_FOR_CAR` | R | 2026-11-03 | A | Yes (renamed: `o_latitude, o_longitude`) | Ready — review `o_code` | `"5"` / `No Data Found`. Was `o_Latitude, o_Longitude`. |
| `RES.S.COMMUNICATION_LOG` | R | 2026-11-03 | ? | — | Needs data | No headings and no rows for the reservation tried |
| `RES.S.VEHICLE_LOG` | R | 2026-11-03 | B | Yes (6) | Needs data | `oetrackingdate, oetrackingtime, oestatuscode, oestatusdesc, oelongitude, oelatitude`; no rows for the reservation tried |
| `PROF.S.PROFILE_WHO_GRANTED_ACCESS` | R | 2026-11-03 | B | Yes (renamed) | Remap to new headings | Was `LOAD_PROFILE_WHO_GRANTED_ACCESS` (not supported). Headings now `ologinid, ofirstname, olastname, ophonenumberus, ophoneextus, oaccountnum, ovipnum` (were `oLoginID … oVIPNum`); no rows for the test login. |
| `PROF.S.PROFILE_COLUMN_VALUES` | R | 2026-11-03 | B | Yes (renamed) | Remap to new headings | Was `LOAD_PROFILE_COLUMN_VALUES` (not supported). Headings now `ocolumnid, ocolumnvalue` (were `oColumnId, oColumnValue`); no rows yet. |
| `PROF.S.PROFILE_COLUMN_VALUES_BY_TYPE` | R | 2026-11-03 | B | Yes (renamed) | Remap to new headings | Was `LOAD_PROFILE_COLUMN_VALUES_BY_TYPE` (not supported). Headings now `ocolumnid, ocolumnvalue`; one row for `P_COLUMN_ID` 2. |
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
| `PROF.U.PROFILE` | W | — | — | — | Not probed: writes data | Replaces the whole profile. Value codes follow the test client (`P_COUNTRY 01`, `P_ADDRESS_TYPE HOME`). The answer read is `o_code` / `o_message` by heading; `"0"` = saved is unverified. |
| `PROF.I.USER_ADDRESS` | W | — | — | — | Not probed: writes data | |
| `PROF.U.USER_ADDRESS` | W | — | — | — | Not probed: writes data | |
| `PROF.D.USER_ADDRESS` | W | — | — | — | Not probed: writes data | |
| `PROF.I.PROFILE_COLUMN_VALUE` | W | — | — | — | Not probed: writes data | Its list code is not supported |
| `PROF.U.PROFILE_COLUMN_VALUE` | W | — | — | — | Not probed: writes data | |
| `PROF.D.PROFILE_COLUMN_VALUE` | W | — | — | — | Not probed: writes data | |
| `PROF.U.BLOCK_DRIVER`, `PROF.U.UNBLOCK_DRIVER` | W | — | — | — | Not wired | |
| `PROF.S.MATCHING_PROFILE_LIST` | R | 2026-10-30 | B | Yes (`oLoginID … oVIPNum`) | Not wired | Was listed as `LOAD_MATCHING_PROFILE_LIST`. Returns other customers' profiles (15 rows for the test login); no preference columns. |
| `PROF.S.ACCESS_RIGHTS_GRANTED_PROFILE` | R | 2026-10-30 | B | Yes (same 7) | Not wired | Was listed as `LOAD_ACCESS_RIGHTS_GRANTED_PROFILE`. Needs `P_LOGIN_ID_FROM`; 0 rows for the test login. |
| `PROF.I.ACCESS_RIGHTS`, `PROF.D.ACCESS_RIGHTS`, `PROF.S.GRANT_ACCESS_RIGHTS_TO_ALL`, `PROF.U.GRANT_ACCESS_RIGHTS_TO_ALL`, `PROF.U.REVOKE_ACCESS_RIGHTS_TO_ALL` | R/W | — | — | — | Not wired | Names as the backend test client lists them. |
| `PROF.S.DB_LOG_ERROR` | W | — | — | — | Not wired | Writes a log entry |

## Migration order

Every code is read by the heading names it sends (guide §4), one name per field.

0. Remap every code marked **Remap to new headings** to the 2026-11-03 headings in guide §10, module by module (profile, addresses, orders, reservation, lookups).

1. ✅ `PROF.S.CHECK_LOGIN_CREDENTIALS`, `PROF.S.LOAD_PROFILE`, `PROF.S.USER_ADDRESSES`, `PROF.S.USER_PROFILE_ADDRESSES`, `PROF.S.CORPORATE_ADDRESSES`: migrated.
2. `RES.S.VEHICLE_TYPE`, `RES.S.ALL_PREDEFINED_QUESTIONS`.
3. ✅ `RES.S.ALL_ORDERS` / `UPDATABLE_ORDERS` (Home, History, Upcoming); next `RES.S.LOAD_RESERVATION`.
4. The booking-wizard lookups (shape A, `o_code` meanings per guide §10).
5. Write codes, once the backend agrees a test record and account to use.

## Backend issues to raise

- **Sensitive data:** `PROF.S.LOAD_PROFILE` returns the plaintext password and the full card number.
- **Invalid JSON:** backslashes in the receipt-image path (`\\192.168.168.19\Receipt_Images\…`) and quotes in Oracle error messages are not escaped.
- **Raw Oracle errors** reach the client in `JHeader.Message`.
- **`RES.S.LOAD_RESERVATION_COLUMN_SINGLE_VALUE` performs an INSERT**, failing with ORA-01400.
- **`PROF.I.PROFILE` fails in the database:** `ORA-12899` on `T_VIP_PROFILE.PREFERRED_KNOCKOFF_CODE` (a 2-character value into a 1-character column). Which parameter fills it, and its codes, are needed. Codes still missing from any sample: card `P_PAYMENT_TYPE`, office `P_ADDRESS_TYPE`, phone `P_CONFIRMATION_METHOD`, non-US `P_COUNTRY`, and what `P_CAR_YEAR` / `P_CAR_PHONE` hold.
- **Broken:** `PROF.S.CAR_INFO` (ORA-01001).
- **`P_TOTAL_RECORDS` is ignored** by `RES.S.ALL_ORDERS`.
- **`o_code` conventions differ per code** (`BILLING_METHOD`, `GOOGLE_ZONE_NUM`, `LATITUDE_LONGITUDE_FOR_CAR`). Ask for the documented outputs of each procedure.
- **`RES.S.LOAD_RESERVATION` sends the `oecarnum` heading twice** (positions 75 and 118). `mapRows` keeps the later value.
- **Fixed 2026-11-03:** record-set headings now match their values (`LOAD_PROFILE`, `USER_ADDRESSES`, the order codes and the rest). The headings were renamed at the same time.
- **`RES.S.ZONE_THE_LOCATION` never zones:** `[["", ""]]` for every input tried, including the test client's own sample.

## Questions for the backend

- **`PROF.U.PROFILE`:** does it keep omitted parameters unchanged, or must every parameter be sent? What does it answer (`o_code` / `o_message`) on success and on refusal?
- **`PROF.U.PROFILE` value codes** with no sample: office `P_ADDRESS_TYPE`, phone `P_CONFIRMATION_METHOD` (the update sample sends `''`), non-US `P_COUNTRY`.
- **Apt # / Mail stop:** the test client fills `P_CROSS_STREET1` / `P_CROSS_STREET2` with two cross streets. Which parameter takes the apartment / mail stop?
- **Preferences:** `LOAD_PROFILE` now sends `oconfirmationmethod` and `ospecialoffer` (guide §10). What are the `P_CONFIRMATION_METHOD` codes for phone and for "None" (guide 09 §5)? Does `''` in the `PROF.U.PROFILE` sample mean None, or "leave unchanged"? Is `Y` the `P_SPECIAL_OFFER` opt-in?
- **`RES.S.GOOGLE_ZONE_NUM`:** what marks "outside the service area"? `0, 0` answered `"1"` / `90000999`.
- **`RES.S.ZONE_THE_LOCATION`:** which input zones a street, and what does a match answer?
- **`RES.S.ALL_ORDERS` dates:** the test client sends `MM-DD-YYYY` and no `P_TOTAL_RECORDS`; the contract has `MM/DD/YYYY` and `P_TOTAL_RECORDS`. Which is right? Both returned the same rows.
- **Announcements ("What's New") on Home:** is there an action code for them?
