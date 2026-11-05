# Missing 10 — Contact Us / Customer Service

| | |
|---|---|
| **App today** | 🔴 Missing. The nav has no "Contact Us"; there are no phone or e-mail details anywhere in the app. |
| **Legacy reference** | Booking site menu "Contact Us → Customer Service"; retired in-app contact form in [`../reverse-engineer-guide/24-feedback-rating-complaints.md`](../reverse-engineer-guide/24-feedback-rating-complaints.md) §3 |
| **Gateway** | ⛔ No action code for the message form. **Blocked on backend** (suggested `PROF.I.CONTACT_MESSAGE`). The contact card itself is static config, so it can ship now. |
| **Priority** | P2 |

## 1. Purpose
Give the customer every way to reach XYZ (call dispatch, office, toll-free, e-mail sales or customer service, see the address) and optionally send a message.

## 2. Live page (captured 2026-10-16) [O]
- **Page:** `https://xyzcar.com/contact-us/`. Evidence `ev_a682821e…`.
- **Copy:**
  - title "Contact Us"
  - intro "Fortune 1000 corporations rely on XYZ…"
  - heading "Get in Touch": "Feel free to contact XYZ Car for questions, bookings, or personal assistance…"
- **Embedded map:** an iframe.

### 2.1 Contact card (same list on the Complaint, Rate a Ride and Policies pages, and in the footer)
| Item | Value | Action |
|---|---|---|
| Address | 32 Adele Street, Staten Island, NY 10305 | open maps (lat 40.5912346, lng −74.0885948) |
| Office | 929-XYZLIMO (999-5466) | `tel:929-999-5466` |
| Toll free | 800-535-3377 | `tel:800-535-3377` |
| Sales | sales@xyzcar.com | `mailto:` |
| Customer Service | customer.service@xyzcar.com | `mailto:` |

Additional numbers used across the booking site (guides 00, 25):
- **Dispatch 24 h:** 718-768-7333
- **Customer service (9am–5pm):** 718-499-2007
- **MetLife Stadium jobs:** 929-999-5466

### 2.2 "Send Message" form (`form "Contact Form"`)
| Label | Field (`form_fields[...]`) | Type | Required | Pattern |
|---|---|---|---|---|
| First Name | `fname` | text | yes | — |
| Last Name | `lname` | text | yes | — |
| Email Address | `email` | email | yes | — |
| Phone Number | `phone` | tel | yes | `[0-9()#&+*-=.]+` |
| Message | `message` | textarea | no | — |

- **Hidden:** `post_id=64077`, `form_id=0bbe8a6`; reCAPTCHA v3 invisible. Button "Submit".
- The same 5-field form appears as "Our Services Form" and "Rates Page Form" on those pages.

**Retired in-app contact form (guide 24 §3):**
- `MailTo` = Customer Service / Sales; the recipient address was hard-coded client-side (do not copy that)
- name, e-mail, subject, message (all required)

## 3. Screen
- **Route:** `src/app/(app)/contact.tsx`; menu "Contact Us".
- **Contact card:** tappable rows. Values come from config (`EXPO_PUBLIC_*_PHONE`, `EXPO_PUBLIC_SUPPORT_EMAIL`, `EXPO_PUBLIC_SALES_EMAIL`, office address); add them to `.env.example`. Never hard-code them in screens.
  - `Linking.openURL('tel:…' | 'mailto:…')`. On web, `tel:` should still render as text for desktop.
- **Message form (when a code exists):** department (Customer Service / Sales), subject, message. Name, e-mail and phone come from the profile.
- **Links** to Complaint (file 09), Rate a Ride (file 08), Open an Account (file 11) and FAQs (file 16), so "Contact Us" works as the support hub that the live menu group is.
- **No map embed** on mobile (noise). The address row opens the native maps app.

## 4. API
- **Target `PROF.I.CONTACT_MESSAGE`** ⛔: `{ P_LOGIN_ID, P_DEPARTMENT: 'CS'|'SALES', P_SUBJECT, P_MESSAGE }` → `o_code` / `o_message`. Recipients are resolved on the server.
- **Interim:** the contact card ships now. The message form is hidden, or opens `https://xyzcar.com/contact-us/` in `expo-web-browser` (product decision).

## 5. Acceptance criteria
- [ ] All numbers and addresses come from config and are tappable on iOS and Android; they show as text and links on web.
- [ ] No message form is shown without a backing action code or the agreed interim.
- [ ] Copy is in `messages.ts` → `CONTACT_MESSAGES`.

## 6. Unknowns
- [U] Whether customer service wants app messages at all (vs e-mail).
