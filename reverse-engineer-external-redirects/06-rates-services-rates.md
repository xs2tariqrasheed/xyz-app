> ✅ **Implemented** in the XYZ app (2026-10-20): Rates → "Services Rates". It opens `https://xyzcar.com/services-rates/` in a new tab on web, or an in-app browser on iOS / Android; see `src/config/website.ts` (`EXPO_PUBLIC_WEBSITE_URL`) and `src/services/website.ts`.

# Rates → Services Rates

| | |
|---|---|
| **Where you click** | Header menu → **Rates** → **Services Rates** |
| **Label** | `Services Rates` |
| **`href` on the booking site** | `https://www.xyzcar.com/services-rates` |
| **Where you land** | `https://xyzcar.com/services-rates/` |
| **Redirects** | 2 (`www.` → apex, then a trailing slash is added) and HTTP 200 at the end |
| **Opens in** | The same tab. The `<a>` has no `target` and no `onclick`; it is a plain link. |
| **Booking pages where it appears** | `/` (login), `/Registration/Index`, `/Misc/Forgot` [O]. Member pages are probably the same, because the menu and footer are in the shared layout [I]. |
| **Related gap doc** | [14-rates.md](../reverse-engineer-missing-screens/14-rates.md) |
| **xyz-app today** | ✅ Rates → "Services Rates". |

## What the destination is
Static rates for extra services.

## Evidence
- REA `capture_browser_scenario`, landing page: `ev_811a9662f8193ee69b9223a7ff42d19c8f30e914e1cfebad1b2741718ffda326` (DOM sha256 `fc09bc5d…`, line 240 of the captured DOM).
- REA `capture_browser_scenario`, Register + Forgot pages: `ev_1fa7682976f92fd71890dca701f24bf80498141b98a5b78516a7883bc5845732`. The same link is present on both.
- Final URL: `curl -I -L` HEAD check on 2026-10-20.
