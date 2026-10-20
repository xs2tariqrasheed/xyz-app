#!/usr/bin/env bash
# Builds an Android APK on this machine: expo prebuild, then Gradle. No EAS
# login and no phone / emulator needed.
#
#     scripts/build-android-apk.sh dev  [--clean]   (npm run build:android:dev)
#     scripts/build-android-apk.sh prod [--clean]   (npm run build:android:prod)
#
# dev  → debug APK; the JS is served by Metro (`npm start`), not bundled.
# prod → release APK; the JS is bundled with the values from .env.production.
#
# --clean deletes android/ and the native build folders under node_modules
# first. XYZ_ABIS overrides the ABI list, XYZ_BUILDS_DIR the copy folder.
# See docs/android-build-guide.md.
set -euo pipefail

usage() {
  echo "usage: $0 dev|prod [--clean]" >&2
  exit 2
}
die() {
  echo "error: $*" >&2
  exit 1
}
step() { echo "==> $*"; }

MODE=${1:-}
[ $# -gt 0 ] && shift
CLEAN=0
for arg in "$@"; do
  case $arg in
    --clean) CLEAN=1 ;;
    *) usage ;;
  esac
done
case $MODE in
  dev | prod) ;;
  *) usage ;;
esac

ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
OUT_DIR=${XYZ_BUILDS_DIR:-$HOME/xyz-builds}
GUIDE=docs/android-build-guide.md

# Two Gradle builds in the same android/ corrupt each other's native folders.
mkdir -p .expo
LOCK=.expo/build-android-apk.lock
mkdir "$LOCK" 2>/dev/null ||
  die "another Android build is in progress. If none is running (a killed run left the lock behind): rmdir $LOCK"
trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT

# --- Toolchain -------------------------------------------------------------

is_jdk17() {
  local v
  [ -x "$1/bin/java" ] || return 1
  v=$("$1/bin/java" -version 2>&1) || return 1
  [[ $v == *'version "17.'* ]]
}

find_jdk17() {
  local c
  if [ -n "${JAVA_HOME:-}" ] && is_jdk17 "$JAVA_HOME"; then
    echo "$JAVA_HOME"
    return
  fi
  if [ -x /usr/libexec/java_home ] && c=$(/usr/libexec/java_home -v 17 2>/dev/null) && is_jdk17 "$c"; then
    echo "$c"
    return
  fi
  for c in /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home \
    /usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home \
    /usr/lib/jvm/java-17-openjdk* /usr/lib/jvm/temurin-17*; do
    if is_jdk17 "$c"; then
      echo "$c"
      return
    fi
  done
  return 1
}

find_android_sdk() {
  local c
  for c in "${ANDROID_HOME:-}" "${ANDROID_SDK_ROOT:-}" "$HOME/Library/Android/sdk" "$HOME/Android/Sdk"; do
    if [ -n "$c" ] && [ -d "$c/platforms" ]; then
      echo "$c"
      return
    fi
  done
  return 1
}

JAVA_HOME=$(find_jdk17) || die "JDK 17 not found. Install it (macOS: brew install openjdk@17) — $GUIDE §1."
ANDROID_HOME=$(find_android_sdk) || die "Android SDK not found. Install it with Android Studio, or set ANDROID_HOME — $GUIDE §1."
export JAVA_HOME ANDROID_HOME ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

[ -d node_modules ] || die "node_modules is missing. Run: npm install"

# --- Mode ------------------------------------------------------------------

# NODE_ENV picks the .env files that prebuild (Google Maps key) and the JS
# bundle read: .env.<NODE_ENV>.local, .env.local, .env.<NODE_ENV>, .env —
# first one wins, and a variable exported in the shell beats all of them.
if [ "$MODE" = prod ]; then
  export NODE_ENV=production
  VARIANT=release
  TASK=assembleRelease
  ABIS=${XYZ_ABIS:-arm64-v8a,armeabi-v7a}
else
  export NODE_ENV=development
  VARIANT=debug
  TASK=assembleDebug
  ABIS=${XYZ_ABIS:-arm64-v8a,x86_64}
fi

VERSION=$(node -p "require('./app.json').expo.version")
VERSION_CODE=$(node -p "require('./app.json').expo.android?.versionCode ?? 1")
PACKAGE=$(node -p "require('./app.json').expo.android?.package ?? ''")
[ -n "$PACKAGE" ] || die "app.json has no expo.android.package."

step "$MODE build: $PACKAGE  version=$VERSION  versionCode=$VERSION_CODE  ABIs=$ABIS"
step "JAVA_HOME=$JAVA_HOME"
step "ANDROID_HOME=$ANDROID_HOME"

# --- Production checks -----------------------------------------------------

