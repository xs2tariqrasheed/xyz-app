# Contact Us → Customer Service / CONTACT US

| | |
|---|---|
| **Where you click** | Header menu → **Contact Us** → **Customer Service**, **and** footer → **CONTACT US** |
| **Label** | `Customer Service / CONTACT US` |
| **`href` on the booking site** | `https://www.xyzcar.com/contact-us` |
| **Where you land** | `https://xyzcar.com/contact-us/` |
| **Redirects** | 2 (`www.` → apex, then a trailing slash is added) and HTTP 200 at the end |
| **Opens in** | The same tab. The `<a>` has no `target` and no `onclick`; it is a plain link. |
| **Booking pages where it appears** | `/` (login), `/Registration/Index`, `/Misc/Forgot` [O]. Member pages are probably the same, because the menu and footer are in the shared layout [I]. |
| **Related gap doc** | [10-contact-us-customer-service.md](../reverse-engineer-missing-screens/10-contact-us-customer-service.md) |
| **xyz-app today** | Not in the app. |

## What the destination is
Contact card (address, phones, e-mails) and a message form.

## Evidence
- REA `capture_browser_scenario`, landing page: `ev_811a9662f8193ee69b9223a7ff42d19c8f30e914e1cfebad1b2741718ffda326` (DOM sha256 `fc09bc5d…`, line 257 (header), 497 (footer) of the captured DOM).
- REA `capture_browser_scenario`, Register + Forgot pages: `ev_1fa7682976f92fd71890dca701f24bf80498141b98a5b78516a7883bc5845732`. The same link is present on both.
- Final URL: `curl -I -L` HEAD check on 2026-10-20.

## Notes
Two clicks open the same URL: the header sub-item and the footer link.
