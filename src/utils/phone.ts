/**
 * Phone number helpers for the profile form.
 *
 * Everything here works on digits: the display formatting is derived, never
 * stored, so a number typed as `(415) 555-0147` and one pasted as
 * `+1 415 555 0147` end up identical.
 */

/** Digit count of a complete North American number. */
export const US_PHONE_LENGTH = 10;
/** Country + city code, e.g. `44 20`. */
export const MAX_CODE_LENGTH = 6;
/** ITU E.164 allows 15 digits including the country code. */
export const MAX_SUBSCRIBER_LENGTH = 15;
export const MAX_EXTENSION_LENGTH = 6;

/** Strips everything that is not a digit, then caps the length. */
export function digitsOnly(value: string, max: number): string {
  return value.replace(/\D+/g, '').slice(0, max);
}

/**
 * Formats as it is typed: `415` → `415`, `4155` → `(415) 5`,
 * `4155550147` → `(415) 555-0147`.
 *
 * The parentheses only appear once the area code is complete, so a backspace
 * walks the number back digit by digit instead of stalling on punctuation.
 */
export function formatUsPhone(value: string): string {
  const digits = digitsOnly(value, US_PHONE_LENGTH);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Groups an international subscriber number in threes: `2079460958` → `207 946 0958`. */
export function formatSubscriber(value: string): string {
  const digits = digitsOnly(value, MAX_SUBSCRIBER_LENGTH);
  return digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
}

export function isCompleteUsPhone(value: string): boolean {
  return digitsOnly(value, US_PHONE_LENGTH).length === US_PHONE_LENGTH;
}

/** Shortest run of digits we will accept as a real subscriber number. */
const MIN_SUBSCRIBER_LENGTH = 4;

export function isCompleteSubscriber(value: string): boolean {
  return digitsOnly(value, MAX_SUBSCRIBER_LENGTH).length >= MIN_SUBSCRIBER_LENGTH;
}

export function hasDigits(value: string): boolean {
  return /\d/.test(value);
}

/** One-line rendering for the summary: `+44 20 7946 0958 ext. 12`. */
export function formatInternational(code: string, number: string, extension = ''): string {
  const parts = [`+${digitsOnly(code, MAX_CODE_LENGTH)}`, formatSubscriber(number)];
  const ext = digitsOnly(extension, MAX_EXTENSION_LENGTH);
  return `${parts.join(' ')}${ext ? ` ext. ${ext}` : ''}`;
}
