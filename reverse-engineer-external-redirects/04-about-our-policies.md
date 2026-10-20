# About → Our Policies

| | |
|---|---|
| **Where you click** | Header menu → **About** → **Our Policies** |
| **Label** | `Our Policies` |
| **`href` on the booking site** | `https://www.xyzcar.com/our-policies` |
| **Where you land** | `https://xyzcar.com/our-policies/` |
| **Redirects** | 2 (`www.` → apex, then a trailing slash is added) and HTTP 200 at the end |
| **Opens in** | The same tab. The `<a>` has no `target` and no `onclick`; it is a plain link. |
| **Booking pages where it appears** | `/` (login), `/Registration/Index`, `/Misc/Forgot` [O]. Member pages are probably the same, because the menu and footer are in the shared layout [I]. |
| **Related gap doc** | [15-about-company-services.md](../reverse-engineer-missing-screens/15-about-company-services.md) |
| **xyz-app today** | Not in the app. |

## What the destination is
Static policies page (waiting, no-show, cancellation).

## Evidence
- REA `capture_browser_scenario`, landing page: `ev_811a9662f8193ee69b9223a7ff42d19c8f30e914e1cfebad1b2741718ffda326` (DOM sha256 `fc09bc5d…`, line 230 of the captured DOM).
- REA `capture_browser_scenario`, Register + Forgot pages: `ev_1fa7682976f92fd71890dca701f24bf80498141b98a5b78516a7883bc5845732`. The same link is present on both.
- Final URL: `curl -I -L` HEAD check on 2026-10-20.

## Notes
Missing-screens 18 §2.1 notes that this page and the Terms page disagree on the cancellation window (15 min vs 24 h).
