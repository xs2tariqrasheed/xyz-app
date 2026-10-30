# XYZ Real Action Codes — migration tracker

Which action codes are moved from the stub's dummy data to the gateway's **real** responses. Parameters are in [XYZ Action Codes.md](XYZ%20Action%20Codes.md). What each code really returns (its shape, column positions and `o_code` meanings) is in [XYZ_INTEGRATION_GUIDE.md §10](XYZ_INTEGRATION_GUIDE.md#10-actual-responses-by-action-code).

**Migrating a code:**
1. Probe it: `npm run gateway:probe -- <CODE> '<JData JSON>'`.
2. Record the response in guide §10.
3. Map it in its service, by heading or by position as §10 says.
4. Verify it in the app.
5. Set its status here to ✅.

Never probe a write code without an agreed test record.

## Status key

| Status | Meaning |
|---|---|
| ✅ Migrated | Real response inspected, app maps and renders it, verified in the app |
| Ready | Probed. Headings match the row (shape A), so `mapRows` works. Check the service against the `o_code` meanings in §10. |
| Ready — review `o_code` | As Ready, but `o_code` doesn't mean "0 = success" for this code. The service's checks must change. |
| Positional map needed | Probed. Headings don't match the row (shape B). Needs a column list in §10 and position-based mapping. |
| Needs data | Probed, but the record tried returned no rows. Shape still unknown. |
| Blocked | The gateway fails on this code (see §10). Needs a backend fix. |
| Not probed | Not sent yet. The reason is given. |
| Not wired | The app doesn't use this code yet |

## Codes

Probed on 2026-10-30 with a test login unless stated.

| Action code | R/W | Probed | Shape | Headings OK? | Status | Notes |
|---|---|---|---|---|---|---|
| `PROF.S.CHECK_LOGIN_CREDENTIALS` | R | 2026-10-30 | A | Yes | ✅ Migrated | `o_message` = VIP number on success, stored in the session |
| `PROF.S.LOAD_PROFILE` | R | 2026-10-30 | B | No (15 vs 44) | Positional map needed | **Next.** Home's greeting reads it straight after login. Returns password + card number (backend issue). |
| `PROF.S.USER_ADDRESSES` | R | 2026-10-30 | B | No (16 vs 17) | ✅ Migrated | Read by position (`ADDRESS_RECORD_COLUMNS`). Home and My Addresses checked in the app. Fixed the duplicate `saved:01` keys. |
| `PROF.S.USER_PROFILE_ADDRESSES` | R | 2026-10-30 | B | Yes (`oCountry…`) | Ready | The service now reads the real `o…` names. Check it in the booking form's address step, then mark ✅. |
| `PROF.S.CORPORATE_ADDRESSES` | R | 2026-10-30 | B | Yes (`oCountry…`) | Ready | As above (needs an account number) |
| `RES.S.VEHICLE_TYPE` | R | 2026-10-30 | B | Partly (2 of 5) | Positional map needed | `[car_type, car_type_name]` only |
| `RES.S.ALL_ORDERS` | R | 2026-10-30 | B | No (10 vs 112) | Positional map needed | Invalid JSON, now repaired by `parseBody`. `P_TOTAL_RECORDS` not honoured. |
| `RES.S.UPDATABLE_ORDERS` | R | 2026-10-30 | B | No (10 vs 112) | Positional map needed | Same row as `ALL_ORDERS` |
| `RES.S.LOAD_RESERVATION` | R | 2026-10-30 | B | No (39 vs 160) | Positional map needed | Invalid JSON, now repaired |
| `RES.S.ALL_PREDEFINED_QUESTIONS` | R | 2026-10-30 | B | No | Positional map needed | `[question_id, text]` under `o_code/o_message` headings |
| `PROF.S.ACCOUNT_REQUIREMENTS_RS` | R | 2026-10-30 | B | No | Positional map needed | `[["X"]]` for an account without requirements. Needs an account with requirements. |
| `RES.S.ACCOUNT_REQUIREMENTS_LIST` | R | 2026-10-30 | B | No | Positional map needed | As above |
| `PROF.S.IS_UNIQUE_EMAIL` | R | 2026-10-30 | A | Yes | Ready | `"1"` / `Duplicate` for a login in use |
| `PROF.S.IS_VALID_COMPANY_NAME` | R | 2026-10-30 | A | Yes | Ready | `"0"` / `Success` |
| `PROF.S.IS_VALID_VIP` | R | 2026-10-30 | A | Yes | Ready | `o_message` = customer name on success |
| `PROF.S.ACCOUNT_REQUIREMENTS` | R | 2026-10-30 | A | Yes | Ready | `"0"` / `Account ok. No requirements` |
| `PROF.S.ACCOUNT_VIP_NUM` | R | 2026-10-30 | A | Yes (`pAccountNum, pVIPNum`) | Ready | No `o_code` |
| `RES.S.IS_CREDIT_CARD_SPECIFIC_ACCOUNT` | R | 2026-10-30 | A | Yes | Ready | `"0"` / `Corporate Account` |
| `RES.S.BILLING_METHOD` | R | 2026-10-30 | A | Yes | Ready — review `o_code` | `"1"` = Corporate Account (a method, not an error) |
| `RES.S.GOOGLE_ZONE_NUM` | R | 2026-10-30 | A | Yes | Ready — review `o_code` | `"1"` + zone number in `o_message` |
| `RES.S.ZONE_THE_LOCATION` | R | 2026-10-30 | A | Yes | Ready — review `o_code` | Empty `o_code` for an address that did not zone |
| `RES.S.LATITUDE_LONGITUDE_FOR_CAR` | R | 2026-10-30 | A | Yes | Ready — review `o_code` | `"5"` / `No Data Found` |
| `RES.S.COMMUNICATION_LOG` | R | 2026-10-30 | ? | — | Needs data | No rows for the reservation tried |
| `RES.S.VEHICLE_LOG` | R | 2026-10-30 | ? | — | Needs data | No rows for the reservation tried |
| `PROF.S.LOAD_PROFILE_WHO_GRANTED_ACCESS` | R | 2026-10-30 | — | — | Blocked | Action code is not supported |
| `PROF.S.LOAD_PROFILE_COLUMN_VALUES` | R | 2026-10-30 | — | — | Blocked | Action code is not supported |
| `PROF.S.LOAD_PROFILE_COLUMN_VALUES_BY_TYPE` | R | 2026-10-30 | — | — | Blocked | Action code is not supported |
| `PROF.S.CAR_INFO` | R | 2026-10-30 | — | — | Blocked | `ORA-01001: invalid cursor` |
| `RES.S.LOAD_RESERVATION_COLUMN_SINGLE_VALUE` | R | 2026-10-30 | — | — | Blocked | `ORA-01400`: the select tries an INSERT |
| `RES.S.LOAD_RESERVATION_COLUMN_VALUES_BY_TYPE` | R | — | — | — | Not probed | Its sibling above writes. Ask the backend first. |
| `RES.S.VERIFY_ACCOUNT_REQUIREMENTS` | R | — | — | — | Not probed | Needs an account with requirements |
| `RES.S.CREDIT_CARD_APPROVAL` | R | — | — | — | Not probed | Needs a request number from `RES.I.CREDIT_CARD_APPROVAL` |
| `PROF.S.PASSWORD` | R | — | — | — | Not probed | Sends a password-recovery e-mail |
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
| `PROF.I.PROFILE` | W | — | — | — | Not probed: writes data | Creates a profile |
| `PROF.U.PROFILE` | W | — | — | — | Not probed: writes data | Replaces the whole profile. Map `LOAD_PROFILE` first. |
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

1. **`PROF.S.LOAD_PROFILE`**: login lands on Home, whose greeting reads it. Mapped by name, the greeting shows the wrong column today. Confirm the 44 positions (guide §10) with the backend, then map it with `mapRowsByPosition` (`src/services/gateway.ts`) in `src/services/profile.ts`.
2. ~~`PROF.S.USER_ADDRESSES`~~ ✅. Then check `USER_PROFILE_ADDRESSES` / `CORPORATE_ADDRESSES` in the booking form (same 17-column layout, already mapped).
3. `RES.S.VEHICLE_TYPE`, `RES.S.ALL_PREDEFINED_QUESTIONS`.
4. `RES.S.ALL_ORDERS` / `UPDATABLE_ORDERS` (Home, History, Upcoming), then `RES.S.LOAD_RESERVATION`.
5. The "Ready — review `o_code`" codes in the booking wizard.
6. Write codes, once the backend agrees a test record and account to use.

## Backend issues to raise

- **Headings don't match the data** for most record sets (see the Shape B rows). The gateway should send the cursor's real column names.
- **Sensitive data:** `PROF.S.LOAD_PROFILE` returns the plaintext password and the full card number.
- **Invalid JSON:** backslashes in the receipt-image path (`\\192.168.168.19\Receipt_Images\…`) and quotes in Oracle error messages are not escaped.
- **Raw Oracle errors** reach the client in `JHeader.Message`.
- **`RES.S.LOAD_RESERVATION_COLUMN_SINGLE_VALUE` performs an INSERT**, failing with ORA-01400.
- **Not supported:** `PROF.S.LOAD_PROFILE_WHO_GRANTED_ACCESS`, `PROF.S.LOAD_PROFILE_COLUMN_VALUES`, `PROF.S.LOAD_PROFILE_COLUMN_VALUES_BY_TYPE`. **Broken:** `PROF.S.CAR_INFO` (ORA-01001).
- **`P_TOTAL_RECORDS` is ignored** by `RES.S.ALL_ORDERS`.
- **`o_code` conventions differ per code** (`BILLING_METHOD`, `GOOGLE_ZONE_NUM`, `LATITUDE_LONGITUDE_FOR_CAR`). Ask for the documented outputs of each procedure.
