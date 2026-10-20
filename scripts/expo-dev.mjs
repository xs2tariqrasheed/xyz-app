/**
 * `expo start` plus the local reCAPTCHA verify server, so one command runs
 * everything the app needs in development:
 *
 *     node scripts/expo-dev.mjs start --web    (npm run web)
 *
 * The verify server answers EXPO_PUBLIC_RECAPTCHA_VERIFY_URL on localhost; it
 * stops when Expo does.
 */
import { spawn } from 'node:child_process';

import { startRecaptchaDevServer } from './recaptcha-dev-server.mjs';

const server = await startRecaptchaDevServer();

const expo = spawn('npx', ['expo', ...process.argv.slice(2)], {
  stdio: 'inherit',
  // npx is a .cmd file on Windows.
  shell: process.platform === 'win32',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => expo.kill(signal));
}

expo.on('exit', (code, signal) => {
  server?.close();
  process.exit(code ?? (signal ? 1 : 0));
});
