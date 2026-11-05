# Missing 15 — About (Company Info, Our Services, Our Policies, Airport Pickups)

| | |
|---|---|
| **App today** | 🟠 Placeholder. `src/app/(app)/about.tsx` renders `ComingSoon` ("Company information, coverage area and contact details will appear here."). |
| **Legacy reference** | Not in `reverse-engineer-guide/`. Booking-site menu "About → Company Info / Our Services / Our Policies". |
| **Gateway** | ⛔ None (static content). Needs a content-source decision (CMS or bundled content file). This is not "sample data". |
| **Priority** | P3 |

## 1. Purpose
Explain who XYZ is, what services exist (including airport pickup options), and the policies that affect charges (no-show, cancellation, round-trip discount).

## 2. Live content (captured 2026-10-16) [O]
Evidence: `ev_c413af98…` (About, Services, Policies) and in-app DOM reads (Airport Pickups, full policies text).

### 2.1 Company Info — `https://xyzcar.com/about-xyz/`
- **"The Premier Luxury Sedan Service in New York City"**: founded in 1970. "Fortune 1000 corporations rely on XYZ to ensure their executives and employees reach their destinations safely, comfortably, and on time, 24/7, at competitive prices."
- **Highlights:**
  - 1000+ Corporations
  - 24/7 Service
  - 500+ Luxury Vehicles ("Choose from over 500 luxury cars…")
- **About XYZ:** "the leading luxury transportation company in New York City and the greater Tri-State area. Travel in style in a late-model sedan or SUV, driven by a professional, at the same rate."
- **Download XYZ Application:**
  - App Store `https://apps.apple.com/us/app/xyz-ride/id1039591722`
  - Google Play `https://play.google.com/store/apps/details?id=com.xyzcar`
  - Not relevant inside the app itself. Omit.
- **Join the XYZ Family:** driver careers, 718-499-2007 ext. 3120, DriverHelpDesk@xyzcar.com. Link to file 17.

### 2.2 Our Services — `https://xyzcar.com/our-services/`
- "XYZ offers the finest luxury corporate sedan service in the New York City and Tri-State Area."
- **SUVs & Sedans:** "late-model Lincoln luxury vehicle or Toyota Highlander, chauffeured by a professional driver… fully computerized dispatch… all cars are air-conditioned and equipped with telephones." CTA "Check Rates" → file 14.
- **Presidential Service:** "A late-model car is assigned 30 minutes before the usual dispatch time using a more rigorous process to ensure the car arrives on time." CTA "Call for Price" → `tel:800-535-3377`.
- **Airport Pickups:** "three tailored options" → §2.4.

### 2.3 Our Policies — `https://xyzcar.com/our-policies/` (full text read)
- **Save on Out-of-Town Round Trips:** full fare for the outbound journey, **half** of the return fare.
- **Cancellations and "no show charges":**
  - Passenger not present within **20 minutes** of the scheduled pickup → the driver is given "No Show".
  - Holding the car longer adds waiting-time charges on top of the No Show charge.
  - Cancelling within **15 minutes** of the scheduled pickup in the city, or cancelling with the driver on location → No Show charge applies.

### 2.4 Airport Pickups — `https://xyzcar.com/airport-pickups/`
| Option | Text (summary) | Booking pickup option (guide 15) |
|---|---|---|
| **Call When You're Ready to Go** | On arrival, call 800-535-3377 to request an outside or inside pickup. The fleet is at all three major airports, minimising waiting charges. | `B` On Demand, Ready Now |
| **Outside Reservation** | Advance reservation for an outside pickup → confirmation number. Flight tracking dispatches the car on arrival. Confirmation by e-mail or cell message with the car number. NYC & Port Authority Police do not allow cars to wait outside the terminal. | `C` Outside the terminal (and `A` Outside, Standby) |
| **Inside reservation "Meet and Greet"** | Flight monitored. Driver waits at baggage claim or the customs gate with an XYZ name sign. **$20 + parking.** Tell XYZ of flight changes. **Free waiting: 15 min domestic, 20 min international**; then waiting fees apply. | `D` Inside the terminal |

This text is the source for the missing **meet & greet notice** in booking (file 20).

## 3. Screen
- **Route:** `about.tsx` (replace `ComingSoon`).
- **Sections:** About XYZ (2–3 lines + 3 highlights) · Services (Sedans & SUVs, Presidential, Airport pickups with the 3 options) · Policies (round trip, no-show / cancellation) · Careers link (file 17) · Legal links (file 18).
- **No-noise rule:** short paragraphs and collapsible sections. No app-download banners and no "Send Message" forms (Contact Us covers that).
- **CTAs:** "Book a ride" → `/reserver-2`; "Check rates" → `/rates`; "Call for Presidential Service" → `tel:` from config.
- The `ComingSoon` "Make a reservation →" link currently points to the **unwired** `/reserve`. It disappears with this change.

## 4. Data source
Static content → CMS or a bundled `src/content/about.ts`, agreed with product. Keep copy out of screens. Phone numbers come from config (file 01 §4).

## 5. Acceptance criteria
- [ ] No `ComingSoon`; all sections render on phone, tablet and desktop.
- [ ] Policy numbers (20 min no-show, 15 min cancellation, half-price return, $20 meet & greet, 15/20 min free airport wait) match the live site or the agreed source.
- [ ] Copy is in `messages.ts` or the content file; colours come from the theme.

## 6. Unknowns
- [U] Whether marketing wants About inside the app at all, or a link to xyzcar.com.
