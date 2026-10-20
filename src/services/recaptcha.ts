import { recaptchaVerifyUrl } from '@/config/recaptcha';

/**
 * Server-side check of a reCAPTCHA v2 token through `api/verify-recaptcha.ts`,
 * which holds the secret key and asks Google's `siteverify`.
 *
 * This is not an XYZ gateway call (the gateway has no captcha action code), so
 * it uses `fetch` directly rather than `usePostData`.
 */

const VERIFY_TIMEOUT_MS = 15_000;

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

  // AbortSignal.timeout is not available on every runtime the app targets.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(recaptchaVerifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    });
  } catch {
    if (__DEV__) {
      console.warn(
        `[reCAPTCHA] ${recaptchaVerifyUrl} could not be reached` +
          (recaptchaVerifyUrl.includes('localhost') ? ' — start the app with `npm run web` (or `npm run recaptcha:dev`).' : ''),
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
