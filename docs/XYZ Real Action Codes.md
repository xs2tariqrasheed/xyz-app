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
| `PROF.S.LOAD_PROFILE` | R | 2026-11-03 | B | Yes (44 = 44, renamed) | ✅ Migrated | Remapped 2026-11-03: read by `ofirstname`, `olastname`, the phone and fax headings, `oeemailaddress`, `oaccountnum`, `oelastlogindate` (date only, "Last login {date}"), the mailing-address headings and `oconfirmationmethod` / `ospecialoffer`. International and fax numbers are `<code>-<number>` (to confirm). `opassword` / `ocardnumber` / `overifycode` are never read. |
| `PROF.S.USER_ADDRESSES` | R | 2026-11-03 | B | Yes (17 = 17, renamed) | ✅ Migrated | Remapped 2026-11-03 to the shared 17 headings. The row id for update / delete is `oepickupcount` (`TODO(schema-unverified)`, or `oerowid`). 20 rows. |
| `PROF.S.USER_PROFILE_ADDRESSES` | R | 2026-11-03 | B | Yes (renamed: `ocountry…`) | ✅ Migrated | Remapped 2026-11-03 (same 17 headings). The frequent-pickup list, not the mailing address. 17 rows. |
| `PROF.S.CORPORATE_ADDRESSES` | R | 2026-11-03 | B | Yes (renamed: `ocountry…`) | ✅ Migrated | Remapped 2026-11-03 (same 17 headings). Loaded only with an account number; 2 rows for the test account. |
| `RES.S.VEHICLE_TYPE` | R | 2026-11-03 | B | Yes (2 = 2, renamed) | Remap to new headings | `oevehiclecode, oevehicledesc`; 5 rows. Was 5 headings / 2 values. |
| `RES.S.ALL_ORDERS` | R | 2026-11-03 | B | Yes (112 = 112, renamed) | ✅ Migrated | Remapped 2026-11-03 (`ORDER_HEADINGS`). Status from `oecallstatusdesc` + `oecurrentstatusdesc`; actions from the `oecan*` / `oeinvoiceposted` flags; `opaymentmethod` `1` = account, other codes "not available". No voucher-number or feedback heading. 15 rows. Invalid JSON, repaired by `parseBody`. |
| `RES.S.UPDATABLE_ORDERS` | R | 2026-11-03 | B | Yes (112 = 112, renamed) | ✅ Migrated | Remapped 2026-11-03: same headings and mapping as `ALL_ORDERS`; 4 rows. |
| `RES.S.LOAD_RESERVATION` | R | 2026-11-03 | B | Yes (160 = 160) | Remap to new headings | The order headings without `oresdate`, plus 48 more (fare breakdown, driver, car…). `oecarnum` is sent twice. Invalid JSON, repaired. |
| `RES.S.ALL_PREDEFINED_QUESTIONS` | R | 2026-11-03 | B | Yes (2 = 2, renamed) | Remap to new headings | `question_id, question`; 2 rows. Was under `o_code / o_message` headings. |
| `PROF.S.ACCOUNT_REQUIREMENTS_RS` | R | 2026-11-03 | B | Yes (1 = 1) | ✅ Migrated | One `dummy` heading (`"X"`) = **no requirements** (same answer in the backend test client for `99005`), read as no fields. A real requirement's label is read from `o_message` (`TODO(schema-unverified)`): no account with requirements known yet. |
| `RES.S.ACCOUNT_REQUIREMENTS_LIST` | R | 2026-11-03 | B | Yes (1 = 1) | Needs data | As above |
| `PROF.S.IS_UNIQUE_EMAIL` | R | 2026-10-30 | A | Yes | ✅ Migrated | `"0"` / `Success` free, `"1"` / `Duplicate` taken |
| `PROF.S.IS_VALID_COMPANY_NAME` | R | 2026-10-30 | A | Yes | ✅ Migrated | `"0"` / `Success`, `"1"` / `Invalid` |
| `PROF.S.IS_VALID_VIP` | R | 2026-10-30 | A | Yes | ✅ Migrated | `"0"` / customer name, `"1"` / `Invalid user information` |
| `PROF.S.ACCOUNT_REQUIREMENTS` | R | 2026-10-30 | A | Yes | ✅ Migrated | `"0"` / `Account ok. No requirements`, `"1"` / `Invalid account` |
| `PROF.S.ACCOUNT_VIP_NUM` | R | 2026-11-03 | A | Yes (`paccountnum, pvipnum`) | ✅ Migrated | No `o_code`. Read by its two headings (`toAccountOnFile`); an unknown login answers both blank = nothing on file. Pre-fills the booking's Billing step. |
| `RES.S.IS_CREDIT_CARD_SPECIFIC_ACCOUNT` | R | 2026-10-30 | A | Yes | Ready | `"0"` / `Corporate Account` |
| `RES.S.BILLING_METHOD` | R | 2026-10-30 | A | Yes | Ready — review `o_code` | `"1"` = Corporate Account (a method, not an error) |
| `RES.S.GOOGLE_ZONE_NUM` | R | 2026-10-30 | A | Yes | Ready — review `o_code` | `"1"` + zone number in `o_message`, also at 0,0 (`90000999`), so `"1"` doesn't prove a match. Read by heading; the app still matches only on `"0"` (fails closed into the acknowledgement) until the backend documents it. |
| `RES.S.ZONE_THE_LOCATION` | R | 2026-10-30 | A | Yes | Needs data | `[["", ""]]` for every input tried: saved addresses, the test client's sample, an airport, a made-up street. Read by heading (`o_code`, `o_message`); a match is `"0"` with the zone in `o_message` (`TODO(schema-unverified)`). Every Express stop goes to the acknowledgement today. |
| `RES.S.LATITUDE_LONGITUDE_FOR_CAR` | R | 2026-11-03 | A | Yes (renamed: `o_latitude, o_longitude`) | Ready — review `o_code` | `"5"` / `No Data Found`. Was `o_Latitude, o_Longitude`. |
| `RES.S.COMMUNICATION_LOG` | R | 2026-11-03 | ? | — | Needs data | No headings and no rows for the reservation tried |
| `RES.S.VEHICLE_LOG` | R | 2026-11-03 | B | Yes (6) | Needs data | `oetrackingdate, oetrackingtime, oestatuscode, oestatusdesc, oelongitude, oelatitude`; no rows for the reservation tried |
| `PROF.S.PROFILE_WHO_GRANTED_ACCESS` | R | 2026-11-03 | B | Yes (renamed) | ✅ Migrated | Remapped 2026-11-03: reads `ologinid, ofirstname, olastname`. No rows for the test login. |
| `PROF.S.PROFILE_COLUMN_VALUES` | R | 2026-11-03 | B | Yes (renamed) | ✅ Migrated | Remapped 2026-11-03: reads `ocolumnid, ocolumnvalue`. No rows yet. |
| `PROF.S.PROFILE_COLUMN_VALUES_BY_TYPE` | R | 2026-11-03 | B | Yes (renamed) | ✅ Migrated | Remapped 2026-11-03: reads `ocolumnvalue`. One row for `P_COLUMN_ID` 2. |
| `PROF.S.CAR_INFO` | R | 2026-11-03 | B | Yes (6 = 6) | ✅ Migrated | No longer fails. Car `100`: `driver_1st, color, make, model, model_year, 'wc_tlc_sticker_num'`; unknown cars: no headings / rows. Read by the first five (`toCarInfo`); keyed by the record's `oecarnum` (empty on the test rides). |
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
| `PROF.U.PASSWORD` | W | 2026-11-03 | A | Yes | ✅ Migrated | Probed with the same password: `"0"` / `Changed`; wrong old password `"1"` / `Invalid info`. A missing `o_code` now fails closed. |
| `PROF.I.PROFILE` | W | 2026-11-03 | A | Yes | Blocked | Second create (`P_CONFIRMATION_METHOD` / `P_CAR_YEAR` blank) answered `"0"` / `Saved` but **stored nothing** (login unknown, e-mail still free). First create: `"9"` / `ORA-12899 … PREFERRED_KNOCKOFF_CODE`. `"9"` now shows the app's own copy. |
| `PROF.U.PROFILE` | W | 2026-11-03 | A | Yes | ✅ Migrated | No-op with all 38 parameters: `"0"` / `Success`, profile unchanged. Only 7 parameters: `"9"` / `ORA-01843`, so the app now sends every parameter with its loaded value (password and card passed through) and only the edited fields replaced. `"9"` shows the screen's own copy. |
| `PROF.I.USER_ADDRESS` | W | 2026-11-03 | A | Yes | Not probed: writes data | One add sent from the app (`P_STATE` `New york`): `"9"` / `ORA-12899 … T_VIP_PICKUP.STATE (actual: 8, maximum: 2)`, invalid JSON (unescaped quotes), nothing stored. The form now requires the 2-letter state code and sends it uppercased. A successful add has not been seen. `P_COUNTRY` is sent as the ISO code (`US`), while stored rows hold `01`: unconfirmed. |
| `PROF.U.USER_ADDRESS` | W | — | — | — | Not probed: writes data | No agreed test record yet. Answer read as `o_code` / `o_message` by exact name; `P_PICKUP_COUNT` ← `oepickupcount` (`TODO(schema-unverified)`). |
| `PROF.D.USER_ADDRESS` | W | — | — | — | Not probed: writes data | No agreed test record yet. Answer read as `o_code` / `o_message` by exact name; `P_PICKUP_COUNT` ← `oepickupcount` (`TODO(schema-unverified)`). |
| `PROF.I.PROFILE_COLUMN_VALUE` | W | 2026-11-03 | A | Yes | Blocked | `"0"` / `Success`, but the value is **never stored** (no list shows it; update / delete can't find it). `P_COLUMN_ID` as a number is accepted. |
| `PROF.U.PROFILE_COLUMN_VALUE` | W | 2026-11-03 | A | Yes | ✅ Migrated | `"2"` / `Record does not Exist. Cannot update value.` for an unknown value, shown as sent. A successful update can't be seen until the add stores data. |
| `PROF.D.PROFILE_COLUMN_VALUE` | W | 2026-11-03 | A | Yes | ✅ Migrated | `"2"` / `Record does not Exist. Cannot delete value.` for an unknown value, shown as sent. |
| `PROF.U.BLOCK_DRIVER`, `PROF.U.UNBLOCK_DRIVER` | W | — | — | — | Not wired | |
| `PROF.S.MATCHING_PROFILE_LIST` | R | 2026-10-30 | B | Yes (`oLoginID … oVIPNum`) | Not wired | Was listed as `LOAD_MATCHING_PROFILE_LIST`. Returns other customers' profiles (15 rows for the test login); no preference columns. |
| `PROF.S.ACCESS_RIGHTS_GRANTED_PROFILE` | R | 2026-10-30 | B | Yes (same 7) | Not wired | Was listed as `LOAD_ACCESS_RIGHTS_GRANTED_PROFILE`. Needs `P_LOGIN_ID_FROM`; 0 rows for the test login. |
| `PROF.I.ACCESS_RIGHTS`, `PROF.D.ACCESS_RIGHTS`, `PROF.S.GRANT_ACCESS_RIGHTS_TO_ALL`, `PROF.U.GRANT_ACCESS_RIGHTS_TO_ALL`, `PROF.U.REVOKE_ACCESS_RIGHTS_TO_ALL` | R/W | — | — | — | Not wired | Names as the backend test client lists them. |
| `PROF.S.DB_LOG_ERROR` | W | — | — | — | Not wired | Writes a log entry |

## Migration order

Every code is read by the heading names it sends (guide §4), one name per field.

0. ✅ Profile, addresses, orders, grantors and contacts remapped to the 2026-11-03 headings. Still to remap: `RES.S.LOAD_RESERVATION`, `RES.S.VEHICLE_TYPE`, `RES.S.ALL_PREDEFINED_QUESTIONS`.

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
- **`P_TOTAL_RECORDS` is ignored** by `RES.S.ALL_ORDERS`.
- **`o_code` conventions differ per code** (`BILLING_METHOD`, `GOOGLE_ZONE_NUM`, `LATITUDE_LONGITUDE_FOR_CAR`). Ask for the documented outputs of each procedure.
- **Insert codes report success without storing anything:** `PROF.I.PROFILE` answers `"0"` / `Saved` and `PROF.I.PROFILE_COLUMN_VALUE` answers `"0"` / `Success`, but neither record can be read back (2026-11-03).
- **`PROF.U.PROFILE` needs every parameter**, so the client must send back the stored password and full card number that `LOAD_PROFILE` returns. An update that leaves them out fails with `ORA-01843`.
- **`PROF.S.CAR_INFO`'s last heading is `'wc_tlc_sticker_num'`** (with quotes) and its value is the placeholder `WC_TLC_STICKER_NUM`.
- **`RES.S.LOAD_RESERVATION` sends the `oecarnum` heading twice** (positions 75 and 118). `mapRows` keeps the later value.
- **Fixed 2026-11-03:** record-set headings now match their values (`LOAD_PROFILE`, `USER_ADDRESSES`, the order codes and the rest). The headings were renamed at the same time.
- **`RES.S.ZONE_THE_LOCATION` never zones:** `[["", ""]]` for every input tried, including the test client's own sample.

## Questions for the backend

- **Phone format:** `ophonenumber`, `ofax`, `oaddressphone` and `ophonenum` look like `<calling code>-<number>` (`212-` when empty). Is that the format, and is the US value (`ophonenumberus` `212`) a full number?
- **Address row id:** do `PROF.U.USER_ADDRESS` / `PROF.D.USER_ADDRESS` take `oepickupcount` or `oerowid` as `P_PICKUP_COUNT`?
- **Order codes:** the full lists for `oecallstatus(desc)` (seen `0` Open, `2` Canceled, `6` Confirmed), `oecurrentstatus(desc)` (seen `E` UnLoaded) and `opaymentmethod` (seen `1`, `3`). Does `oeinvoiceposted` `Y` mean the receipt can be shown? Which heading carries the voucher number and whether feedback was left?
- **`oelastlogindate`:** only a date (`DD-MON-YY`); can it carry the time?
- **`PROF.U.PROFILE`:** does it keep omitted parameters unchanged, or must every parameter be sent? What does it answer (`o_code` / `o_message`) on success and on refusal?
- **`PROF.U.PROFILE` value codes** with no sample: office `P_ADDRESS_TYPE`, phone `P_CONFIRMATION_METHOD` (the update sample sends `''`), non-US `P_COUNTRY`.
- **Apt # / Mail stop:** the test client fills `P_CROSS_STREET1` / `P_CROSS_STREET2` with two cross streets. Which parameter takes the apartment / mail stop?
- **Preferences:** `LOAD_PROFILE` now sends `oconfirmationmethod` and `ospecialoffer` (guide §10). What are the `P_CONFIRMATION_METHOD` codes for phone and for "None" (guide 09 §5)? Does `''` in the `PROF.U.PROFILE` sample mean None, or "leave unchanged"? Is `Y` the `P_SPECIAL_OFFER` opt-in?
- **`RES.S.GOOGLE_ZONE_NUM`:** what marks "outside the service area"? `0, 0` answered `"1"` / `90000999`.
- **`RES.S.ZONE_THE_LOCATION`:** which input zones a street, and what does a match answer?
- **`RES.S.ALL_ORDERS` dates:** the test client sends `MM-DD-YYYY` and no `P_TOTAL_RECORDS`; the contract has `MM/DD/YYYY` and `P_TOTAL_RECORDS`. Which is right? Both returned the same rows.
- **Announcements ("What's New") on Home:** is there an action code for them?
