# Missing 09 — Complaint

| | |
|---|---|
| **App today** | 🔴 Missing (no route, no menu item, no messages). |
| **Legacy reference** | [`../reverse-engineer-guide/24-feedback-rating-complaints.md`](../reverse-engineer-guide/24-feedback-rating-complaints.md) §2–3 |
| **Gateway** | ⛔ No action code. **Blocked on backend** (suggested `RES.I.COMPLAINT`). |
| **Priority** | P2 |

## 1. Purpose
A customer files a complaint about a driver, an operator or something else, ideally tied to a reservation number.

## 2. Live form (captured 2026-10-16) [O]
- **Page:** `https://www.xyzcar.com/complaint/` (Elementor form "Complaint"). Evidence `ev_a682821e…` plus a DOM read.
- **Copy:**
  - title "Complaint"
  - subtitle "Share Your Experience, Shape Our Service"
  - intro "We value your feedback… Our dedicated team is committed to promptly addressing your needs…"
  - prompt "Please enter your complaint"

| Label | Field (`form_fields[...]`) | Type | Required |
|---|---|---|---|
| Complaint About | `complaintAbout` | **free text** on the live site | yes |
| Your Name | `name` | text | yes |
| Email Address | `email` | email | yes |
| Reservation # | `reservation` | text | yes |
| Compalint *(sic)* | `complaint` | textarea | yes |

- **Hidden fields:** `post_id=65286`, `form_id=5b48ec5`, `referer_title`, `queried_id`; reCAPTCHA v3 invisible.
- **Submit:** "Submit". Transport [I]: Elementor `admin-ajax.php`.
- **"Get in Touch" card:** the same contact list as file 10.

**Retired in-app version** (legacy `Feedback.js`, guide 24 §3) — use as the better data model:
- `ComplaintAbout` = **Driver / Operator / Others** (required)
- name and e-mail (required)
- `ReservationNo` (optional there)
- `Complaints` (required)
- Validation: name and reservation # use letters, digits, space, `. ,`; the complaint text may contain anything except `"`.

## 3. Data model (app)
```ts
type Complaint = {
  about: 'DRIVER' | 'OPERATOR' | 'OTHER'; // picker instead of free text
  rideNo: string;   // required (live form); pre-filled when opened from a ride
  text: string;     // required, ≤ 1000 suggested, no `"`
  // name + email come from the signed-in profile (LOAD_PROFILE) — not asked again
};
```

## 4. API
- **Target `RES.I.COMPLAINT`** ⛔: `{ P_LOGIN_ID, P_RESERVATION_NUM, P_COMPLAINT_ABOUT, P_COMPLAINT_TEXT }` → `o_code` / `o_message`.
- **Interim:** `expo-web-browser` → `https://www.xyzcar.com/complaint/` (URL in config). This is a product decision.

## 5. Screen
- **Route:** `src/app/(app)/complaint.tsx?rideno=`.
- **Entry points:**
  - menu "Contact Us → Complaint"
  - reservation details ("Report a problem")
- **Fields:** About (Driver / Operator / Other), Reservation # (pre-filled, editable only when opened from the menu), Complaint text, Submit.
- Name and e-mail are **not** asked: the member is signed in (no-noise rule).
- **Success:** "Your complaint has been sent. Customer service will contact you." **Error:** `o_message`.

## 6. Acceptance criteria
- [ ] Required fields are validated, with messages in `messages.ts` → `COMPLAINT_MESSAGES`.
- [ ] The reservation # is pre-filled from the ride.
- [ ] Interim browser hand-off works on all three platforms.

## 7. Unknowns
- [U] Backend routing of complaints (e-mail vs ticket).
- [U] SLA text.
