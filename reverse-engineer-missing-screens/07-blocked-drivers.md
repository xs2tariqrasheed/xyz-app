# Missing 07 — Block / Unblock a Driver

| | |
|---|---|
| **App today** | 🔴 Missing. The Driver & Vehicle card on `reservation-info.tsx` shows the car number (`PROF.S.CAR_INFO`) but offers no action. |
| **Legacy reference** | None. The live booking site has no block-driver UI on the member pages observed (guides 18–21). This is a gateway-only capability. |
| **Gateway** | ✅ `PROF.U.BLOCK_DRIVER`, `PROF.U.UNBLOCK_DRIVER`. ⛔ There is no code to **list** blocked drivers. |
| **Priority** | P3 (confirm with product) |

## 1. Purpose
A member who had a bad experience can ask that a specific driver/car is never dispatched to them again, and can undo that.

## 2. API (gateway contract)

| Code | Inputs | Output |
|---|---|---|
| `PROF.U.BLOCK_DRIVER` | `P_LOGIN_ID`, `P_CAR_NUM` (e.g. `C1023`, as shown by `CAR_INFO` / the reservation record) | `o_code` / `o_message` |
| `PROF.U.UNBLOCK_DRIVER` | `P_LOGIN_ID`, `P_CAR_NUM` | `o_code` / `o_message` |

There is no `S` code, so the app **cannot know** whether a car is already blocked. That drives the design:
- **Block** is offered from the place where the car number is known: Reservation details → Driver & Vehicle → "Don't send this driver again".
- **Unblock** needs the car number. Offer it in the same place after blocking ("Undo") and on any later ride with that car. A full "Blocked drivers" list screen requires a backend `PROF.S.BLOCKED_DRIVERS` code. Request it before building a list.

## 3. Screen / UI
- **Entry:** `reservation-info.tsx` Driver & Vehicle section. Show only for **completed (billed)** rides that have a car number.
- **Confirm sheet:** "Block car {carNumber}? XYZ will not send this driver to you again." Buttons: Block / Cancel.
- **Success:** a short notice with "Undo" (→ `UNBLOCK_DRIVER`).
- **Refusal:** show `o_message`. A missing `o_code` fails closed.

## 4. Natural pairing
Offer the same action from the **Rate a Ride** (file 08) and **Complaint** (file 09) flows when the rating is low or the complaint is about the driver.

## 5. Acceptance criteria
- [ ] Both codes are added to `actionCodes.ts` (`BLOCK_DRIVER`, `UNBLOCK_DRIVER`), marked in the doc, and called with `retry: false`.
- [ ] Messages live in `messages.ts` (`DRIVER_BLOCK_MESSAGES`).
- [ ] No local "blocked" list is kept or faked.

## 6. Unknowns
- [U] Whether blocking is per member or per account.
- [U] The effect on rides already dispatched.
- [U] A listing code.
