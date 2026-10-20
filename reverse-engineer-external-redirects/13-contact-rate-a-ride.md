> ✅ **Implemented** in the XYZ app (2026-10-20): the ride-history **Feedback** link. "Leave feedback" on completed rides opens `https://www.xyzcar.com/rate-a-ride/?rideno={rideNo}` with the ride number pre-filled. It is in the ride cards, the desktop table's "Feedback" column, receipts and reservation details; see `src/services/rateRide.ts` and `EXPO_PUBLIC_RATE_A_RIDE_URL`. The header **Contact Us → Rate a Ride** menu item has no counterpart, because the app has no Contact Us menu.

# Contact Us → Rate a Ride (+ ride-history Feedback)

| | |
|---|---|
| **Where you click** | Header menu → **Contact Us** → **Rate a Ride**, **and** (after login) ride history → **Feedback** link on each ride |
| **Label** | `Rate a Ride / Feedback` |
| **`href` on the booking site** | `https://www.xyzcar.com/rate-a-ride  ·  per ride: https://www.xyzcar.com/rate-a-ride/?rideno={rideNo}` |
| **Where you land** | `https://xyzcar.com/rate-a-ride/  ·  https://xyzcar.com/rate-a-ride/?rideno={rideNo}` |
| **Redirects** | Menu link: 2 (`www.` → apex, then a trailing slash is added). Per-ride link: 1 (`www.` → apex, query kept). HTTP 200 at the end for both. |
| **Opens in** | The same tab. The `<a>` has no `target` and no `onclick`; it is a plain link. |
| **Booking pages where it appears** | `/` (login), `/Registration/Index`, `/Misc/Forgot` [O]. Member pages are probably the same, because the menu and footer are in the shared layout [I]. |
| **Related gap doc** | [08-rate-a-ride.md](../reverse-engineer-missing-screens/08-rate-a-ride.md) |
| **xyz-app today** | ✅ Per-ride link implemented: completed rides show "Leave feedback" (table column "Feedback"), which opens the live form with `?rideno=` in a new tab on web, or an in-app browser on iOS / Android. "Ask about this ride" on open rides is a different feature (Ask a Question, guide 21). |

## What the destination is
Star-rating form. With `?rideno=` the Reservation Number field is pre-filled.

## Evidence
- REA `capture_browser_scenario`, landing page: `ev_811a9662f8193ee69b9223a7ff42d19c8f30e914e1cfebad1b2741718ffda326` (DOM sha256 `fc09bc5d…`, line 260 of the captured DOM).
- REA `capture_browser_scenario`, Register + Forgot pages: `ev_1fa7682976f92fd71890dca701f24bf80498141b98a5b78516a7883bc5845732`. The same link is present on both.
- Final URL: `curl -I -L` HEAD check on 2026-10-20.

## Notes
The per-ride **Feedback** link is on the logged-in ride-history page. It was **not** re-captured in this pass (no login). Source: earlier capture in `reverse-engineer-implemented/guide/18-ride-history-search.md` §5 [O, earlier]. A HEAD check of `?rideno=TEST123` today returns 200 and keeps the query (1 redirect).
