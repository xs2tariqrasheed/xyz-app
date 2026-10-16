# Missing 14 — Rates (Sample Rates, Service Rates, Rate Book)

| | |
|---|---|
| **App today** | 🟠 Placeholder. `src/app/(app)/rates.tsx` renders `ComingSoon` ("Fare tables and the surcharges that can apply to a trip will appear here."). |
| **Legacy reference** | Not in `reverse-engineer-guide/`. The booking-site menu "Rates" links to the marketing pages captured below. |
| **Gateway** | ⛔ No rates action code. Content is **static marketing data** today (WordPress tables). Suggested `RES.S.RATES`, or a CMS / bundled content file. **Rates must not be hard-coded as "sample data"** (CLAUDE.md), so this needs a decision on the source. |
| **Priority** | P2 |

## 1. Purpose
Let customers check typical fares and surcharges before booking, and download the complete rate book.

## 2. Live content (captured 2026-10-16) [O] — evidence `ev_a682821e…`

### 2.1 Rates hub — `https://xyzcar.com/rates/`
- "Sample & Service Rates — We are pleased to present our Sample and Service rates below"
- Sample Rates: Airport Rates (`/sample-rates/#airport_rates`), Out of Town Rates (`#ot`)
- Service Rates: Additional Stops, Waiting Time, Packages Rates, Miscellaneous (`/services-rates/#…`)
- Note: "Please note, appointment wait times are $90 per hour!"
- **Price Calculator:** "Our advanced calculator accurately calculates fares based on our tariffs and pricing system. Easily check trip prices using zip codes or XYZ zones." The "Calculate Price" link goes to `https://booking.xyzcar.com/` (i.e. the booking flow's price estimate; see file 20 §2).
- **Rates Book:** "Download Rate Book" → `/wp-content/uploads/XYZ_Rate_Book.pdf`
- "Send Message" form (same 5 fields as file 10)

### 2.2 Sample Rates — `https://xyzcar.com/sample-rates/`
**From Manhattan to Airport**
| Destination | Rate |
|---|---|
| LaGuardia Airport | $90.00 |
| JFK Airport | $150.00 |
| Newark Airport | $150.00 |
| Teterboro Airport (to/from NJ locations) | $160.00 |
| Westchester Airport (to/from W'chester, CT and NYS locations) | $225.00 |
| Mac Arthur Airport (to/from LI locations) | $275.00 |
| Republic (Farmingdale) Airport (to/from LI locations) | $200.00 |
| Meet and Greet at Airports | $20.00 + Parking |

**From Airport to Out of Town**
| Route | Rate |
|---|---|
| From LGA to Westchester, NYS or Connecticut | Add $50.00 to Manhattan rate |
| From JFK to Westchester, NYS or Connecticut | Add $75.00 to Manhattan rate |
| From JFK to New Jersey | Add $90.00 to Manhattan rate |
| From LGA to New Jersey | Add $70.00 to Manhattan rate |
| From EWR to New Jersey (except North Jersey zones 710/720/740/750) | Manhattan rate |
| From EWR to North Jersey (dispatch zones 710/720/740/750) | Add $40.00 to Manhattan rate |

### 2.3 Services Rates — `https://xyzcar.com/services-rates/`
**Additional Stops**
| Item | Rate |
|---|---|
| Additional stops in Manhattan (east→east or west→west) | $20.00 |
| Additional stops in Manhattan (east→west or west→east) | $20.00 |
| Additional stops in Boroughs (same dispatch zone) | $30.00 |
| Additional stops in Boroughs, different dispatch zone (if on the way) | $40.00 |
| Additional stops outside NYC (same town) | $40.00 |
| Additional stops outside NYC (different town) | Full & 1/2 |
| From 101 to NJ (south) with stop in Staten Island | Add $50.00 |
| From all other Manhattan zones to NJ (south) with stop in Staten Island | Add $50.00 |
| All other stops (unusual trips priced by the base) | Full & Full |

**Waiting Times / Time Calls**
| Item | Rate |
|---|---|
| Waiting time (verified by GPS) | $90.00 per hour |
| Time calls in City | $125.00 per hour |
| Time calls in the Boroughs | $125.00 per hour |
| Time calls Out of Town | $150.00 per hour |

**Packages**
| Item | Rate |
|---|---|
| All packages in City | $15.00 plus full fare |
| All packages Out of Town | $15.00 plus full fare |
| Additional package stops in Boroughs + stop price | $10.00 |
| Additional package stops in City + stop price | $10.00 |

**Miscellaneous:** all tolls for all rides are additional; tolls are charged at the round-up EZ Pass rate.

### 2.4 Related policy (from Our Policies, file 15)
Out-of-town round trips: full fare outbound, **half** of the return fare.

## 3. Screen
- **Route:** `rates.tsx` (replace `ComingSoon`).
- **Sections:** Airport rates · Out-of-town add-ons · Stops · Waiting & time calls · Packages · Tolls note. Each table is a simple two-column list that stacks on phones. Use a section index or segmented control instead of anchors.
- **Actions:**
  - "Get a price for my trip" → booking wizard (`/reserver-2`); the estimate depends on file 20 §2
  - "Download complete rate book" → open the PDF URL (config `EXPO_PUBLIC_RATE_BOOK_URL`) with `expo-web-browser`
- Drop the "Send Message" form here (noise); Contact Us covers it.

## 4. Data source (decision needed)
| Option | Fits CLAUDE.md? |
|---|---|
| A. New gateway code `RES.S.RATES` → rows `{section, label, amount, unit, note}` | ✅ preferred |
| B. CMS / remote JSON owned by marketing | ✅ if agreed |
| C. Hard-coded tables in the app | ⚠ not allowed as "sample data". Only acceptable if product declares the rates static content, like legal text. Then it lives in a content file, not in a screen. |

## 5. Acceptance criteria
- [ ] No `ComingSoon`. Tables render from the agreed source with loading, empty and error states.
- [ ] The rate book opens on all platforms.
- [ ] Currency is formatted consistently (`$90.00`). Copy is in `messages.ts` → `RATES_MESSAGES`.

## 6. Unknowns
- [U] Source of truth for rates.
- [U] Whether the rate book PDF is current.
- [U] "Presidential Service" pricing ("Call for Price", file 15).
