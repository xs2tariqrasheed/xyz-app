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
- **State management:** React Context for state shared across screens; single-screen state stays local, and single-screen server data uses `useFetchData`.
  - Before adding state for a feature, check `src/context/` and reuse a context that already owns that data.
  - If the feature needs shared state and no context fits, create one: `src/context/<Name>Context.tsx` with its `use<Name>` hook (export the provider and the hook, not the context itself), and mount the provider in `src/app/_layout.tsx`.
  - A context loads and writes its data through its action codes (see **API gateway**), and exposes loading and error state for screens to render.
- **API gateway:** read `docs/XYZ_INTEGRATION_GUIDE.md` before wiring any action code (envelope, hooks, errors, auth, checklist). Call it through `usePostData` / `useFetchData`, never `fetch`. Action codes are constants in `src/constants/actionCodes.ts` — never hardcoded strings. Mark each wired code `— ✅ Implemented` in `docs/XYZ Action Codes.md`.
- **Gateway data is the source of truth:** every value a screen shows or a flow relies on (lists, profile fields, options, statuses, amounts, server messages) comes from the response of its action code. Never hardcode or derive it on the client as a stand-in.
  - The gateway at `EXPO_PUBLIC_DBAPI_URL` is a stub for now and returns dummy data. Wire every feature to its action code and render whatever the gateway returns, so nothing has to change when real data arrives.
  - Never add local sample, mock or seed data, and never fall back to it when a call fails or comes back empty. Show the screen's error or empty state.
  - Code to the contract in `docs/XYZ Action Codes.md`, not to the shape of today's response. Map defensively (default missing columns, fail closed on a missing `o_code`).
  - Never branch on, hardcode or test for specific dummy values, and don't treat a stub "success" as proof that a business rule works.
- **Environment config:** gateway settings come from env vars, never hardcoded. Keep `.env.example` in sync.

### Layout

- `src/app/` — expo-router routes (`_layout.tsx` is the root layout).
- Import alias: `@/*` → `./src/*`.

### Commands

```bash
npm start        # expo start + local reCAPTCHA verify server (scripts/expo-dev.mjs)
npm run ios      # same, --ios
npm run android  # same, --android
npm run web      # same, --web
npm run recaptcha:dev  # the reCAPTCHA verify server on its own (localhost:3009)
npm run lint     # expo lint
npm run build:android:dev           # debug APK (JS from Metro) → ~/xyz-builds/
npm run build:android:prod -- --clean  # release APK from .env.production (docs/android-build-guide.md)
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
