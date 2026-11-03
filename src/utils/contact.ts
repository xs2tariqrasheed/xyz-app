/**
 * Formatting for the mailing address form's international number.
 *
 * Display formatting only, so a field can format as the user types without
 * ever rejecting a keystroke. US numbers use `formatUsPhone` (src/utils/phone.ts).
 */

import { digitsOnly } from '@/utils/phone';

/** Keeps `+`, digits and separators — dial codes vary too much to reformat. */
export function formatDialCode(value: string): string {
  const cleaned = value.replace(/[^\d+]/g, '').slice(0, 6);
  return cleaned.startsWith('+') ? `+${digitsOnly(cleaned)}` : digitsOnly(cleaned);
}

/** International numbers are only normalised, never re-grouped. */
export function normalizeIntlPhone(value: string): string {
  return value.replace(/[^\d\s-]/g, '').slice(0, 16);
}
