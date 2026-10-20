/**
 * Google reCAPTCHA v2 ("I'm not a robot" Checkbox) configuration, read from
 * `.env`:
 *
 *     EXPO_PUBLIC_RECAPTCHA_SITE_KEY=6L...
 *     EXPO_PUBLIC_RECAPTCHA_VERIFY_URL=https://…/api/verify-recaptcha
 *
 * Expo inlines `EXPO_PUBLIC_*` variables at build time, so the references
 * below must stay static dot notation — `process.env['...']` is not
 * substituted.
 *
 * The secret key is NOT here: it lives only on the server
 * (`api/verify-recaptcha.ts`), which checks each token with Google.
 */
const rawSiteKey = process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY;
const rawVerifyUrl = process.env.EXPO_PUBLIC_RECAPTCHA_VERIFY_URL;

export const recaptchaSiteKey = rawSiteKey?.trim() ?? '';

export const recaptchaVerifyUrl = rawVerifyUrl?.trim() ?? '';

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

/**
 * The page origin the native widget is loaded under. Google only serves the
 * widget on hosts listed for the key, so this host must be on that list.
 */
export const recaptchaBaseUrl = originOf(recaptchaVerifyUrl);

/** False until both values are set — the check then refuses to pass. */
export const hasRecaptchaConfig = recaptchaSiteKey.length > 0 && recaptchaBaseUrl.length > 0;

if (__DEV__ && !hasRecaptchaConfig) {
  const missing = [
    !recaptchaSiteKey && 'EXPO_PUBLIC_RECAPTCHA_SITE_KEY',
    !recaptchaBaseUrl && 'EXPO_PUBLIC_RECAPTCHA_VERIFY_URL (an absolute URL)',
  ].filter(Boolean);
  console.warn(
    `[reCAPTCHA] The checkbox is hidden — set ${missing.join(' and ')} in .env, then restart Expo. ` +
      'Locally, use http://localhost:3009/api/verify-recaptcha (served by `npm run web`).',
  );
}
