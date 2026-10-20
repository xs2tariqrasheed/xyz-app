> ✅ **Implemented** in the XYZ app (2026-10-20): Contact Us → "Drivers - Join XYZ". It opens `https://xyzcar.com/drivers-join-xyz/` in a new tab on web, or an in-app browser on iOS / Android; see `src/config/website.ts` (`EXPO_PUBLIC_WEBSITE_URL`) and `src/services/website.ts`.

# Contact Us → Drivers – Join XYZ

| | |
|---|---|
| **Where you click** | Header menu → **Contact Us** → **Drivers - Join XYZ** |
| **Label** | `Drivers - Join XYZ` |
| **`href` on the booking site** | `https://www.xyzcar.com/drivers-join-xyz` |
| **Where you land** | `https://xyzcar.com/drivers-join-xyz/` |
| **Redirects** | 2 (`www.` → apex, then a trailing slash is added) and HTTP 200 at the end |
| **Opens in** | The same tab. The `<a>` has no `target` and no `onclick`; it is a plain link. |
| **Booking pages where it appears** | `/` (login), `/Registration/Index`, `/Misc/Forgot` [O]. Member pages are probably the same, because the menu and footer are in the shared layout [I]. |
| **Related gap doc** | [17-drivers-join-xyz.md](../reverse-engineer-missing-screens/17-drivers-join-xyz.md) |
| **xyz-app today** | ✅ Contact Us → "Drivers - Join XYZ". |

## What the destination is
Driver recruitment page.

## Evidence
- REA `capture_browser_scenario`, landing page: `ev_811a9662f8193ee69b9223a7ff42d19c8f30e914e1cfebad1b2741718ffda326` (DOM sha256 `fc09bc5d…`, line 263 of the captured DOM).
- REA `capture_browser_scenario`, Register + Forgot pages: `ev_1fa7682976f92fd71890dca701f24bf80498141b98a5b78516a7883bc5845732`. The same link is present on both.
- Final URL: `curl -I -L` HEAD check on 2026-10-20.