if [ "$MODE" = prod ]; then
  [ -f .env.production ] ||
    die ".env.production is missing. Create it (cp .env .env.production) and set the production values — $GUIDE §4.1."

  # Resolves the env exactly as the release bundle will see it.
  DBAPI_URL=$(
    node - <<'NODE'
const { loadProjectEnv } = require('@expo/env');
const result = loadProjectEnv(process.cwd(), { mode: 'production', silent: true, force: true });
const env = process.env;
const errors = [];

const required = [
  'EXPO_PUBLIC_DBAPI_URL',
  'EXPO_PUBLIC_DBAPI_SOURCE',
  'EXPO_PUBLIC_DBAPI_TARGET',
  'EXPO_PUBLIC_DBAPI_LOGIN',
  'EXPO_PUBLIC_DBAPI_PASSWORD',
  'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY',
  'EXPO_PUBLIC_RECAPTCHA_SITE_KEY',
  'EXPO_PUBLIC_RECAPTCHA_VERIFY_URL',
];
for (const key of required) {
  if (!env[key]?.trim()) errors.push(`${key} is not set`);
}

// Fetched by the app: a release build blocks cleartext http, and a device
// can't reach the build machine's localhost.
const fetched = ['EXPO_PUBLIC_DBAPI_URL', 'EXPO_PUBLIC_RECAPTCHA_VERIFY_URL', 'EXPO_PUBLIC_CLIENT_IP_LOOKUP_URL'];
const linked = ['EXPO_PUBLIC_RATE_A_RIDE_URL', 'EXPO_PUBLIC_WEBSITE_URL'];
const local = /^(localhost|127\.\d+\.\d+\.\d+|10\.0\.2\.2|0\.0\.0\.0|\[::1\])$/i;
for (const key of [...fetched, ...linked]) {
  const value = env[key]?.trim();
  if (!value) continue;
  let url;
  try {
    url = new URL(value);
  } catch {
    errors.push(`${key} is not a valid URL: ${value}`);
    continue;
  }
  if (local.test(url.hostname)) errors.push(`${key} points at this machine (${url.host})`);
  else if (fetched.includes(key) && url.protocol !== 'https:') errors.push(`${key} must use https: ${value}`);
}

const files = (result.files ?? []).map((f) => require('node:path').basename(f));
console.error(`==> env files: ${files.join(', ') || '(none)'}`);
console.error(`==> EXPO_PUBLIC_DBAPI_URL=${env.EXPO_PUBLIC_DBAPI_URL ?? ''}`);
console.error(`==> EXPO_PUBLIC_RECAPTCHA_VERIFY_URL=${env.EXPO_PUBLIC_RECAPTCHA_VERIFY_URL ?? ''}`);
if (errors.length) {
  for (const e of errors) console.error(`error: ${e}`);
  console.error('Fix .env.production (a variable exported in your shell overrides it) — docs/android-build-guide.md §4.1.');
  process.exit(1);
}
console.log(env.EXPO_PUBLIC_DBAPI_URL.trim());
NODE
  ) || exit 1
fi

# --- Clean -----------------------------------------------------------------

if [ "$CLEAN" = 1 ]; then
  step "clean: removing android/ and native build folders in node_modules"
  rm -rf android
  find node_modules -mindepth 3 -maxdepth 4 -type d \( -path '*/android/.cxx' -o -path '*/android/build' \) \
    -prune -exec rm -rf {} + 2>/dev/null || true
fi

# --- Build -----------------------------------------------------------------

step "expo prebuild (android/)"
CI=1 npx expo prebuild --platform android --no-install

step "gradle $TASK"
(cd android && ./gradlew "$TASK" -PreactNativeArchitectures="$ABIS")

APK=android/app/build/outputs/apk/$VARIANT/app-$VARIANT.apk
[ -f "$APK" ] || die "Gradle finished but $APK is missing."

# --- Verify ----------------------------------------------------------------

if [ "$MODE" = prod ]; then
  BUNDLE=assets/index.android.bundle
  unzip -l "$APK" "$BUNDLE" >/dev/null 2>&1 || die "the JS bundle ($BUNDLE) is not inside the APK."
  HOST=$(node -p "new URL(process.argv[1]).host" "$DBAPI_URL")
  unzip -p "$APK" "$BUNDLE" | LC_ALL=C grep -aqF "$HOST" ||
    die "the JS bundle does not contain the gateway host $HOST — the .env.production values were not bundled."
  step "verified: JS bundle is inside the APK and uses $HOST"
fi

# --- Copy out of android/ (deleted by --clean) -----------------------------

mkdir -p "$OUT_DIR"
STAMP=$(date +%Y%m%d-%H%M%S)
if [ "$MODE" = prod ]; then
  NAME=xyz-v$VERSION-$VERSION_CODE-release-$STAMP.apk
else
  NAME=xyz-dev-v$VERSION-$STAMP.apk
fi
cp "$APK" "$OUT_DIR/$NAME"

step "done:"
echo "    $ROOT/$APK"
echo "    $OUT_DIR/$NAME"
if [ "$MODE" = dev ]; then
  echo
  echo "Install it, then serve the JS from this machine:"
  echo "    adb install -r \"$OUT_DIR/$NAME\""
  echo "    adb reverse tcp:8081 tcp:8081 && adb reverse tcp:3009 tcp:3009"
  echo "    npm start"
fi
