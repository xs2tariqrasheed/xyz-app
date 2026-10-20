> ✅ **Implemented** in the XYZ app (2026-10-20): Rates → "Complete Ratebook (PDF)". It opens `https://xyzcar.com/wp-content/uploads/XYZ_Rate_Book.pdf` in a new tab on web, or an in-app browser on iOS / Android; see `src/config/website.ts` (`EXPO_PUBLIC_WEBSITE_URL`) and `src/services/website.ts`.

# Rates → Complete Ratebook (PDF)

| | |
|---|---|
| **Where you click** | Header menu → **Rates** → **Complete Ratebook** |
| **Label** | `Complete Ratebook` |
| **`href` on the booking site** | `https://www.xyzcar.com/wp-content/uploads/XYZ_Rate_Book.pdf` |
| **Where you land** | `https://xyzcar.com/wp-content/uploads/XYZ_Rate_Book.pdf` |
| **Redirects** | 1 (`www.` → apex) and HTTP 200 at the end |
| **Opens in** | The same tab. The `<a>` has no `target` and no `onclick`; it is a plain link. |
| **Booking pages where it appears** | `/` (login), `/Registration/Index`, `/Misc/Forgot` [O]. Member pages are probably the same, because the menu and footer are in the shared layout [I]. |
| **Related gap doc** | [14-rates.md](../reverse-engineer-missing-screens/14-rates.md) |
| **xyz-app today** | ✅ Rates → "Complete Ratebook (PDF)". |

## What the destination is
A PDF file (`Content-Type: application/pdf`), not a web page. The browser opens or downloads it.

## Evidence
- REA `capture_browser_scenario`, landing page: `ev_811a9662f8193ee69b9223a7ff42d19c8f30e914e1cfebad1b2741718ffda326` (DOM sha256 `fc09bc5d…`, line 241 of the captured DOM).
- REA `capture_browser_scenario`, Register + Forgot pages: `ev_1fa7682976f92fd71890dca701f24bf80498141b98a5b78516a7883bc5845732`. The same link is present on both.
- Final URL: `curl -I -L` HEAD check on 2026-10-20.

## Notes
This is the only link that goes to a file. The others go to HTML pages.
