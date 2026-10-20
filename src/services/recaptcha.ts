import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { recaptchaVerifyUrl } from '@/config/recaptcha';

/**
 * Server-side check of a reCAPTCHA v2 token through `api/verify-recaptcha.ts`,
 * which holds the secret key and asks Google's `siteverify`.
 *
 * This is not an XYZ gateway call (the gateway has no captcha action code), so
 * it uses `fetch` directly rather than `usePostData`.
 */

const VERIFY_TIMEOUT_MS = 15_000;

const LOOPBACK_URL = /^(https?:\/\/)(localhost|127\.0\.0\.1)(?=[:/]|$)/i;

/**
 * Where to send the token. In development a phone's (or emulator's) `localhost`
 * is the device itself, not the computer running `npm start`, so a localhost
 * verify URL is pointed at the host the app loaded its JS bundle from — the
 * same machine, reachable from the device. The widget's page origin
 * (`recaptchaBaseUrl`) stays localhost, which is what the key's domain list has.
 */
function verifyEndpoint(): string {
  if (!__DEV__ || Platform.OS === 'web') return recaptchaVerifyUrl;
  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  return devHost ? recaptchaVerifyUrl.replace(LOOPBACK_URL, `$1${devHost}`) : recaptchaVerifyUrl;
}

/** The verify endpoint could not be reached, so the user should simply retry. */
export class RecaptchaNetworkError extends Error {
  constructor() {
    super('reCAPTCHA verification could not be reached');
    this.name = 'RecaptchaNetworkError';
  }
}

/**
 * True only when the server reports `success: true`. A rejected token, an
 * error status or an unreadable reply all resolve `false`; an unreachable
 * server rejects with {@link RecaptchaNetworkError}.
 */
export async function verifyRecaptchaToken(token: string): Promise<boolean> {
  if (!recaptchaVerifyUrl) return false;
  const endpoint = verifyEndpoint();

  // AbortSignal.timeout is not available on every runtime the app targets.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    });
  } catch {
    if (__DEV__) {
      console.warn(
        `[reCAPTCHA] ${endpoint} could not be reached` +
          (LOOPBACK_URL.test(recaptchaVerifyUrl)
            ? ' — restart the Expo dev server (it serves this endpoint), and keep a phone on the same Wi-Fi as this computer.'
            : ''),
      );
    }
    throw new RecaptchaNetworkError();
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    if (__DEV__) console.warn(`[reCAPTCHA] verify endpoint answered ${response.status}`);
    return false;
  }

  try {
    const body: unknown = await response.json();
    return typeof body === 'object' && body !== null && (body as { success?: unknown }).success === true;
  } catch {
    return false;
  }
}
