/**
 * Form validation rules, one predicate per rule (reverse-engineer-guide/26).
 *
 * Client-side checks are a courtesy to the person typing — they catch typos
 * before a round trip. The server still has to validate everything itself.
 *
 * Every predicate trims its input first, so a stray space never decides a
 * result (the legacy validators meant to, but a typo skipped it — guide 26 §9).
 */

import { FIELD_LIMITS as L } from '@/constants/fieldLimits';

// ── E-mail ────────────────────────────────────────────────────────────────

/**
 * Deliberately permissive: one `@`, something either side, a dot in the
 * domain. Anything stricter starts rejecting addresses that genuinely deliver
 * (guide 26 §9: the legacy regex rejected `+` tags).
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length <= L.EMAIL && EMAIL.test(trimmed);
}

// ── Phones ────────────────────────────────────────────────────────────────

/** Ten digits, area code first; a US area code never starts with 0 or 1 (`isValidPhone`). */
const US_PHONE = /^[2-9]\d{9}$/;

export function isValidUsPhone(digits: string): boolean {
  return US_PHONE.test(digits.trim());
}

export function isValidExtension(value: string): boolean {
  return new RegExp(`^\\d{1,${L.EXTENSION}}$`).test(value.trim());
}

/** Why an international number is not usable yet, or `null` when it is (or is blank). */
export type IntlPhoneProblem = 'codeRequired' | 'numberRequired' | 'incomplete';

/**
 * The code and the number are a pair: one without the other is incomplete
 * (`isValidPhoneInternational`). The number needs 4 digits and the pair 7.
 * Both arguments are digits only.
 */
export function intlPhoneProblem(code: string, number: string): IntlPhoneProblem | null {
  if (!code && !number) return null;
  if (!code) return 'codeRequired';
  if (!number) return 'numberRequired';
  if (number.length < L.INTL_NUMBER_MIN || code.length + number.length < L.INTL_TOTAL_MIN) {
    return 'incomplete';
  }
  return null;
}

// ── Addresses ─────────────────────────────────────────────────────────────

export function isValidZip(value: string): boolean {
  return new RegExp(`^\\d{${L.ZIP}}$`).test(value.trim());
}

export function isValidBuildingNo(value: string): boolean {
  return new RegExp(`^\\d{1,${L.BUILDING_NO}}$`).test(value.trim());
}

/** Street and cross street: letters, digits, space and `. , - ( ) / &` (`isValidStreets`). */
const STREET_CHARS = /^[A-Za-z0-9 .,\-()/&]+$/;

export function hasValidStreetChars(value: string): boolean {
  return STREET_CHARS.test(value.trim());
}

/** A street name: valid characters, 4 to 30 of them (`isValidStreetName`). */
export function isValidStreetName(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= L.STREET_MIN && trimmed.length <= L.STREET && hasValidStreetChars(trimmed);
}

/** Pickup point: letters, digits, space and `. , ~ & / - ( ) \ #`, at most 20. */
const PICKUP_POINT_CHARS = /^[A-Za-z0-9 .,~&/\-()\\#]+$/;

export function isValidPickupPoint(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length <= L.PICKUP_POINT && PICKUP_POINT_CHARS.test(trimmed);
}

/**
 * Letters, digits, space and `. ? - _ , ( ) : / ' ~ & < > [ ] { } @ ! % $`
 * (`isValidLandmark`) — also the cancel reason's set (guide 26 §11).
 */
const LANDMARK_CHARS = /^[A-Za-z0-9 .?\-_,():/'~&<>[\]{}@!%$]+$/;

export function hasValidLandmarkChars(value: string): boolean {
  return LANDMARK_CHARS.test(value.trim());
}

/** Directions, notes, apartment, company name: anything but `"` (`isValidAlphaNumericForDirection`). */
export function hasNoDoubleQuote(value: string): boolean {
  return !value.includes('"');
}

// ── Names ─────────────────────────────────────────────────────────────────

/** First and last names: no digits and no `"` (`isValidAlpha`). */
export function isValidNameChars(value: string): boolean {
  return /^[^\d"]*$/.test(value.trim());
}

/** Card holder: letters, spaces, full stops and apostrophes, 2 to 30 (`isValidCardHolderName`). */
const CARD_HOLDER = /^[\p{L} .']+$/u;

export function isValidCardHolderName(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.length >= L.CARD_HOLDER_MIN && trimmed.length <= L.CARD_HOLDER && CARD_HOLDER.test(trimmed)
  );
}

// ── Accounts ──────────────────────────────────────────────────────────────

/** A VIP number: digits only, at most 10. */
export function isValidVipNumber(value: string): boolean {
  return new RegExp(`^\\d{1,${L.VIP_NUMBER}}$`).test(value.trim());
}

/** Letters, digits and spaces (`isValidAlphaNumericWithoutDashes`): flight numbers, account numbers. */
export function isAlphanumericWithSpaces(value: string): boolean {
  return /^[A-Za-z0-9 ]+$/.test(value.trim());
}

/** Account requirement answers: letters, digits and `- _ space . , / &`. */
export function isValidRequirementAnswer(value: string): boolean {
  return /^[A-Za-z0-9\-_ .,/&]+$/.test(value.trim());
}

// ── Passwords ─────────────────────────────────────────────────────────────

export type PasswordProblem = 'length' | 'characters';

/** Login passwords: 4 to 10 characters, no `'` or `"` (guide 26 §5). Not trimmed — spaces count. */
export function passwordProblem(password: string): PasswordProblem | null {
  if (password.length < L.PASSWORD_MIN || password.length > L.PASSWORD) return 'length';
  if (/['"]/.test(password)) return 'characters';
  return null;
}

export function isAllowedPassword(password: string): boolean {
  return passwordProblem(password) === null;
}

// ── Errors objects ────────────────────────────────────────────────────────

/** True when an errors object (nested objects and arrays included) holds any message. */
export function hasErrors(errors: object): boolean {
  return Object.values(errors).some((entry) =>
    typeof entry === 'object' && entry !== null ? hasErrors(entry) : Boolean(entry),
  );
}
