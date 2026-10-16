# Missing 16 — FAQs & Per-Page Help

| | |
|---|---|
| **App today** | 🔴 Missing. There is no FAQ screen and no help content anywhere (no grep hit for "FAQ" or "help" in `src`). |
| **Legacy reference** | [`../reverse-engineer-guide/01-platform-conventions.md`](../reverse-engineer-guide/01-platform-conventions.md) §7 (help API only). The content is captured here for the first time. |
| **Gateway** | ⛔ None (static content). Needs a CMS or content-file decision. |
| **Priority** | P3 |

## 1. Purpose
Answer common questions, and (legacy) show context help for the page or wizard step the user is on.

## 2. Live content (captured 2026-10-16) [O]

### 2.1 FAQs — `https://xyzcar.com/faqs/` (accordion answers read from the DOM)
Intro: "Established in 1970, XYZ stands as one of the pioneering Black car companies, setting industry standards."

| Question | Answer |
|---|---|
| In what ways does this website cater to its users' needs? | An instant car reservation system for individual customers and corporate account managers. Search, modify and manage reservations. Book, obtain receipts, settle bills, and track your driver in real time. |
| Could you provide an overview of how this website functions? | Use your e-mail address as the login id and your password to reach your reservations. Most features are in the top menu. |
| Can you provide an overview of how the menu functions? | The top menu is clickable, with drop-downs for rates, receipts, invoices, customer service and more. |
| Can you explain how the Page Help feature functions? | Help pages show information relevant to the page currently loaded. |
| If I encounter an issue, who should I reach out to? | Use "Customer Service" under "Contact Us". |
| My question isn't listed here. What should I do? | Contact the customer service team (the legacy text mentions a "live support option in the left menu", which no longer exists). |

The booking site's own `/Content/HelpWindow/FAQs.htm` has the same six questions in older wording. Evidence `ev_63d0bf8e…`.

### 2.2 Context help files (booking site) [O] — evidence `ev_63d0bf8e…`
Served by `GET /Misc/ReturnHelpFile?filename=<page>&index=<step>` (guide 01 §7).

| File | Page / step | Topics (field → help text) |
|---|---|---|
| `MemberArea.htm` | Member home | About This Page: "Member Home Page where members can avail the privileges of managing their profiles and reservations." · Continue to Reservation: step-by-step booking · Check Open Reservations · **Express Checkout**: "avoid getting into step by step process of reservation and reserve a ride with the information currently saved in your profile." |
| `RidePassengerInfo.htm` | Booking step 1 | "Please provide passenger & ride date info. * denotes a required field." First Name: "Please enter passenger first name." · Last Name (required) · Pickup Date (required) · Pickup Time (required) |
| `RideBillingInfo.htm` = `BillingInfo.htm` (same content, different file) | Booking step 3 / registration step 0 | "If you want us to bill your corporate account then you have provide us your account number, otherwise you can also pay us through your credit card." Fields: account #, VIP number "if any", card holder name, card # "16 digit… 15 American express", 3-digit verification code, expiration date |
| `RidePreferences.htm` | Booking step 4 | Confirmation method · preferred fleet ("car company with whom you like to be served") · car year ("Rates varies on car years") · car phone · smoking · subscribe to special offers. ⚠ Most of these are **retired** fields. Do not resurrect them. |
| `Forgot.htm` | Forgot password | "Please enter your login name and your password will be mailed to you." ⚠ Outdated: the app uses reset, not mail-back. |
| `PersonalInfo.htm`, `BillingAddress.htm` | Registration steps 1–2 | (referenced by the help API, not captured) |

## 3. App design
- **FAQ screen:**
  - **Route:** `src/app/(app)/faqs.tsx` (also reachable signed out from login: `src/app/faqs.tsx`, or a shared component).
  - **Layout:** accordion list (`Reveal` exists in `src/components/ui`). Rewrite the answers for the **app** ("menu" → "the menu button", no "left menu").
  - **Entry:** Contact Us hub (file 10) and the login screen footer.
- **Per-page help: do not port as help windows.**
  - CLAUDE.md "no noise" says not to show non-essential hints or descriptions.
  - The useful parts are already field labels and validation messages.
  - At most, add one "?" link per complex step (billing, airport pickup options) that opens the relevant FAQ entry or the Airport Pickups explanation (file 15 §2.4).
  - Product decision.

## 4. Data source
CMS or a bundled content file (`src/content/faqs.ts`). Not hard-coded inside the screen.

## 5. Acceptance criteria
- [ ] The FAQ renders on all platforms, accessibly (headers expandable by keyboard and screen reader).
- [ ] The answers describe the app, not the old website.
- [ ] No per-field help text is added to forms unless product asks.

## 6. Unknowns
- [U] Content owner.
- [U] Whether FAQs should be shared with the marketing site (one source).
