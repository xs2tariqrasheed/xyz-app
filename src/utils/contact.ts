/**
 * Phone and postal-code formatting for the address forms.
 *
 * Everything here is display formatting over a digits-only value, so a field
 * can format as the user types without ever rejecting a keystroke.
 */

/** Length of a US phone number, area code included. */
export const US_PHONE_LENGTH = 10;

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Formats as `(212) 555-0134`, filling in the punctuation only once the digits
 * that need it have been typed. Anything past ten digits is dropped.
 */
export function formatUsPhone(value: string): string {
  const digits = digitsOnly(value).slice(0, US_PHONE_LENGTH);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** `12345` or `12345-6789`. The hyphen appears with the sixth digit. */
export function formatUsZip(value: string): string {
  const digits = digitsOnly(value).slice(0, 9);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

/** A US ZIP is valid at five digits, or at nine for ZIP+4. */
export function isValidUsZip(value: string): boolean {
  const length = digitsOnly(value).length;
  return length === 5 || length === 9;
}

/** Keeps `+`, digits and separators — dial codes vary too much to reformat. */
export function formatDialCode(value: string): string {
  const cleaned = value.replace(/[^\d+]/g, '').slice(0, 6);
  return cleaned.startsWith('+') ? `+${digitsOnly(cleaned)}` : digitsOnly(cleaned);
}

/** International numbers are only normalised, never re-grouped. */
export function formatIntlPhone(value: string): string {
  return value.replace(/[^\d\s-]/g, '').slice(0, 16);
}
