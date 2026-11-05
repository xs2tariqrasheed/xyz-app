/**
 * Where customers reach a person, read from `.env` (reverse-engineer-guide/25 §4:
 * "keep phone numbers / e-mail in configuration"):
 *
 *     EXPO_PUBLIC_SUPPORT_EMAIL=customer.service@xyzcar.com
 *     EXPO_PUBLIC_OFFICE_PHONE=929-XYZLimo
 *
 * An unset value hides the line that would show it — never a made-up stand-in.
 *
 * Expo inlines `EXPO_PUBLIC_*` variables at build time, so the references
 * below must stay static dot notation — `process.env['...']` is not
 * substituted.
 */

/** Shown on the unexpected-error screen. Empty when unset. */
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() ?? '';

/** Shown on the booking receipt and ride documents. Empty when unset. */
export const OFFICE_PHONE = process.env.EXPO_PUBLIC_OFFICE_PHONE?.trim() ?? '';

if (__DEV__) {
  const missing = [
    !SUPPORT_EMAIL && 'EXPO_PUBLIC_SUPPORT_EMAIL',
    !OFFICE_PHONE && 'EXPO_PUBLIC_OFFICE_PHONE',
  ].filter(Boolean);
  if (missing.length > 0) {
    console.warn(
      `[Support] The support contact lines are hidden — set ${missing.join(', ')} in .env, then restart Expo.`,
    );
  }
}
