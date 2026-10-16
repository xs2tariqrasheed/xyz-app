# Missing 18 — Terms & Conditions and Privacy Policy

| | |
|---|---|
| **App today** | 🔴 Missing. Registration does not link to terms, and there is no privacy link anywhere. |
| **Legacy reference** | Booking-site footer "TERMS AND CONDITIONS \| PRIVACY POLICY". Not in `reverse-engineer-guide/`. |
| **Gateway** | ⛔ None (legal content). |
| **Priority** | **P1.** Both stores require a reachable privacy policy for apps that collect personal data. Registration collects name, phone, address and card. |

## 1. Purpose
Show the legal terms (including the credit-card authorisation the customer accepts) and the privacy policy.

## 2. Live content (captured 2026-10-16) [O] — evidence `ev_a682821e…`

### 2.1 Terms & Conditions — `https://xyzcar.com/terms-and-conditions/` ("Essential Information for Our Users")
| Section | Key points |
|---|---|
| Credit card charge authorization | The customer authorises XYZ Two Way Radio Service to charge the card for reservations made by or for them. Charges **exclude tolls, airport parking and waiting time**. Rates are in local currency and billed in USD. The customer pays extra tolls, parking and waiting at the time of service. |
| Obligation of the Customer to Notify | If the customer cannot find the driver, they must call dispatch at 929-XYZLIMO (929-999-5466) or (800) 535-3377. Otherwise the card on file is charged the **full reservation fee + 45 minutes waiting**. |
| Refund Policy | Cancellations must be made **at least 24 hours** before the scheduled time, otherwise a cancellation fee equal to the total deposit is charged. Published prices can change without notice. |
| Liability | No liability for weather, road conditions, vehicle damage, or lost or damaged items. **Child safety seats are not provided**; parents and guardians must provide and install them. |
| Prohibited Items | Consuming alcohol, glass containers, smoking, ammunition, explosives, fireworks. |
| Privacy Policy (short) | No sharing or selling of personal information; data protected by SSL. |

⚠ The Terms say "24 hours" for cancellations, while Our Policies (file 15) says "within 15 minutes → no-show charge". These are **inconsistent**. Raise it with the business before showing either inside the cancel flow.

### 2.2 Privacy Policy — `https://xyzcar.com/privacy-policy/` (long; ≈15 KB of text)
Section headings:
- We Respect Your Privacy
- XYZ Commitment
- Data Collection Description (Data Subject Categories: Attendees, Website visitors, Clients and administrative users, The end users, Registrants)
- Confidentiality of Information
- 1. Scope of this policy
- 2. Customer data excluded
- 3. Age restriction
- 4. Limited role as reverse proxy
- Data Aggregation
- How we use the information we collect (Attendees, Website visitors, Customers and business users, End-users, Subscribers)
- Information Sharing
- Data Retention
- Notification of Changes
- Business Transactions
- Dispute Resolution
- English Language Controls

## 3. App design
- **Do not copy legal text into the app.** Link to the canonical pages so legal owns one version:
  - `EXPO_PUBLIC_TERMS_URL` = `https://xyzcar.com/terms-and-conditions/`
  - `EXPO_PUBLIC_PRIVACY_URL` = `https://xyzcar.com/privacy-policy/`
  - Opened with `expo-web-browser`. Add both to `.env.example`.
- **Where:**
  1. Registration: a line above "Create account": "By creating an account you agree to the Terms and Privacy Policy."
  2. Login footer.
  3. Profile / About footer.
  4. Booking billing step: near the card fields, "Card authorization terms" link. The authorisation text is legally relevant when a card is charged.
- The same URLs go into the App Store / Play Console listings.

## 4. Acceptance criteria
- [ ] Terms and Privacy are reachable signed in **and** signed out, on all platforms.
- [ ] URLs come from config. Link labels are in `messages.ts` → `LEGAL_MESSAGES`.

## 5. Unknowns
- [U] Which cancellation rule is authoritative (24 h vs 15 min).
- [U] Whether legal requires explicit acceptance (a checkbox) at registration.
