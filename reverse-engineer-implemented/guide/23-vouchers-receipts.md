> ✅ **Implemented** in the XYZ app — voucher, print voucher and receipts. Account **invoices** are still blocked on the backend (no `PROF.S.INVOICES` code): see [missing 13](../../reverse-engineer-missing-screens/13-receipts-invoices.md).

# Module 23 — Vouchers, Print Voucher, Receipts & Invoices

## 1. Purpose
Give members the signed ride voucher (corporate account rides), a printable voucher, and receipts/invoices.

## 2. Voucher image (signed voucher) [O]

### Flow
1. `GET /MemberArea/ImageLoader?rideno={voucherNo}&ImageID=&ImagePath=` → waiting page: "Reservation#: … Please wait while voucher image is being retrieved. It may take up to 60 seconds to load voucher image."
2. Browser calls an **internal image server** via JSONP: `http://192.168.0.151/DownloadVoucher/Default.aspx?ImageID=&RideNo={voucherNo}&ImagePath=` (also references `http://192.168.0.151/Default.aspx/DownloadImage`).
3. On completion → `ShowImage?rideno={voucherNo}&ImageID=` (relative to `/MemberArea/`) displays the image.

⚠ Step 2 targets a private LAN IP over HTTP — it cannot work for external users (mixed content + unroutable). `GET /MemberArea/ShowImage` without parameters → 404.

Availability: link shown only for **Billed** rides paid by **Voucher** (ride history, module 18; details, module 20).

## 3. Print voucher [C]
- `openPrintVoucherWindow(params)` → popup `GET /MemberArea/xyzPrintVoucher?{params}` (850×550). Without params the endpoint returns an empty body [O]. Parameter names **[U]**.
- Open-reservation rows embed a "Print Voucher" dialog with server-rendered voucher HTML (module 19).

## 4. Receipts & invoices [O]
Not self-service in the booking app. Menu "Receipts & Invoices" links to request forms on the marketing site:

| Form | URL | Fields (`form_fields[...]`) |
|---|---|---|
| Download Receipt | `https://xyzcar.com/download-receipt/` | `email`*, `phone`*, `fname`*, `lname`*, `message` |
| Download Invoice | `https://xyzcar.com/download-invoice/` | `email`*, `phone`*, `fname`*, `lname`*, `message` |

Handled manually by staff **[I]**.

## 5. Revamp notes
- `GET /reservations/{rideNo}/voucher` → signed voucher image/PDF served by the API (proxy/storage), never from a LAN host in the browser.
- `GET /reservations/{rideNo}/voucher/print` → printable HTML/PDF.
- Self-service `GET /reservations/{rideNo}/receipt` (card rides) and `GET /me/invoices` (account rides) to replace the manual forms; charges come from module 20.

## 6. In the app

| Feature | Where | Action code | Notes |
|---|---|---|---|
| Voucher | `voucher.tsx?rideno=` (`RideDocumentScreen`) | `RES.S.LOAD_RESERVATION` | Shown once the record carries a voucher # (the server's sign that the ride was billed on a voucher). Never fetched from the old LAN image server. Linked from the ride rows (voucher #) and reservation details. |
| Print voucher / receipt | `RideDocumentView` → `src/utils/printRideDocument(.web).ts` | — | One HTML document (`rideDocumentHtml` in `src/services/rideDocument.ts`). iOS / Android: `expo-print` print sheet. Web: printed from a hidden frame, so only the document reaches the paper. |
| Receipt | `receipt.tsx?rideno=` | `RES.S.LOAD_RESERVATION` | Every completed ride. Payment method, card brand + last 4 only, account / voucher / invoice # and dates when the server sends them, and the server's itemised charges and total. Linked from ride rows ("View receipt"), reservation details and the Receipts list. |
| Receipts list | `receipts.tsx` | `RES.S.ALL_ORDERS` | History search (date range, payment filter) narrowed to completed rides. |
| Invoices | — | ⛔ `PROF.S.INVOICES` | Not in the contract yet; tracked in missing 13. |
