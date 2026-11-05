> ✅ **Implemented** in the XYZ app (2026-10-20): About → Legal → "Privacy Policy", the menu drawer footer, the footer under login, registration and password reset, and the agreement line above "Create account". It opens `https://xyzcar.com/privacy-policy/` in a new tab on web, or an in-app browser on iOS / Android; see `src/config/website.ts` (`EXPO_PUBLIC_WEBSITE_URL`) and `src/services/website.ts`.

# Footer → Privacy Policy

| | |
|---|---|
| **Where you click** | Footer → **PRIVACY POLICY** |
| **Label** | `PRIVACY POLICY` |
| **`href` on the booking site** | `https://www.xyzcar.com/privacy-policy` |
| **Where you land** | `https://xyzcar.com/privacy-policy/` |
| **Redirects** | 2 (`www.` → apex, then a trailing slash is added) and HTTP 200 at the end |
| **Opens in** | The same tab. The `<a>` has no `target` and no `onclick`; it is a plain link. |
| **Booking pages where it appears** | `/` (login), `/Registration/Index`, `/Misc/Forgot` [O]. Member pages are probably the same, because the menu and footer are in the shared layout [I]. |
| **Related gap doc** | [18-legal-terms-privacy.md](../reverse-engineer-missing-screens/18-legal-terms-privacy.md) |
| **xyz-app today** | ✅ About → Legal → "Privacy Policy", the menu drawer footer, the footer under login, registration and password reset, and the agreement line above "Create account". |

## What the destination is
Privacy policy (long legal text, section headings in missing-screens 18 §2.2).

## Evidence
- REA `capture_browser_scenario`, landing page: `ev_811a9662f8193ee69b9223a7ff42d19c8f30e914e1cfebad1b2741718ffda326` (DOM sha256 `fc09bc5d…`, line 493 of the captured DOM).
- REA `capture_browser_scenario`, Register + Forgot pages: `ev_1fa7682976f92fd71890dca701f24bf80498141b98a5b78516a7883bc5845732`. The same link is present on both.
- Final URL: `curl -I -L` HEAD check on 2026-10-20.

## Notes
**This is the click the question asked about.** On every captured booking page, the footer's **PRIVACY POLICY** link sends the user to `https://www.xyzcar.com/privacy-policy`. The server then redirects twice and the user lands on `https://xyzcar.com/privacy-policy/`.
