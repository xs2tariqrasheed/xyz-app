# Missing 17 — Drivers – Join XYZ

| | |
|---|---|
| **App today** | 🔴 Missing. |
| **Legacy reference** | Booking-site menu "Contact Us → Drivers – Join XYZ" → marketing page. Not in `reverse-engineer-guide/`. |
| **Gateway** | ⛔ None (static content; no application form exists on the live page). |
| **Priority** | P4. Customers are the app's audience. This can stay as an external link. |

## 1. Purpose
Recruit drivers (owner-operators). The page is informational plus contact details.

## 2. Live content (captured 2026-10-16) [O] — `https://xyzcar.com/drivers-join-xyz/`, evidence `ev_a682821e…`
- Title "Drivers - Join XYZ", tagline "Your earnings are entirely up to you."
- **"XYZ is seeking individuals who":**
  - are motivated to earn a high income
  - seek work opportunities available 24/7
  - value a high out-of-town ratio and high dollar per voucher ratio
- "The potential earnings are determined by individual effort. Both purchase and lease options are available, and financing can be arranged."
- **Contact details (table):**

| Contact | Phone | Fax | Address |
|---|---|---|---|
| Driver Relations: DriverHelpDesk@xyzcar.com | 929-XYZLIMO (999-5466); 718-499-2007 ext 3120 | (718) 768-5068 | 32 Adele Street, Staten Island, NY 10305 |

## 3. App design (recommended minimal)
- **No dedicated screen.** Add a "Drive with XYZ" row in About (file 15) and the Contact hub (file 10) that either:
  - opens `https://xyzcar.com/drivers-join-xyz/` via `expo-web-browser` (URL in config), or
  - shows a small card with the Driver Relations e-mail and phone (tappable; values from config).
- Do not build a driver application form. None exists on the live site.

## 4. Acceptance criteria
- [ ] The link or card is reachable from About or Contact. Values come from config. Works on all platforms.
