/**
 * Form validation helpers.
 *
 * Client-side checks are a courtesy to the person typing — they catch typos
 * before a round trip. The server still has to validate everything itself.
 */

/**
 * Deliberately permissive: one `@`, something either side, a dot in the
 * domain. Anything stricter starts rejecting addresses that genuinely deliver.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}

/** Street and cross street: letters, digits, space and `. , - ( ) / &` (guide 26 `isValidStreets`). */
const STREET_CHARS = /^[A-Za-z0-9 .,\-()/&]+$/;

export function hasValidStreetChars(value: string): boolean {
  return STREET_CHARS.test(value);
}
