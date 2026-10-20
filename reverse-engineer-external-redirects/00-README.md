# External Redirects: booking.xyzcar.com → xyzcar.com

This folder lists every click on the live booking site (**https://booking.xyzcar.com**) that **leaves the booking app** and opens the marketing site (**https://xyzcar.com**, WordPress).

**One file = one feature.** If two clicks open the same URL (a header item and a footer link), they share a file. Files implemented in `xyz-app` carry a **✅ Implemented** tag line at the top and are marked ✅ in the index below; the rest are documentation only.

Captured **2026-10-20** with REA (Reverse Engineer MCP) `capture_browser_scenario` in headless Chrome, plus `curl -I -L` to resolve the final URLs.

## Answer: the Privacy Policy click

On every captured page, the footer link **PRIVACY POLICY** has `href="https://www.xyzcar.com/privacy-policy"`. The server redirects twice (`www.` → apex, then a trailing slash is added), so the user lands on **https://xyzcar.com/privacy-policy/**. See [17-footer-privacy-policy.md](17-footer-privacy-policy.md).

## How the redirects work (all links)

- Every outbound link is a plain `<a href="https://www.xyzcar.com/...">`. None has `target`, `onclick` or a JS redirect, so all of them open **in the same tab**.
- The only JS navigation helper, `GoTo(url)`, sets `document.location.href = url`. No captured page uses it for an xyzcar.com URL.
- The server sends 301 redirects from `www.xyzcar.com/<slug>` to `xyzcar.com/<slug>/`: 2 hops for pages, 1 hop for the home page and the PDF. Every final URL returns **200**.
- The four top-level menu items **About**, **Rates**, **Receipts & Invoices** and **Contact Us** have `href="#"`. They only open a hover sub-menu and do not navigate.
- The links are in the shared header menu (`#navmenu > ul#nav`) and the shared footer (`#footer1`). They are the same on `/`, `/Registration/Index` and `/Misc/Forgot`.

## Index

| # | File | Where you click | Lands on | Related gap doc |
|---|---|---|---|---|
| 01 | [01-home.md](01-home.md) ✅ Implemented | Header → Home | `xyzcar.com/` | — |
| 02 | [02-about-company-info.md](02-about-company-info.md) ✅ Implemented | Header → About → Company Info | `/about-xyz/` | missing-screens 15 |
| 03 | [03-about-our-services.md](03-about-our-services.md) ✅ Implemented | Header → About → Our Services | `/our-services/` | 15 |
| 04 | [04-about-our-policies.md](04-about-our-policies.md) ✅ Implemented | Header → About → Our Policies | `/our-policies/` | 15 |
| 05 | [05-rates-sample-rates.md](05-rates-sample-rates.md) ✅ Implemented | Header → Rates → Sample Rates | `/sample-rates/` | 14 |
| 06 | [06-rates-services-rates.md](06-rates-services-rates.md) ✅ Implemented | Header → Rates → Services Rates | `/services-rates/` | 14 |
| 07 | [07-rates-complete-ratebook-pdf.md](07-rates-complete-ratebook-pdf.md) ✅ Implemented | Header → Rates → Complete Ratebook | `/wp-content/uploads/XYZ_Rate_Book.pdf` (**PDF**) | 14 |
| 08 | [08-receipts-download-receipt.md](08-receipts-download-receipt.md) ✅ Implemented | Header → Receipts & Invoices → Download Receipt | `/download-receipt/` | 13 |
| 09 | [09-receipts-download-invoice.md](09-receipts-download-invoice.md) ✅ Implemented | Header → Receipts & Invoices → Download Invoice | `/download-invoice/` | 13 |
| 10 | [10-contact-customer-service.md](10-contact-customer-service.md) ✅ Implemented | Header → Contact Us → Customer Service **+** footer CONTACT US | `/contact-us/` | 10 |
| 11 | [11-contact-open-an-account.md](11-contact-open-an-account.md) ✅ Implemented | Header → Contact Us → Open an Account | `/open-an-account/` | 11 |
| 12 | [12-contact-complaint.md](12-contact-complaint.md) ✅ Implemented | Header → Contact Us → Complaint | `/complaint/` | 09 |
| 13 | [13-contact-rate-a-ride.md](13-contact-rate-a-ride.md) ✅ Implemented (ride-history Feedback + Contact Us menu) | Header → Contact Us → Rate a Ride **+** ride history "Feedback" (logged in) | `/rate-a-ride/` (`?rideno={rideNo}` from ride history) | 08 |
| 14 | [14-faqs.md](14-faqs.md) ✅ Implemented | Header → Contact Us → FAQs **+** footer FAQs | `/faqs/` | 16 |
| 15 | [15-contact-drivers-join-xyz.md](15-contact-drivers-join-xyz.md) ✅ Implemented | Header → Contact Us → Drivers - Join XYZ | `/drivers-join-xyz/` | 17 |
| 16 | [16-footer-terms-and-conditions.md](16-footer-terms-and-conditions.md) ✅ Implemented | Footer → TERMS AND CONDITIONS | `/terms-and-conditions/` | 18 |
| 17 | [17-footer-privacy-policy.md](17-footer-privacy-policy.md) ✅ Implemented | Footer → PRIVACY POLICY | `/privacy-policy/` | 18 |

"Related gap doc" numbers point to [`../reverse-engineer-missing-screens/`](../reverse-engineer-missing-screens/00-README.md). Those files describe the content and fields of each destination page.

## Not counted (not a redirect to xyzcar.com)

| Item | Why it is excluded |
|---|---|
| Footer **Soundview Technologies** → `https://www.soundviewtech.com` | A different domain (the vendor), not xyzcar.com. |
| Logo / **XYZ** heading, footer **HOME**, **Login** → `/` | Stays on booking.xyzcar.com. |
| **Register** → `/Registration/Index`, **Forgot your password?** → `/Misc/Forgot` | Stays on booking.xyzcar.com. |
| `//piwik.xyzcar.com/` script and tracking pixel | Analytics request, not a user click. |

## Evidence and limits

- `ev_811a9662f8193ee69b9223a7ff42d19c8f30e914e1cfebad1b2741718ffda326`: landing page `/`, DOM and network capture.
- `ev_1fa7682976f92fd71890dca701f24bf80498141b98a5b78516a7883bc5845732`: `/Registration/Index` and `/Misc/Forgot`, DOM after each step.
- **Not captured:** pages behind login (member area). No credentials were used. The ride-history **Feedback** link (file 13) comes from the earlier capture in `reverse-engineer-implemented/guide/18-ride-history-search.md`. That the header and footer also appear on member pages is an inference from the shared layout [I]. Capture a logged-in session to confirm it and to find any member-only outbound links.
- Labels: [O] observed in this capture · [I] inferred.
