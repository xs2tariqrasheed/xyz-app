// https://docs.expo.dev/versions/v57.0.0/config/metro/
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

/**
 * The dev server also serves the local reCAPTCHA verify endpoint
 * (scripts/recaptcha-dev-server.mjs on port 3009), so however Metro is
 * started — `npm start`, `npx expo start`, `expo run:android` — the
 * "I'm not a robot" check works on web, simulators and phones on the same
 * Wi-Fi. Builds (`expo export`, the release APK) load this file too but don't
 * start it.
 */
const SERVES_DEV_APP = ['start', 'run:ios', 'run:android'];

if (SERVES_DEV_APP.includes(process.argv[2]) && process.env.NODE_ENV !== 'production') {
  // Node notes once that it is guessing the handler file's module type; that
  // note is noise in the Metro output.
  const emitWarning = process.emitWarning;
  process.emitWarning = (warning, ...rest) => {
    if (rest[0]?.code === 'MODULE_TYPELESS_PACKAGE_JSON') return;
    emitWarning.call(process, warning, ...rest);
  };
  import('./scripts/recaptcha-dev-server.mjs')
    .then(({ startRecaptchaDevServer }) => startRecaptchaDevServer())
    .then((server) => server?.unref())
    .catch((error) => console.warn('[reCAPTCHA] verify server did not start:', error.message))
    .finally(() => {
      process.emitWarning = emitWarning;
    });
}

module.exports = config;
