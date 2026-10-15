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
