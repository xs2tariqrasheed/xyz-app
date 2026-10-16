@AGENTS.md

# xyz-app

## What this project is

A reservation app. Customers book services either for a future date/time or right now.

### Core features

1. **Future reservation** — schedule a reservation for a later date/time.
2. **Live / immediate reservation** — "customer is ready now" job flow, booked for immediate fulfilment.
3. **Preview reservation** — review the full reservation before submitting it.
4. **Update & cancel reservation** — modify or cancel an existing reservation.
5. **Reservation history** — list of past and upcoming reservations.
6. **Profile management** — view and edit the customer profile.
7. **Addresses & contacts** — manage saved addresses and contact details.
8. **Login** — authentication entry point.
9. **Password reset** — recover access to an account.

## Technical

- **Stack:** Expo + React Native, TypeScript (strict), React 19, expo-router (file-based routing, typed routes, React Compiler enabled).
- **Targets:** web, iOS, and Android from a single codebase. Every feature must work on all three — no platform-only assumptions unless guarded with `Platform.select` / `.native.tsx` / `.web.tsx`.
- **Design:** mobile first. Build the phone layout first, then scale up.
- **Responsive:** must work on mobile, tablet, and desktop. Use `useWindowDimensions` / breakpoints rather than fixed pixel layouts; avoid hardcoded widths.
- **State management:** React Context for state shared across screens; single-screen state stays local, and single-screen server data uses `useFetchData`. Each context lives in `src/context/` together with its `use<Name>` hook (the context itself is not exported); the provider is mounted in `src/app/_layout.tsx`.
  - `AuthContext` — session, `signIn` / `signOut`, route guard. *(exists)*
  - `ProfileContext` — customer profile (`PROF.S.LOAD_PROFILE`), loaded after login; `updatePersonalInfo` and `updatePreferences` save through `PROF.U.PROFILE`. *(exists)*
  - `ReservationContext` — reservation draft across create, express, preview, update, return trip and repeat; place lookups, zone checks, billing checks, card approval and submit (`RES.I` / `RES.U.RESERVATION`). *(exists — wired on Reservation 2, `/reserver-2`)*
  - `SavedPlacesContext` — saved addresses (`PROF.S.USER_ADDRESSES`) for My Addresses, Express Checkout and the booking form, plus the address-book writes (`PROF.I/U/D.USER_ADDRESS`). *(exists)* My Contacts loads and writes its own list (`PROF.S.LOAD_PROFILE_COLUMN_VALUES`, `PROF.I/U/D.PROFILE_COLUMN_VALUE`).
- **API gateway:** read `docs/XYZ_INTEGRATION_GUIDE.md` before wiring any action code (envelope, hooks, errors, auth, checklist). Call it through `usePostData` / `useFetchData`, never `fetch`. Action codes are constants in `src/constants/actionCodes.ts` — never hardcoded strings. Mark each wired code `— ✅ Implemented` in `docs/XYZ Action Codes.md`.
- **Gateway returns dummy data (current phase):** we are integrating action codes one by one against the gateway at `EXPO_PUBLIC_DBAPI_URL`, which is currently a stub that returns dummy data, not real backend records (e.g. login accepts any password; some codes return only `o_code` / `o_message` or placeholder rows).
  - **Use the dummy data the gateway returns, not data from our codebase.** Every feature you implement must call its action code and render the gateway's response — even though that response is dummy for now.
  - Never add new local sample, mock or seed data, and never fall back to it when a gateway call fails or comes back empty; show the screen's error or empty state instead.
  - Remaining local placeholder data (`SAVED_MAILING_ADDRESS` on Mailing Address) is temporary. When you wire that feature, replace it with the gateway call inside its service and delete the placeholder. The reservation flow's samples, the address book / contacts seed lists and the Preferences defaults are gone.
  - Code to the contract in `docs/XYZ Action Codes.md`, not to the shape of today's dummy response. Map defensively (default missing columns, fail closed on a missing `o_code`) so the same code keeps working once real data arrives.
  - Never branch on, hardcode, or test for specific dummy values, and don't treat a stub "success" as proof that a business rule works.
- **Environment config:** gateway settings come from env vars, never hardcoded. Keep `.env.example` in sync.

### Layout

- `src/app/` — expo-router routes (`_layout.tsx` is the root layout).
- Import alias: `@/*` → `./src/*`.

### Commands

```bash
npm start        # expo start
npm run ios      # expo start --ios
npm run android  # expo start --android
npm run web      # expo start --web
npm run lint     # expo lint
```

### Conventions

- TypeScript everywhere; `strict` is on — no `any` escapes.
- Prefer the Expo SDK 57 packages already in `package.json` over adding new dependencies.
- Check https://docs.expo.dev/versions/v57.0.0/ before using any Expo API (see AGENTS.md).
- User-facing text (labels, validation, success and error messages) lives in `src/constants/messages.ts`; screens import it rather than hardcoding strings.
- There should not be hard coded color values in the codebase. Use the theme colors defined in `src/theme/colors.ts` instead.
- UI should be consistent across platforms. Use the same components and styles for web, iOS, and Android unless there is a good reason to do otherwise.

### Important Notes:

- Don't put extra information (noise) to user while making the UI/UX. Only show the information which is necessary for the user to complete the task. Avoid showing hints or descriptions that are not essential for the user to understand the functionality. Reference: reservation forms.
