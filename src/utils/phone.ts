/** Phone helpers shared by the address form and the saved-location list. */

/** A US number is exactly ten digits — area code plus subscriber number. */
const US_DIGITS = 10;

/** Strips everything the user may have typed around the digits. */
export function toDigits(value: string, max: number): string {
  return value.replace(/\D/g, '').slice(0, max);
}

/**
 * Progressive US mask: `212` → `(212) 555` → `(212) 555-0134`.
 *
 * Applied on every keystroke, so it has to read well half-typed as well as
 * complete — never add a closing bracket the caret has not reached yet.
 */
export function formatUsPhone(value: string): string {
  const digits = toDigits(value, US_DIGITS);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function isCompleteUsPhone(value: string): boolean {
  return toDigits(value, US_DIGITS).length === US_DIGITS;
}

/**
 * International numbers are left as the customer typed them — spacing and
 * grouping vary by country, so masking them would do more harm than good.
 */
export function formatIntlPhone(code: string, number: string): string {
  const dialCode = toDigits(code, 4);
  const rest = number.trim();
  if (!rest) return '';
  return dialCode ? `+${dialCode} ${rest}` : rest;
}

/** Appends `ext. 12` when there is one. */
export function withExtension(number: string, extension: string): string {
  const ext = toDigits(extension, 6);
  if (!number) return '';
  return ext ? `${number} ext. ${ext}` : number;
}
