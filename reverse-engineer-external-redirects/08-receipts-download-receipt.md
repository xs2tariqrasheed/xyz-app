# Receipts & Invoices → Download Receipt

| | |
|---|---|
| **Where you click** | Header menu → **Receipts & Invoices** → **Download Receipt** |
| **Label** | `Download Receipt` |
| **`href` on the booking site** | `https://www.xyzcar.com/download-receipt` |
| **Where you land** | `https://xyzcar.com/download-receipt/` |
| **Redirects** | 2 (`www.` → apex, then a trailing slash is added) and HTTP 200 at the end |
| **Opens in** | The same tab. The `<a>` has no `target` and no `onclick`; it is a plain link. |
| **Booking pages where it appears** | `/` (login), `/Registration/Index`, `/Misc/Forgot` [O]. Member pages are probably the same, because the menu and footer are in the shared layout [I]. |
| **Related gap doc** | [13-receipts-invoices.md](../reverse-engineer-missing-screens/13-receipts-invoices.md) |
| **xyz-app today** | Receipts are built in the app (`receipts.tsx`, `receipt.tsx`). |

## What the destination is
WordPress/Elementor request form (email, phone, first and last name, message). Staff handle it by hand (guide 23).

## Evidence
- REA `capture_browser_scenario`, landing page: `ev_811a9662f8193ee69b9223a7ff42d19c8f30e914e1cfebad1b2741718ffda326` (DOM sha256 `fc09bc5d…`, line 249 of the captured DOM).
- REA `capture_browser_scenario`, Register + Forgot pages: `ev_1fa7682976f92fd71890dca701f24bf80498141b98a5b78516a7883bc5845732`. The same link is present on both.
- Final URL: `curl -I -L` HEAD check on 2026-10-20.
