> 🔵 **Partly implemented** in the XYZ app. Rate a ride links out to the live form from completed rides ("Leave feedback", missing [08](../reverse-engineer-missing-screens/08-rate-a-ride.md) §4.2); there is no in-app rating screen or action code. Complaint, contact and account requests have no screens. Ask a Question is built, but it belongs to [guide 21](../reverse-engineer-implemented/guide/21-ride-tracking-live-status.md). See missing [08](../reverse-engineer-missing-screens/08-rate-a-ride.md)–[11](../reverse-engineer-missing-screens/11-open-corporate-account.md).

# Module 24 — Ride Rating, Complaints, Contact & Account Requests

## 1. Purpose
Collect ride feedback and customer-service requests. In production these are **WordPress (Elementor) forms on xyzcar.com** linked from the booking app; the booking app's own feedback module (`Feedback.js`, `/Misc/Feedback`) is retired (route returns 404).

## 2. Live forms [O]

| Feature | Entry from booking app | URL | Fields (`form_fields[...]`, * required) |
|---|---|---|---|
| Rate a ride | ride history "Feedback" link per ride | `https://www.xyzcar.com/rate-a-ride/?rideno={rideNo}` | `reservation`* (ride no, pre-filled from query), star ratings `behaviour`, `expertise`, `quality`, `ride`, `timing`, `comments` |
| Complaint | menu | `/complaint/` | `email`*, `name`*, `complaintAbout`*, `reservation`*, `complaint` |
| Open a (corporate) account | menu | `/open-an-account/` | `email`*, `cname`* (company), `fname`*, `lname`*, `phone`*, `cphone`* (company phone) |
| Receipt / invoice request | menu | module 23 | |
| Customer service, FAQs, Drivers – Join XYZ | menu | marketing pages | — |

## 3. Retired in-app module (reference) [C]
Mode selector `rbFeedback`: `1` survey, `2` complaint, `3` contact us.
- Survey ratings: `rbSiteOverall`, `rbSpeed`, `rbHelp`, `rbNavigation`, `rbUser`.
- Complaint: `ComplaintAbout` (Driver / Operator / Others)*, `YourNameComplaint`*, `EmailComplaint`*, `ReservationNo`, `Complaints`*.
- Contact: `MailTo` (Customer Service / Sales → hidden `ToEmail` recipient — hard-coded in client JS)*, `YourNameContact`*, `EmailContact`*, `Subject`*, `Message`*.
Validation: names/subject/reservation # letters, digits, space `. ,`; message/complaint any char except `"`.

## 4. Revamp notes
In-app endpoints with the member and ride pre-filled:
- `POST /reservations/{rideNo}/rating {driverBehaviour, expertise, carQuality, ride, timing, comments}` (1–5 each).
- `POST /support/complaints {category: DRIVER|OPERATOR|OTHER, rideNo, text}`.
- `POST /support/contact {department: CUSTOMER_SERVICE|SALES, subject, message}` — recipients server-side.
- `POST /leads/corporate-account {company, companyPhone, firstName, lastName, email, phone}` (public).
