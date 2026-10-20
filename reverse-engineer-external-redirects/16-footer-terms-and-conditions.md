# Footer → Terms and Conditions

| | |
|---|---|
| **Where you click** | Footer → **TERMS AND CONDITIONS** |
| **Label** | `TERMS AND CONDITIONS` |
| **`href` on the booking site** | `https://www.xyzcar.com/terms-and-conditions` |
| **Where you land** | `https://xyzcar.com/terms-and-conditions/` |
| **Redirects** | 2 (`www.` → apex, then a trailing slash is added) and HTTP 200 at the end |
| **Opens in** | The same tab. The `<a>` has no `target` and no `onclick`; it is a plain link. |
| **Booking pages where it appears** | `/` (login), `/Registration/Index`, `/Misc/Forgot` [O]. Member pages are probably the same, because the menu and footer are in the shared layout [I]. |
| **Related gap doc** | [18-legal-terms-privacy.md](../reverse-engineer-missing-screens/18-legal-terms-privacy.md) |
| **xyz-app today** | Not in the app. Registration does not link to terms. |

## What the destination is
Legal terms, including the credit-card charge authorisation.

## Evidence
- REA `capture_browser_scenario`, landing page: `ev_811a9662f8193ee69b9223a7ff42d19c8f30e914e1cfebad1b2741718ffda326` (DOM sha256 `fc09bc5d…`, line 492 of the captured DOM).
- REA `capture_browser_scenario`, Register + Forgot pages: `ev_1fa7682976f92fd71890dca701f24bf80498141b98a5b78516a7883bc5845732`. The same link is present on both.
- Final URL: `curl -I -L` HEAD check on 2026-10-20.
