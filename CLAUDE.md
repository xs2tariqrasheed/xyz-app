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
  - The gateway at `EXPO_PUBLIC_DBAPI_URL` now returns **real data**. Codes move from the old dummy responses to real ones one at a time; `docs/XYZ Real Action Codes.md` tracks which are migrated, ready, blocked or not probed.
  - Never add local sample, mock or seed data, and never fall back to it when a call fails or comes back empty. Show the screen's error or empty state.
  - Parameters follow the contract in `docs/XYZ Action Codes.md`. Outputs follow the code's **actual** response as recorded in guide §10. Fail closed where a code's verdict is missing.
  - Never branch on, hardcode or test for specific sample values, and don't treat one "success" as proof that a business rule works.
- **Actual gateway responses** (guide §4 and §10):
  - The body is a JSON string holding `{ JHeader, JMetaData: { Headings }, JData }`: a heading list and rows of string values in heading order. `mapRows` pairs each value with its heading. An error carries only `JHeader`, with a non-zero `ActionCode` and `Message`.
  - `o_code` / `o_message` mean different things per code: login's `o_message` is the VIP number, and `GOOGLE_ZONE_NUM` answers `"1"` + a zone. Never assume "0 = success" without checking §10.
  - Some bodies are invalid JSON. `parseBody` repairs stray backslashes.
- **Working on an action code:**
  - Always check its actual response first: `npm run gateway:probe -- <CODE> '<JData JSON>'`. Record its headings and what its `o_code` means in guide §10 and the tracker.
  - Keep the UI as it is. Render the values the UI needs from that response, read by heading name. Don't change the screen's layout, fields or components unless the user asks.
  - If the response has nothing for a field the UI shows (no such heading, or an empty value), show `COMMON_MESSAGES.NOT_AVAILABLE` there. Don't hide the field or fill it with guessed or dummy data.
  - Probe only read codes. A write code (`.I.` / `.U.` / `.D.`) needs an agreed test record and `--write`. Never commit credentials, passwords, card numbers or other sensitive response values to code or docs; test logins live in `e2e/e2e.local.env` (git-ignored).
- **No property resolvers on gateway responses** (the `strict-property-access` skill, enabled in `.claude/settings.json`, has the full procedure):
  - Read every value from a gateway row by **one heading name**: the one that code's `JMetaData.Headings` actually sends, recorded in guide §10. Never try several names for the same value: no `pick(row, ['oCountry', 'country', 'country_name'])`, no `row.a ?? row.b`, no `row.x || row.X`.
  - Don't normalise key case or rename keys speculatively to avoid learning the real name.
  - No silent defaults (`?? ''`, `|| 0`) that hide a missing required column. A default is allowed only where §10 shows the column is genuinely optional.
  - Never use `any` / `as` casts to get around a column-name error.
  - If the name can't be verified yet: probe the code (`npm run gateway:probe`), or ask. If code must be written first, use ONE direct access with `// TODO(schema-unverified): assumed column is <name>; confirm against guide §10` directly above it.
  - When you touch existing code that tries several names, collapse it to the verified name; if it can't be verified, add the `TODO(schema-unverified)` and report it.
- **Environment config:** gateway settings come from env vars, never hardcoded. Keep `.env.example` in sync.

### Layout

- `src/app/` — expo-router routes (`_layout.tsx` is the root layout).
- Import alias: `@/*` → `./src/*`.

### Commands

```bash
npm start        # expo start (Metro also serves the local reCAPTCHA verify endpoint — metro.config.js)
npm run ios      # expo start --ios
npm run android  # expo start --android
npm run web      # expo start --web
npm run recaptcha:dev  # the reCAPTCHA verify server on its own (localhost:3009)
npm run lint     # expo lint
npm run gateway:probe -- <CODE> '<JData JSON>'  # print an action code's real response + shape (scripts/probe-action-code.mjs)
npx playwright test e2e/login.spec.ts  # login against the real gateway (e2e/e2e.local.env)
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
