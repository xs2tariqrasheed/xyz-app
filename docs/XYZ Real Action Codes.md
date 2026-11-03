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

**Module guides migrated:** 03 Forgot password, 04 Registration, 05 Lookup services, 06 Member home & Express ride, 07 Personal info, 08 Mailing address, 09 Preferences, 13–23 Booking wizard, ride history, open reservations, details, tracking, round trip, vouchers & receipts.

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
| `RES.S.VEHICLE_TYPE` | R | 2026-11-03 | B | Yes (2 = 2) | ✅ Migrated | Read by `oevehiclecode, oevehicledesc`; 5 rows (`0` No Preference, `3` Sedan, `4` SUV, `H`, `K`). `K` is book-by-phone (guide 17). No seat-count heading, so no capacity check. |
| `RES.S.ALL_ORDERS` | R | 2026-11-03 | B | Yes (112 = 112, renamed) | ✅ Migrated | Remapped 2026-11-03 (`ORDER_HEADINGS`). Status from `oecallstatusdesc` + `oecurrentstatusdesc`; actions from the `oecan*` / `oeinvoiceposted` flags; `opaymentmethod` `1` = account, other codes "not available". No voucher-number or feedback heading. 15 rows. Invalid JSON, repaired by `parseBody`. |
| `RES.S.UPDATABLE_ORDERS` | R | 2026-11-03 | B | Yes (112 = 112, renamed) | ✅ Migrated | Remapped 2026-11-03: same headings and mapping as `ALL_ORDERS`; 4 rows. |
| `RES.S.LOAD_RESERVATION` | R | 2026-11-03 | B | Yes (160 = 160) | ✅ Migrated | Read by `RESERVATION_HEADINGS` (the order headings + stop detail, driver, voucher, `cc*` / `idd*`). A record per number now; unknown = `dummy`. Stop kind from `oputype` / `odotype` (`1` / `2` / `3`). Charges: `idd*` (with total) once `oeinvoiceposted` `Y`, else `cc*` (`TODO(schema-unverified)`). No cancel-reason or originate-time heading, so both show "Not available". `oecarnum` sent twice. Returns other customers' records by number. Invalid JSON, repaired. |
| `RES.S.ALL_PREDEFINED_QUESTIONS` | R | 2026-11-03 | B | Yes (2 = 2) | ✅ Migrated | `question_id, question`; 2 rows. The local fallback questions are removed: none shows the empty state. |
| `PROF.S.ACCOUNT_REQUIREMENTS_RS` | R | 2026-11-03 | B | Yes (1 = 1) | ✅ Migrated | One `dummy` heading (`"X"`) = **no requirements** (same answer in the backend test client for `99005`), read as no fields. A real requirement's label is read from `o_message` (`TODO(schema-unverified)`): no account with requirements known yet. |
| `RES.S.ACCOUNT_REQUIREMENTS_LIST` | R | 2026-11-03 | B | Yes (5 = 5) | ✅ Migrated | `account_num, requirement_num, value, description, company_num`: one row per allowed answer (`29311` #1: `BUS` / `BUSINESS`, `PERS` / `PERSONAL`); `dummy` = none. No label heading, so the field keeps the form's own "Requirement n" caption. |
| `PROF.S.IS_UNIQUE_EMAIL` | R | 2026-10-30 | A | Yes | ✅ Migrated | `"0"` / `Success` free, `"1"` / `Duplicate` taken |
| `PROF.S.IS_VALID_COMPANY_NAME` | R | 2026-10-30 | A | Yes | ✅ Migrated | `"0"` / `Success`, `"1"` / `Invalid` |
| `PROF.S.IS_VALID_VIP` | R | 2026-10-30 | A | Yes | ✅ Migrated | `"0"` / customer name, `"1"` / `Invalid user information` |
| `PROF.S.ACCOUNT_REQUIREMENTS` | R | 2026-10-30 | A | Yes | ✅ Migrated | `"0"` / `Account ok. No requirements`, `"1"` / `Invalid account` |
| `PROF.S.ACCOUNT_VIP_NUM` | R | 2026-11-03 | A | Yes (`paccountnum, pvipnum`) | ✅ Migrated | No `o_code`. Read by its two headings (`toAccountOnFile`); an unknown login answers both blank = nothing on file. Pre-fills the booking's Billing step. |
| `RES.S.IS_CREDIT_CARD_SPECIFIC_ACCOUNT` | R | 2026-11-03 | A | Yes | ✅ Migrated | `"0"` Corporate Account, `"1"` Credit Card Specific (only the card methods), `"5"` Invalid Account Number. (a refusal). |
| `RES.S.BILLING_METHOD` | R | 2026-11-03 | A | Yes | ✅ Migrated | `o_code` = account type: `"1"` Corporate Account, `"2"` Credit Card With Corporate Account (`24600`), `"5"` Invalid Account Number. (a refusal). No "all methods" default any more. |
| `RES.S.GOOGLE_ZONE_NUM` | R | 2026-11-03 | A | Yes | Ready — review `o_code` | Always `"1"` + an 8-digit zone (`11215000`), also at 0,0 (`90000999`). Read by heading; only `"0"` counts as a match (fails closed into the acknowledgement) until the backend says what marks "outside the area". |
| `RES.S.ZONE_THE_LOCATION` | R | 2026-11-03 | A | Yes | Needs data | Still `[["", ""]]` for every input, the test client's sample included. Read by heading; a match is `"0"` with the zone in `o_message` (`TODO(schema-unverified)`). |
| `RES.S.LATITUDE_LONGITUDE_FOR_CAR` | R | 2026-11-03 | A | Yes | ✅ Migrated | `"0"` / `Success` + `o_latitude, o_longitude` (car `888`: a position; `412`: blank), `"5"` / `No Data Found` = no position (shown as unknown, not an error). |
| `RES.S.COMMUNICATION_LOG` | R | 2026-11-03 | B | Yes (10) | Needs data | Now sends 10 headings: the asked-questions log (`question`, `additional_message`, `asked_question_datetime`, `answer`, …). 0 rows for every ride tried, even after a question was asked; the datetime format is `TODO(schema-unverified)`. |
| `RES.S.VEHICLE_LOG` | R | 2026-11-03 | B | Yes (6 = 6) | ✅ Migrated | Read by `oetrackingdate, oetrackingtime, oestatusdesc, oelatitude, oelongitude`; 31 / 10 / 50 rows for three rides. |
| `PROF.S.PROFILE_WHO_GRANTED_ACCESS` | R | 2026-11-03 | B | Yes (renamed) | ✅ Migrated | Remapped 2026-11-03: reads `ologinid, ofirstname, olastname`. No rows for the test login. |
| `PROF.S.PROFILE_COLUMN_VALUES` | R | 2026-11-03 | B | Yes (renamed) | ✅ Migrated | Remapped 2026-11-03: reads `ocolumnid, ocolumnvalue`. No rows yet. |
| `PROF.S.PROFILE_COLUMN_VALUES_BY_TYPE` | R | 2026-11-03 | B | Yes (renamed) | ✅ Migrated | Remapped 2026-11-03: reads `ocolumnvalue`. One row for `P_COLUMN_ID` 2. |
| `PROF.S.CAR_INFO` | R | 2026-11-03 | B | Yes (6 = 6) | ✅ Migrated | No longer fails. Car `100`: `driver_1st, color, make, model, model_year, 'wc_tlc_sticker_num'`; unknown cars: no headings / rows. Read by the first five (`toCarInfo`); keyed by the record's `oecarnum` (empty on the test rides). |
| `RES.S.LOAD_RESERVATION_COLUMN_SINGLE_VALUE` | R | 2026-11-03 | A | Yes (3) | ✅ Migrated | `o_code, o_message, o_columnvalue`: `"0"` / `Success` + value where the column has one. A column with none still fails with `ORA-01400` (it tries an INSERT; invalid JSON), read as no value. |
| `RES.S.LOAD_RESERVATION_COLUMN_VALUES_BY_TYPE` | R | 2026-11-03 | B | Yes (2 = 2) | ✅ Migrated | `ocolumnid, ocolumnvalue`; 1 row for `W5121607812` column `1`. |
| `RES.S.VERIFY_ACCOUNT_REQUIREMENTS` | R | 2026-11-03 | A | Yes | ✅ Migrated | `"0"` / `Account ok. No requirements`; `"1"` / `Invalid account` or `Failed`. Not in the backend test client. The VIP isn't checked; `29311` (which has a requirement) answers Invalid account. |
| `RES.S.CREDIT_CARD_APPROVAL` | R | 2026-11-03 | A | Yes | ✅ Migrated | `"0"` + **approval number** in `o_message` (`753371` → `186254`); `"1"` / `Invalid request number.` Pending and declined can't be told apart, so the app polls to its 90 s limit (`TODO(schema-unverified)`). |
| `PROF.S.PASSWORD` | R | 2026-10-30 | A | Yes | ✅ Migrated | `"0"` / `Sendmail`. Sent once through the app for the test login, which mailed one real e-mail. |
| `RES.I.RESERVATION` | W | 2026-11-03 | A | Yes | ✅ Migrated | `"0"` = **created**, with the new number in `o_message` (`W6110231278`, `W6110331282`), shown on the receipt. The rides then don't appear in `LOAD_RESERVATION` or the order lists: a database issue (backend). `"5"` = a matching booking already exists (its number in `o_message`; the test client's `W6102831262`): the app shows "Already booked" with a link to it. A 24-hour time gives `"9"` ORA-01849 (sent as `hh:mm AM\|PM`); a blank ride purpose gives `"9"` ORA-01400 (the form requires it). |
| `RES.U.RESERVATION` | W | 2026-11-03 | A | Yes | Ready | `"1"` / `Invalid reservation number.` for the test ride, because the database never listed it (backend). Read like create: `"0"` = saved. |
| `RES.U.CANCEL_RESERVATION` | W | 2026-11-03 | A | Yes | Ready | `"1"` / `Invalid reservation number.` for the test ride, shown as sent. A successful cancel not seen (only the test ride was approved). |
| `RES.I.CREDIT_CARD_APPROVAL` | W | 2026-11-03 | A | Yes | ✅ Migrated | The test client's sample card: `"0"` + **request number** in `o_message` (`753390`). That request then answered "Invalid request number." for 10+ minutes. Expiry now `MM-YYYY`, as the test client sends it (`TODO(schema-unverified)`). |
| `RES.I.RESERVATION_COLUMN_VALUE` | W | 2026-11-03 | A | Yes | ✅ Migrated | `"0"` / `Success` = saved (column `1`); not showing in the column reads is a database issue. Column `8` (the app's Email CC id) is refused: `"9"` ORA-02291, no such reservation column, so the Email CC id is a backend question. |
| `RES.U.RESERVATION_COLUMN_VALUE` | W | 2026-11-03 | A | Yes | ✅ Migrated | `"2"` / `Record does not Exist. Cannot update value.` for a value not found. A successful update can't be seen until the add stores data. |
| `RES.D.RESERVATION_COLUMN_VALUE` | W | 2026-11-03 | A | Yes | ✅ Migrated | `"2"` / `Record does not Exist. Cannot delete value.` for a value not found. |
| `RES.U.FORMAT_EMAIL_MESSAGE` | W | 2026-11-03 | A | Yes | ✅ Migrated | `"0"` / `success`; one e-mail sent to the test login for the test ride. Not in the backend test client. |
| `RES.I.ASKED_QUESTIONS` | W | 2026-11-03 | A | Yes | ✅ Migrated | `"0"` / `Success` = sent. It doesn't show in `COMMUNICATION_LOG` yet: a database issue (backend). |
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

0. ✅ Every code remapped to the 2026-11-03 headings, the RES module included.

1. ✅ `PROF.S.CHECK_LOGIN_CREDENTIALS`, `PROF.S.LOAD_PROFILE`, `PROF.S.USER_ADDRESSES`, `PROF.S.USER_PROFILE_ADDRESSES`, `PROF.S.CORPORATE_ADDRESSES`: migrated.
2. ✅ `RES.S.VEHICLE_TYPE`, `RES.S.ALL_PREDEFINED_QUESTIONS`.
3. ✅ `RES.S.ALL_ORDERS` / `UPDATABLE_ORDERS` / `LOAD_RESERVATION` (Home, History, Upcoming, Details, Voucher, Receipt).
4. ✅ The booking-wizard lookups (billing, requirements, card approval, tracking). `ZONE_THE_LOCATION` and `GOOGLE_ZONE_NUM` wait on the backend.
5. ✅ Write codes probed 2026-11-03. A `"0"` answer means the record was created or saved; a record that then doesn't show up is a database issue for the backend (below).

## Backend issues to raise

- **Sensitive data:** `PROF.S.LOAD_PROFILE` returns the plaintext password and the full card number.
- **Invalid JSON:** backslashes in the receipt-image path (`\\192.168.168.19\Receipt_Images\…`) and quotes in Oracle error messages are not escaped.
- **Raw Oracle errors** reach the client in `JHeader.Message`.
- **`PROF.I.PROFILE` fails in the database:** `ORA-12899` on `T_VIP_PROFILE.PREFERRED_KNOCKOFF_CODE` (a 2-character value into a 1-character column). Which parameter fills it, and its codes, are needed. Codes still missing from any sample: card `P_PAYMENT_TYPE`, office `P_ADDRESS_TYPE`, phone `P_CONFIRMATION_METHOD`, non-US `P_COUNTRY`, and what `P_CAR_YEAR` / `P_CAR_PHONE` hold.
- **`P_TOTAL_RECORDS` is ignored** by `RES.S.ALL_ORDERS`.
- **`o_code` conventions differ per code** (`BILLING_METHOD`, `GOOGLE_ZONE_NUM`, `LATITUDE_LONGITUDE_FOR_CAR`). Ask for the documented outputs of each procedure.
- **Insert codes report success without storing anything:** `PROF.I.PROFILE` answers `"0"` / `Saved` and `PROF.I.PROFILE_COLUMN_VALUE` answers `"0"` / `Success`, but neither record can be read back (2026-11-03).
- **`PROF.U.PROFILE` needs every parameter**, so the client must send back the stored password and full card number that `LOAD_PROFILE` returns. An update that leaves them out fails with `ORA-01843`.
- **`PROF.S.CAR_INFO`'s last heading is `'wc_tlc_sticker_num'`** (with quotes) and its value is the placeholder `WC_TLC_STICKER_NUM`.
- **`RES.S.LOAD_RESERVATION` sends the `oecarnum` heading twice** (positions 75 and 118). `mapRows` keeps the later value.
- **Fixed 2026-11-03:** record-set headings now match their values (`LOAD_PROFILE`, `USER_ADDRESSES`, the order codes and the rest). The headings were renamed at the same time.
- **`RES.S.ZONE_THE_LOCATION` never zones:** `[["", ""]]` for every input tried, including the test client's own sample.
- **Database: rides created with `"0"` are not listed** — `RES.I.RESERVATION` answers `"0"` + a number, but the ride never appears (`W6110231278`, 2026-11-03): `LOAD_RESERVATION` answers `dummy`, the order lists leave it out, and update / cancel answer "Invalid reservation number." The test client's bookings of 2026-10-28 do appear.
- **`RES.I.RESERVATION` needs a ride purpose:** blank, it fails with `ORA-01400` on `WS_RESERVATION_COLUMN_VALUES.COLUMN_VALUE` (the CC e-mail may be blank). The app now requires it; the procedure should accept a booking without one.
- **`P_RESERVATION_TIME` is 12-hour:** the contract's "14:30" fails with `ORA-01849`.
- **`RES.S.LOAD_RESERVATION` has no ownership check:** it returns another customer's reservation for any number (the test client's own sample `W5121607812` belongs to a different login).
- **Reservation column `8` doesn't exist:** `RES.I.RESERVATION_COLUMN_VALUE` with `P_COLUMN_ID` 8 fails `ORA-02291`. Column `1` answers `"0"` / `Success`, but the column reads don't show it (database).
- **Database: questions sent with `"0"` are not listed** in `RES.S.COMMUNICATION_LOG`.
- **`RES.S.LOAD_RESERVATION_COLUMN_SINGLE_VALUE` still INSERTs** for a column with no value (`ORA-01400`).
- **Shifted drop-off values:** on stored street rides `odoairlinename`, `odoflightnumber`, `odoterminalnumber` and `odoflightdestinationcity` carry address text, and `onumberofstops` carries letters (`u`, `W`, `s`).
- **`RES.S.VERIFY_ACCOUNT_REQUIREMENTS` doesn't check the VIP**, and answers "Invalid account" for `29311`, which has a requirement list.
- **`RES.S.CREDIT_CARD_APPROVAL` can't tell pending from declined:** a fresh request answered "Invalid request number." for 10+ minutes.

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
- **`RES.I.RESERVATION`:** why does a `"0"` booking not show up? Is there a delay or a second step? Should `P_RIDE_PURPOSE` really be required, and does it take free text or a code (stored `oeridepurpose` is `1` / `4`)?
- **Value codes:** `P_PAYMENT_METHOD` for corporate + card and for card only (stored old-site rides carry `3` on an account); `P_CONFIRMATION_METHOD` for phone (stored: `SND`); `P_RESERVATION_MAKE_FOR` for someone else (stored: `1` for self); what `P_PU_ADDRESS_ADD` `N` / `Y` means; the `P_EXPIRATION_DATE` format (`MM-YYYY` or `MM/YYYY`); the `P_CARD_TYPE` codes.
- **Reservation columns:** which `P_COLUMN_ID` holds the Email CC list (8 is rejected)? What are columns 1–3?
- **Charges:** are `cc*` the call's charges and `idd*` the posted invoice? Is there a total for an un-invoiced ride, and a cancel-reason or originate-time heading?
- **`RES.S.CREDIT_CARD_APPROVAL`:** what does a pending request answer, and a declined one?
- **`RES.S.GOOGLE_ZONE_NUM`:** is `"1"` + zone a match, and is `90000999` "outside the area"?
- **`RES.S.VEHICLE_TYPE`:** can it send seat counts and descriptions? Is `K` still book-by-phone?
- **`RES.U.FORMAT_EMAIL_MESSAGE` and `RES.S.VERIFY_ACCOUNT_REQUIREMENTS`** are not in the backend test client: are they current?
