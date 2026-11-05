# Missing 08 — Rate a Ride

| | |
|---|---|
| **App today** | 🟡 Interim (§4.2). Completed rides (`RideCard`, `RideResultsTable` "Feedback" column, receipts list, reservation details) have "Leave feedback", which opens the live form via `openRateRide` (`src/services/rateRide.ts`, URL from `src/config/rateRide.ts`). Open rides have "Ask about this ride" (`RideQuestionSheet`, `RES.I.ASKED_QUESTIONS`), a separate dispatch-question feature (guide 21). The in-app rating screen (§5) is blocked until the gateway adds a code such as `RES.I.RIDE_RATING`. |
| **Legacy reference** | [`../reverse-engineer-guide/24-feedback-rating-complaints.md`](../reverse-engineer-guide/24-feedback-rating-complaints.md) §2; ride-history "Feedback" column in [`18-ride-history-search.md`](../reverse-engineer-implemented/guide/18-ride-history-search.md) §5 |
| **Gateway** | ⛔ No action code. **Blocked on backend** (suggested `RES.I.RIDE_RATING`). |
| **Priority** | P2 |

## 1. Purpose
After a ride, the passenger gives five 1–5 star ratings and optional suggestions.

## 2. Live form (captured 2026-10-16) [O]
- **Page:** `https://www.xyzcar.com/rate-a-ride/?rideno={rideNo}`, a WordPress / Elementor form named "Rate your Ride". Evidence: `ev_a682821e…` plus a DOM read.
- **Entry from the booking site:** ride history → "Feedback" link per ride, with `?rideno=` pre-filled.

Copy:
- title "Rate a Ride"
- subtitle "Rate Your Ride: We Value Your Feedback"
- heading "Ride Feedback"
- prompt "How would you rate your ride"

| Order | Label on page | Field (`form_fields[...]`) | Type | Required | Values |
|---|---|---|---|---|---|
| 1 | Reservation Number | `reservation` | text | **yes** | pre-filled from `?rideno=` (verified: `rideno=TEST123` → value `TEST123`) |
| 2 | This ride overall? | `ride` | hidden ← stars | no | `1`–`5` (`data-value` on each star) |
| 3 | How strictly the pickup time was followed? | `timing` | hidden ← stars | no | 1–5 |
| 4 | Quality and service of the vehicle? | `quality` | hidden ← stars | no | 1–5 |
| 5 | Driver's behavior and general attitude? | `behaviour` | hidden ← stars | no | 1–5 |
| 6 | Driver's command on driving? | `expertise` | hidden ← stars | no | 1–5 |
| 7 | Suggestions (placeholder) | `comments` | textarea | no | free text |

- **Buttons:** **Reset** (clears every star and hidden value) and **Submit**.
- **Hidden:** `post_id=68345`, `form_id=f908298`, `referer_title`, `queried_id`, `g-recaptcha-response` (reCAPTCHA **v3 invisible**).
- **Transport [I — standard Elementor Pro]:** `POST https://xyzcar.com/wp-admin/admin-ajax.php` with `action=elementor_pro_forms_send_form`.
- **Errors:** an inline script turns the Elementor error box into a `mailto:customer.service@xyzcar.com` link ("click here").
- The page also shows the contact card (address, office, toll-free, sales and customer-service e-mail; see file 10).

## 3. Data model (app)
```ts
type RideRating = {
  rideNo: string;          // required
  overall?: 1|2|3|4|5;     // ride
  punctuality?: 1|2|3|4|5; // timing
  vehicle?: 1|2|3|4|5;     // quality
  driverAttitude?: 1|2|3|4|5; // behaviour
  driverSkill?: 1|2|3|4|5;    // expertise
  comments?: string;        // ≤ 500 suggested; no `"` (guide 26 isValidAlphaNumericWithSpecialCharacter)
};
```
- All stars are optional on the live form. Suggested app rule: require at least **overall**, otherwise the submission carries no information (product decision).

## 4. API

### 4.1 Target (once the backend adds it) — `RES.I.RIDE_RATING` ⛔
| Parameter | Value |
|---|---|
| `P_LOGIN_ID` | session |
| `P_RESERVATION_NUM` | ride no |
| `P_RATING_RIDE`, `P_RATING_TIMING`, `P_RATING_QUALITY`, `P_RATING_BEHAVIOUR`, `P_RATING_EXPERTISE` | `1`–`5` or `''` |
| `P_COMMENTS` | text |

Response: `o_code` / `o_message`.

### 4.2 Interim (until 4.1 exists; product decision) — ✅ Implemented
- Open the live form with `expo-web-browser` (`WebBrowser.openBrowserAsync('https://www.xyzcar.com/rate-a-ride/?rideno=' + encodeURIComponent(rideNo))`). Keep the URL in config (`EXPO_PUBLIC_RATE_A_RIDE_URL`).
- Do **not** post to the WordPress endpoint from the app: it needs a reCAPTCHA v3 token for that origin.

## 5. Screen (when 4.1 exists)
- **Route:** `src/app/(app)/rate-ride.tsx?rideno=`, or a `Sheet` opened from the ride row and from reservation details.
- **Entry points:**
  - ride history row (completed / billed rides)
  - reservation details action bar
- ✅ Done: Ask a Question is labelled "Ask about this ride" and shown on open rides only. "Leave feedback" on completed rides opens the live form (§4.2); point it at this screen once it is built. Do not keep two features behind one label.
- Five star rows (accessible: each star is a button with an `accessibilityLabel` like "3 of 5"), a Suggestions text area, and Submit. "Reset" is optional on mobile.
- **Success:** "Thank you for your feedback." Then close. **Error:** `o_message`.
- Offer "Block this driver" (file 07) when the driver ratings are ≤ 2 (optional).

## 6. Acceptance criteria
- [ ] The ride number is pre-filled and read-only when opened from a ride.
- [ ] Ratings are sent as 1–5; unset ratings are sent as empty.
- [x] Interim mode opens the live page with the ride number pre-filled on web, iOS and Android.
- [ ] Copy is in `messages.ts` → `RATING_MESSAGES`; star colours come from the theme.

## 7. Unknowns
- [U] The backend storage of ratings.
- [U] Whether one ride can be rated twice.
