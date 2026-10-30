# Android Build Guide — XYZ app (local APK builds)

```bash
npm run build:android:dev
npm run build:android:prod -- --clean
```

How to build a **development** or **production** Android APK of the XYZ app
on your own machine. No EAS login, no phone or emulator, no Android Studio
project to open: one command each.

| Build | Command | What it is | Copy kept in `~/xyz-builds/` |
|---|---|---|---|
| Development | `npm run build:android:dev` — [§3](#3-development-build) | Debug APK; loads the JS from Metro on your machine (fast refresh, dev menu) | `xyz-dev-v<version>-<time>.apk` |
| **Production** | `npm run build:android:prod -- --clean` — [§4](#4-production-build) | Release APK; JS and `.env.production` values bundled inside, runs on its own | `xyz-v<version>-<versionCode>-release-<time>.apk` |

Both run [`scripts/build-android-apk.sh`](../scripts/build-android-apk.sh):
`expo prebuild` generates the git-ignored `android/` folder from `app.json` /
`app.config.ts`, then Gradle builds the APK.

All commands run from the **project root** (the folder with `package.json`).

---

## 1. One-time machine setup

| Tool | Version | Check |
|---|---|---|
| Node.js | 20 LTS or newer (project uses v24) | `node -v` |
| npm | 10 or newer | `npm -v` |
| Java JDK | **17** — Expo SDK 57 / React Native 0.86 / Gradle 9.3 | `java -version` |
| Android SDK | Platform 36, build-tools 36.0.0, NDK 27.1.12297006, CMake 3.22.1 | `ls ~/Library/Android/sdk` |
| Free disk | ~10 GB for `android/`, Gradle caches and native objects | `df -h ~` |
| RAM | 8 GB works — run one build at a time | |

You do **not** need to set `JAVA_HOME` or `ANDROID_HOME`: the build script
finds JDK 17 and the SDK in the usual places. Set them only if yours live
somewhere else.

### 1.1 macOS

1. **JDK 17.** Android Studio's bundled JDK (21+) is not the version this
   toolchain is tested with, so install 17 separately — either one works:

   ```bash
   brew install openjdk@17
   ```

   or the Temurin 17 installer from <https://adoptium.net>.

2. **Android SDK.** Install [Android Studio](https://developer.android.com/studio),
   open it once so it downloads the SDK to `~/Library/Android/sdk`, then in
   *Settings → Languages & Frameworks → Android SDK* install:
   - *SDK Platforms:* Android 16 (API 36)
   - *SDK Tools:* Android SDK Build-Tools 36.0.0, NDK (Side by side)
     27.1.12297006, CMake 3.22.1, Android SDK Platform-Tools, Android SDK
     Command-line Tools

   Or from a terminal, once the command-line tools are installed:

   ```bash
   ~/Library/Android/sdk/cmdline-tools/latest/bin/sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0" "ndk;27.1.12297006" "cmake;3.22.1"
   ```

   Gradle downloads anything still missing on the first build, as long as the
   SDK licences are accepted (`sdkmanager --licenses`).

3. **Optional** — to use `adb` from any terminal, add to `~/.zprofile`:

   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
   ```

### 1.2 Linux (Ubuntu / Debian)

```bash
sudo apt update && sudo apt install -y openjdk-17-jdk
```

Install the SDK with Android Studio (it goes to `~/Android/Sdk`) or the
command-line tools, with the same packages as above.

### 1.3 Project dependencies

```bash
npm install
```

---

## 2. Project configuration (already in the repo)

Nothing to do here; this is what the build relies on.

| File | What matters for Android |
|---|---|
| `app.json` | `expo.android.package` = **`com.xyzcar.app`** (permanent — the Google Maps key restriction and any Play Store listing are tied to it), `expo.version`, `expo.android.versionCode`, plugins, permissions, `extra.eas.projectId` |
| `assets/images/` | App icon (`icon.png`), Android adaptive icon (`adaptive-icon.png` on a white background), splash (`splash-icon.png`) and web favicon, all rendered from `logo.svg`. After replacing one, rebuild with `-- --clean` |
| `app.config.ts` | Injects `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` into the Android manifest for `react-native-maps` at prebuild time |
| `scripts/build-android-apk.sh` | The build (§3, §4) |
| `eas.json` | Profiles for the optional EAS build (§5). Not used by the npm commands |
| `.gitignore` | `/android`, `.env`, `.env.*` (except `.env.example`) |

`android/` is **generated** — never edit it by hand. Change `app.json` /
`app.config.ts` instead and rebuild with `-- --clean`.

---

## 3. Development build

```bash
npm run build:android:dev
```

Produces a **debug APK**. The JS is not inside it: the app loads it from Metro
running on your machine, so code changes show up instantly without a rebuild.

### 3.1 Use it

1. Connect a phone with **USB debugging** on (Settings → Developer options),
   or start an emulator (Android Studio → Device Manager). Check it is listed:

   ```bash
   adb devices
   ```

2. Install the APK and forward the dev ports (Metro on 8081, the local
   reCAPTCHA verify server on 3009):

   ```bash
   adb install -r ~/xyz-builds/<file>.apk
   adb reverse tcp:8081 tcp:8081 && adb reverse tcp:3009 tcp:3009
   ```

3. Start the dev server and open the **xyz-app** icon on the device:

   ```bash
   npm start
   ```

   `npm start` prints an Expo Go QR code — ignore it; the installed app talks
   to Metro directly. Shake the device (or `adb shell input keyevent 82`) for
   the dev menu.

`adb reverse` is lost when the device reconnects or reboots; run it again. On
Wi-Fi without USB, open the dev menu → *Settings → Debug server host & port*
and enter `<your-LAN-IP>:8081`. Leave `EXPO_PUBLIC_RECAPTCHA_VERIFY_URL` at
`http://localhost:3009/...`: in development the app sends the check to the
host it loaded its JS from, and the reCAPTCHA key's domain list has
`localhost`, not your LAN IP.

### 3.2 When to rebuild

- **JS / TS / `.env` changes:** no rebuild. Restart `npm start` after editing
  `.env` (values are read when Metro bundles).
- **Native changes** — adding or upgrading a package with native code, or
  editing `app.json` plugins / permissions / Android config, or changing
  `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (it lives in the native manifest):

  ```bash
  npm run build:android:dev -- --clean
  ```

### 3.3 What the script does (dev)

1. Finds JDK 17 and the Android SDK.
2. Runs `expo prebuild --platform android` with `NODE_ENV=development`, so
   env comes from `.env.development` (if present) → `.env`.
3. Runs `./gradlew assembleDebug` for `arm64-v8a,x86_64` — real phones plus
   Apple Silicon and Intel emulators — instead of all four ABIs.
4. Copies the APK to `~/xyz-builds/xyz-dev-v<version>-<time>.apk`.

---

## 4. Production build

A release APK: the JS and every `EXPO_PUBLIC_*` value are **bundled inside**,
so it runs on its own — no Metro, no dev menu.

**Checklist — every production build**

1. `.env.production` has the production values — [§4.1](#41-production-values-envproduction)
2. `api/verify-recaptcha` is deployed on Vercel with `RECAPTCHA_SECRET_KEY` set, and `EXPO_PUBLIC_RECAPTCHA_VERIFY_URL` points at it — [§4.1](#41-production-values-envproduction)
3. Google Maps key restricted by API only — [§4.6](#46-google-maps-key)
4. Version raised in `app.json` — [§4.2](#42-raise-the-version)
5. `npm run build:android:prod -- --clean` — [§4.3](#43-build)
6. Test on a phone, then share `~/xyz-builds/xyz-v<version>-<versionCode>-release-<time>.apk` — [§4.4](#44-install-and-share)

### 4.1 Production values (`.env.production`)

`EXPO_PUBLIC_*` values are **baked into the APK when it is built**. A
production build reads `.env.production` first and falls back to `.env` for
anything it does not set. The file is git-ignored, so every build machine needs
its own copy. Create it once:

```bash
cp .env .env.production
```

then edit it. See `.env.example` for what each variable does. The ones that
must change from development:

| Variable | Production value |
|---|---|
| `EXPO_PUBLIC_RECAPTCHA_VERIFY_URL` | The deployed verify endpoint, `https://<vercel-domain>/api/verify-recaptcha` — **not** `localhost:3009`, which only exists on your machine |
| `EXPO_PUBLIC_DBAPI_URL` | The production gateway (`https://…`) |
| `EXPO_PUBLIC_DBAPI_LOGIN` / `EXPO_PUBLIC_DBAPI_PASSWORD` | Production gateway credentials |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | A key with *Maps SDK for Android*, *Places API*, *Directions API* and *Geocoding API* enabled, restricted **by API only** — see [§4.6](#46-google-maps-key) |
| `EXPO_PUBLIC_RECAPTCHA_SITE_KEY` | The production site key; its allowed domains must include the verify URL's host |
| `EXPO_PUBLIC_DBAPI_CLIENT_VERSION` | **Empty**, so the gateway's `ClientVersion` follows `version` in `app.json` (§4.2). A value here is sent as-is on every release |

`RECAPTCHA_SECRET_KEY` and `RECAPTCHA_ALLOWED_HOSTNAMES` are server-only and
are never bundled — they belong in the Vercel project, not in the APK.

The build **stops before compiling** if:

- `.env.production` does not exist;
- any of `EXPO_PUBLIC_DBAPI_URL`, `_DBAPI_SOURCE`, `_DBAPI_TARGET`,
  `_DBAPI_LOGIN`, `_DBAPI_PASSWORD`, `_GOOGLE_MAPS_API_KEY`,
  `_RECAPTCHA_SITE_KEY`, `_RECAPTCHA_VERIFY_URL` is empty;
- a URL the app calls (`_DBAPI_URL`, `_RECAPTCHA_VERIFY_URL`,
  `_CLIENT_IP_LOOKUP_URL`) is not `https` — release builds block plain `http`;
- any URL points at this machine (`localhost`, `127.x`, `10.0.2.2`, `0.0.0.0`).

A variable **exported in your shell** overrides every `.env*` file — if the
build shows an unexpected value, check `env | grep EXPO_PUBLIC`.

### 4.2 Raise the version

Nothing increments automatically. Before each release, raise both in
`app.json`:

```json
"expo": {
  "version": "1.0.1",
  "android": { "versionCode": 2 }
}
```

- `version` → `versionName`, the version testers see.
- `android.versionCode` → a whole number that must go **up** with every
  release. Android refuses to install a lower `versionCode` over a higher one
  (`INSTALL_FAILED_VERSION_DOWNGRADE`).

Both appear in the output file name. `version` is also the `ClientVersion` sent
to the gateway, as long as `EXPO_PUBLIC_DBAPI_CLIENT_VERSION` is empty in
`.env.production` (and `.env`).

### 4.3 Build

```bash
npm run build:android:prod -- --clean
```

`--clean` compiles everything from scratch — the safe choice for anything that
goes to testers, and required after changing `app.json` or a native package.
Without it (`npm run build:android:prod`) Gradle reuses earlier work and is
much faster.

The script:

1. Finds JDK 17 and the Android SDK.
2. **Checks `.env.production`** (§4.1) and prints what it will build — check
   these lines before walking away:
   ```
   ==> prod build: com.xyzcar.app  version=1.0.1  versionCode=2  ABIs=arm64-v8a,armeabi-v7a
   ==> env files: .env.production, .env
   ==> EXPO_PUBLIC_DBAPI_URL=https://…
   ==> EXPO_PUBLIC_RECAPTCHA_VERIFY_URL=https://…/api/verify-recaptcha
   ```
3. With `--clean`, deletes `android/` and the native build folders under
   `node_modules/*/android/`.
4. Runs `expo prebuild` and `./gradlew assembleRelease` with
   `NODE_ENV=production`, for `arm64-v8a,armeabi-v7a` (every real Android
   phone).
5. **Checks the result:** the JS bundle is inside the APK and contains the
   production gateway host.
6. Copies the APK to `~/xyz-builds/`.

It ends with:

```
==> done:
    …/xyz-app/android/app/build/outputs/apk/release/app-release.apk
    ~/xyz-builds/xyz-v1.0.1-2-release-20261020-142331.apk
```

### 4.4 Install and share

Share the copy in `~/xyz-builds/` — the one under `android/` is deleted by the
next `--clean`.

- **Testers:** send them the `.apk`. On the phone, open it and allow
  *Install unknown apps* when asked.
- **A phone on USB:**
  ```bash
  adb install -r ~/xyz-builds/<file>.apk
  ```
- **An emulator:** the release APK has no `x86_64` code, so it installs on
  Apple Silicon (`arm64`) emulators only. For an Intel emulator:
  ```bash
  XYZ_ABIS=arm64-v8a,armeabi-v7a,x86_64 npm run build:android:prod
  ```

Before sharing, check on a real phone — with Metro **not** running — the parts
Expo Go never exercises:

- [ ] Sign in, including the reCAPTCHA checkbox (deployed verify URL)
- [ ] Location permission prompt appears and is honoured
- [ ] Address search returns suggestions; picking one fills the address
- [ ] The map shows tiles (not grey) and the route between pickup and destination
- [ ] Future and live reservation: preview, submit, update, cancel
- [ ] Reservation history and live tracking (car address on *Track your route*)
- [ ] Profile, addresses and contacts load and save
- [ ] Password reset
- [ ] Website / *Rate a ride* links open

### 4.5 Signing

Both APKs are signed with the **debug keystore** prebuild generates
(`android/app/debug.keystore`), so a prod APK installs over a dev one and vice
versa. That is fine for internal testing and sharing APKs directly, but **not
for the Play Store** or long-term public distribution: it is React Native's
public debug key. For a store release use EAS ([§5](#5-optional-eas-builds)),
which signs with a project keystore held in EAS credentials.

`--clean` regenerates `android/app/debug.keystore`, but it is the same
well-known key every time, so its SHA-1 stays the same. Should you ever need it
(e.g. a separate, Android-restricted map key — §4.6):

```bash
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android | grep SHA1
```

### 4.6 Google Maps key

Expo Go uses its own Maps key, so the key in `.env.production` is first really
tested by the APK. The app uses it two ways:

- the native map (`react-native-maps`) — *Maps SDK for Android*;
- plain `fetch` calls to the Places, Directions and Geocoding web services
  (`src/services/googlePlaces.ts`, `googleDirections.ts`, `geocoding.ts`).

Google rejects those web-service calls with `REQUEST_DENIED` when the key has an
**Android apps** application restriction (package + SHA-1) — the app does not
send the `X-Android-Package` / `X-Android-Cert` headers. With such a key the map
draws, but address search, the route and the car's street address fail.

So, in Google Cloud console → *Credentials* → the key:

- *Application restrictions:* **None**
- *API restrictions:* *Restrict key* to Maps SDK for Android, Places API,
  Directions API, Geocoding API (plus Maps SDK for iOS / Maps JavaScript API if
  the same key serves those builds)

The web build's HTTP-referrer restriction can't share this key either: give the
web build its own key if you want referrer locking.

---

## 5. Optional: EAS builds

The project is linked to EAS project `85796328-783f-44db-91e7-5248e8e4d195`
(`app.json` → `extra.eas.projectId`). The npm commands above never use it.
Use EAS only when you need an APK / AAB signed with a proper project keystore,
or a build on Expo's servers.

```bash
npm install --global eas-cli
eas login
eas init --id 85796328-783f-44db-91e7-5248e8e4d195   # once; adds "owner" to app.json if needed
eas build --platform android --profile production          # on Expo's servers
eas build --platform android --profile production --local  # on this machine
```

`eas.json` profiles:

| Profile | Gradle task | Use |
|---|---|---|
| `development` | `:app:assembleDebug` | Debug APK (Metro) |
| `preview` | release | Internal QA APK |
| `production` | `:app:assembleRelease` | Release APK |

- `appVersionSource: "local"` — EAS uses `version` / `versionCode` from
  `app.json`, same as the local build (§4.2).
- EAS builds read env from **EAS Environment Variables**, not your local
  `.env*` files. Add the §4.1 values in expo.dev → project → Environment
  variables before the first EAS build.
- On the first EAS build, EAS offers to generate a keystore. Keep that one for
  good — every update must be signed with the same key, and register its SHA-1
  (`eas credentials --platform android`) on the Google Maps key.
- For a Play Store upload, change the production profile to
  `"android": { "buildType": "app-bundle" }` (AAB).

---

## 6. Troubleshooting

### Check the toolchain

```bash
/usr/libexec/java_home -v 17   # macOS: must print a JDK 17 path
ls ~/Library/Android/sdk       # macOS SDK location
npx expo doctor
```

`npx expo install --check` fixes dependency-version mismatches that
`expo doctor` reports.

### Common errors

| Error | Cause / fix |
|---|---|
| `error: JDK 17 not found` | Install it — [§1](#1-one-time-machine-setup). If it lives somewhere unusual, `export JAVA_HOME=<path>` first. |
| `error: Android SDK not found` | Install it with Android Studio, or `export ANDROID_HOME=<path>`. |
| `error: node_modules is missing` | `npm install`. |
| `error: .env.production is missing` | `cp .env .env.production` and set the production values — [§4.1](#41-production-values-envproduction). |
| `error: EXPO_PUBLIC_… is not set` / `points at this machine` / `must use https` | Fix that value in `.env.production`. A variable exported in your shell overrides the file: `env \| grep EXPO_PUBLIC`. |
| `error: the JS bundle does not contain the gateway host` | The release bundle was built without the `.env.production` values. Rebuild with `-- --clean`. |
| `error: another Android build is in progress` | Wait for it. If none is running (a killed run left the lock): `rmdir .expo/build-android-apk.lock`. |
| `Unable to delete directory …/.cxx/…`, `mergeDebugResources` / `EOFException`, CMake `configureCMake…` failure | Two builds ran at once, or one was interrupted, leaving native folders half-written. Rebuild with `-- --clean`. |
| `Unsupported class file major version` / `Unsupported Java version` | Wrong JDK picked up by a manual Gradle run. Use the npm commands, or point `JAVA_HOME` at JDK 17. |
| `SDK location not found` | Manual `./gradlew` run without `ANDROID_HOME`. Use the npm commands, or export it. |
| Dev app: red screen *Unable to load script* | Metro is not reachable. Run `npm start`, then `adb reverse tcp:8081 tcp:8081` — [§3.1](#31-use-it). |
| Dev app: *Could not reach verification* | Restart Metro (`npm start` — it serves the verify endpoint on 3009; check its log for `[reCAPTCHA] verify server`). Over USB also `adb reverse tcp:3009 tcp:3009`; over Wi-Fi keep the phone on the same network. |
| Prod app: reCAPTCHA fails | `EXPO_PUBLIC_RECAPTCHA_VERIFY_URL` is not the deployed endpoint, or its host isn't on the site key's domain list. Fix `.env.production` and rebuild. |
| Map is blank / grey | The Maps key lacks *Maps SDK for Android* ([§4.6](#46-google-maps-key)). The key is baked in at prebuild — rebuild with `-- --clean` after changing it. |
| Map shows, but address search / route / car address fail | The key has an Android-apps restriction or lacks Places / Directions / Geocoding API. Set it as in [§4.6](#46-google-maps-key) — a console change, no rebuild needed. |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | An APK signed with a different key (e.g. an EAS build) is installed. `adb uninstall com.xyzcar.app` (deletes the app's data), then install. |
| `INSTALL_FAILED_VERSION_DOWNGRADE` | The device has a higher `versionCode`. Raise it in `app.json` ([§4.2](#42-raise-the-version)), or uninstall first. |
| `INSTALL_FAILED_NO_MATCHING_ABIS` | The APK has no code for this device's CPU (e.g. prod APK on an Intel emulator). Rebuild with `XYZ_ABIS=…` — [§4.4](#44-install-and-share). |
| Gradle `OutOfMemoryError` / daemon killed | Low RAM. Close other apps, or `export ORG_GRADLE_JVM_ARGS="-Xmx4g"` before building. |
| `No space left on device` | Free disk ([§1](#1-one-time-machine-setup)); old APKs pile up in `~/xyz-builds/`, Gradle caches in `~/.gradle/caches`. |
| Build hangs at `Resolving dependencies` / downloading | Network or Gradle cache issue. Retry, or clear `~/.gradle/caches`. |
| Stale native behaviour after changing `app.json` or a plugin | Rebuild with `-- --clean`. |

### Clean rebuild

`--clean` deletes `android/` and the native build folders — that fixes most
broken builds:

```bash
npm run build:android:dev -- --clean
npm run build:android:prod -- --clean
```

If that still fails, reinstall dependencies and stop stale Gradle daemons:

```bash
pkill -f GradleDaemon; pkill -f KotlinCompileDaemon
rm -rf android node_modules
npm install
npm run build:android:prod -- --clean
```

### Run Gradle by hand

The script exports `JAVA_HOME`, `ANDROID_HOME` and `NODE_ENV` for you. To run
Gradle directly after a build (e.g. `./gradlew tasks`), export them yourself
first:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17) ANDROID_HOME=$HOME/Library/Android/sdk NODE_ENV=production
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a
```
