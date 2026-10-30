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
  - The body is a JSON string holding `{ JHeader, JMetaData: { Headings }, JData }`: a heading list followed by rows of string values. An error carries only `JHeader`, with a non-zero `ActionCode` and `Message`.
  - Some record sets (profile, addresses, orders, reservation, car types…) send more values per row than headings, or values that don't belong under the heading in their position. Guide §10 records each code's heading count and row length.
  - `o_code` / `o_message` mean different things per code: login's `o_message` is the VIP number, and `GOOGLE_ZONE_NUM` answers `"1"` + a zone. Never assume "0 = success" without checking §10.
  - Some bodies are invalid JSON. `parseBody` repairs stray backslashes.
- **Working on an action code:**
  - Always inspect and analyse its actual response before writing code for it: `npm run gateway:probe -- <CODE> '<JData JSON>'`.
  - Understand the structure before implementing UI rendering: the shape, whether the headings match, the column list and row count, and what each `o_code` means. Record it in guide §10 and the tracker first.
  - Render UI components dynamically from that code's actual response data: what it returns, in the order it returns it, with its own states (loading / error / empty / data).
  - Never use hardcoded or dummy data where the gateway's actual response should be used.
  - Probe only read codes. A write code (`.I.` / `.U.` / `.D.`) needs an agreed test record and `--write`. Never commit credentials, passwords, card numbers or other sensitive response values to code or docs; test logins live in `e2e/e2e.local.env` (git-ignored).
- **Mapping a gateway response: headings only.** For every action code (profile, addresses, orders, reservations, vehicle types and every other module):
  1. Read the column names from `JMetaData.Headings`.
  2. Pair each heading with the `JData` value at the same position (index). `mapRows` does exactly this.
  3. Access and display only values that have a heading.
  4. If a row has more values than headings, ignore every extra value. Never access, map or display a value beyond the last heading. Never name extra positions yourself (no column lists taken from the contract, from another code's headings or from the values' look), and don't guess what they mean.
  5. Don't invent field names, assume extra mappings or use hardcoded data. A field the code's headings don't include isn't in its response: leave it out or show the screen's empty state.
  6. Render the UI from the heading–value pairs the code actually returns.
  - A heading whose value is plainly wrong for its name is a gateway bug: record it in guide §10 and the tracker's backend issues. Don't work around it by remapping positions.
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
