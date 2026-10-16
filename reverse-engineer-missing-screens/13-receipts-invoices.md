# Missing 13 — Receipts & Invoices

| | |
|---|---|
| **App today** | 🟠 Placeholder. `src/app/(app)/receipts.tsx` renders `ComingSoon` ("Receipts for past rides and monthly account invoices will appear here."). It is linked from the nav, from Home QuickLinks, and from the unwired `/reserve` receipt. |
| **Legacy reference** | [`../reverse-engineer-guide/23-vouchers-receipts.md`](../reverse-engineer-guide/23-vouchers-receipts.md) §4 (only the menu links; the pages themselves were not documented) |
| **Gateway** | ⛔ No receipt or invoice action code. **Blocked on backend** (suggested `RES.S.RECEIPT`, `PROF.S.INVOICES`). The ride charges themselves are available today via `RES.S.LOAD_RESERVATION` (module 20). |
| **Priority** | P2 |

## 1. Purpose
- **Receipt:** proof of payment for a **credit-card** ride.
- **Invoice:** the periodic bill of a **corporate account**, for account managers.

## 2. Live pages (captured 2026-10-16) [O] — evidence `ev_a682821e…`

### 2.1 Download Receipt — `https://xyzcar.com/download-receipt/`
- Title "Download Receipt", subtitle "Your Transactions, Your Receipts, Simply Managed".
- Section **"Credit Card Lookup"**:
  - "…accessing ride information via credit card lookup now requires logging in with your XYZCar.com credentials…"
  - Button **"Download Receipt"** → external portal **`http://ccinfo.xyzcar.com`** (plain HTTP).
  - "Alternatively… customer service team at (718) 768-7333."
- Section **"Don't have a Login ID?"**:
  - "If you have used XYZ services before but do not have your login ID, please complete the form."
  - Form "Login Request Form": `fname`*, `lname`*, `email`*, `phone`*, `message`; button "Send Now".

### 2.2 Download Invoice — `https://xyzcar.com/download-invoice/`
- Title "Download Invoice". Intro about the XYZ Invoicing System.
- **"Online Account Billing — Efficient electronic payment solutions"**. eBill for account managers. Special features:
  - weekly, bi-weekly or monthly billing information by e-mail
  - invoices downloaded through a unique, temporary link
  - historical invoices in a secure portal
  - **PDF or CSV** download
  - custom CSV "billing disks" on request
- "All account managers automatically subscribe to eBill… contact customer.service@xyzcar.com".
- Button **"Download Invoice"** → external portal **`http://billinfo.xyzcar.com`** (plain HTTP).
- Form "Login Request Form Invoice": the same 5 fields.

Both receipt and invoice live in **separate legacy portals** with their own logins. The booking site never produced them itself.

## 3. What the app can show today (no new code) — "Receipt" for one ride
- `reservation-info.tsx` already renders **Call Charges** from `RES.S.LOAD_RESERVATION`: fare, tolls/parking, waiting, stops, taxes, service charge, NYS surcharge, total (guide 20 §3).
- A **receipt view** for a billed credit-card ride can be built from the same record:
  - reservation #, date, passenger, pickup → destination, payment method (card brand / last 4 only), itemised charges and total
  - plus print/share: `window.print` on web (as `voucher.tsx` does); native share or print needs `expo-print` / `expo-sharing`, which are **not** dependencies yet. Prefer the Expo SDK 57 packages, and check the docs before adding them.
- This is the same pattern as `voucher.tsx`. Consider one "Ride document" screen with Voucher (account rides) and Receipt (card rides) variants.

## 4. Screen to build — `receipts.tsx`
1. **Receipts tab:**
   - billed **credit-card** rides from `RES.S.ALL_ORDERS` (filter payment = card, status = billed), each opening the receipt view (§3)
   - empty state "No receipts in this period"
   - a date range like ride history
2. **Invoices tab** (only for account members, i.e. a profile with an account number):
   - Target: a list from `PROF.S.INVOICES` ⛔ (period, invoice #, amount, PDF/CSV link).
   - Interim: one button "Open invoice portal" → `billinfo.xyzcar.com` via `expo-web-browser`. Request an **https** URL first; plain-HTTP links are blocked on iOS (ATS) and as mixed content on web.
3. **Help line:** customer service phone (config) for anything missing.

## 5. API
| Need | Code | Status |
|---|---|---|
| Ride list for receipts | `RES.S.ALL_ORDERS` | ✅ |
| Ride charges | `RES.S.LOAD_RESERVATION` | ✅ |
| Official receipt document / number | `RES.S.RECEIPT` (`P_RESERVATION_NUM`) → PDF URL or fields | ⛔ |
| Invoice list | `PROF.S.INVOICES` (`P_ACCOUNT_NUM`, `P_FROM`, `P_TO`) → rows | ⛔ |
| Invoice file | `PROF.S.INVOICE_FILE` (`P_INVOICE_NUM`, `P_FORMAT` PDF/CSV) | ⛔ |

## 6. Acceptance criteria
- [ ] `ComingSoon` is removed. The Receipts tab lists the gateway's billed card rides (dummy OK), with empty and error states.
- [ ] The receipt view shows card brand / last 4 only, never a full card number.
- [ ] Invoices are visible only to account members, and use either the real code or the agreed interim link.
- [ ] Copy is in `messages.ts` → `RECEIPTS_MESSAGES`.

## 7. Unknowns
- [U] Whether the legacy ccinfo / billinfo portals will be replaced by gateway codes.
- [U] Whether the "Login Request" forms (people without a login) are needed in-app. They are aimed at signed-out users; suggest leaving them on the website.
