/**
 * Pure card helpers for the billing section.
 *
 * Formatting and light validation only — enough to catch a typo before the
 * reservation is submitted. The real authorisation happens server side.
 */

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown';

export const BRAND_LABEL: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
  discover: 'Discover',
  unknown: 'Card',
};

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Brand from the leading digits. Ranges are deliberately loose — this only
 * drives grouping, field lengths and the label on the summary chip.
 */
export function detectBrand(value: string): CardBrand {
  const digits = digitsOnly(value);
  if (/^4/.test(digits)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'mastercard';
  if (/^3[47]/.test(digits)) return 'amex';
  if (/^6(?:011|5)/.test(digits)) return 'discover';
  return 'unknown';
}

/** Amex prints its number 4-6-5; every other brand groups in fours. */
const GROUPS: Record<CardBrand, readonly number[]> = {
  amex: [4, 6, 5],
  visa: [4, 4, 4, 4],
  mastercard: [4, 4, 4, 4],
  discover: [4, 4, 4, 4],
  unknown: [4, 4, 4, 4],
};

export function cardNumberLength(brand: CardBrand): number {
  return brand === 'amex' ? 15 : 16;
}

export function cvvLength(brand: CardBrand): number {
  return brand === 'amex' ? 4 : 3;
}

/** Reflows the digits into brand-correct groups as the customer types. */
export function formatCardNumber(value: string): string {
  const brand = detectBrand(value);
  const digits = digitsOnly(value).slice(0, cardNumberLength(brand));

  const parts: string[] = [];
  let index = 0;
  for (const size of GROUPS[brand]) {
    if (index >= digits.length) break;
    parts.push(digits.slice(index, index + size));
    index += size;
  }

  return parts.join(' ');
}

/** `•••• 4242` — the only form of the number we ever read back on screen. */
export function maskCardNumber(value: string): string {
  const digits = digitsOnly(value);
  return digits.length >= 4 ? `•••• ${digits.slice(-4)}` : '';
}

/** Luhn checksum: catches a transposed or mistyped digit. */
export function passesLuhn(value: string): boolean {
  const digits = digitsOnly(value);
  if (digits.length === 0) return false;

  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = digits.charCodeAt(i) - 48;
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }

  return sum % 10 === 0;
}

export function isCompleteCardNumber(value: string): boolean {
  return digitsOnly(value).length === cardNumberLength(detectBrand(value)) && passesLuhn(value);
}

/**
 * Types as `MM/YY`. A lone digit that cannot start a month (2–9) is promoted
 * to a padded month, so "3" becomes "03/" without a second keystroke.
 */
export function formatExpiry(value: string): string {
  const digits = digitsOnly(value).slice(0, 4);
  if (digits.length === 0) return '';
  if (digits.length === 1) return Number(digits) <= 1 ? digits : `0${digits}/`;

  const month = digits.slice(0, 2);
  const year = digits.slice(2);
  return year.length > 0 ? `${month}/${year}` : month;
}

/** Cards are good through the last day of the printed month. */
export function isValidExpiry(value: string, now: Date): boolean {
  const digits = digitsOnly(value);
  if (digits.length !== 4) return false;

  const month = Number(digits.slice(0, 2));
  if (month < 1 || month > 12) return false;

  return new Date(2000 + Number(digits.slice(2)), month, 1) > now;
}

export function isCompleteCvv(value: string, brand: CardBrand): boolean {
  return digitsOnly(value).length === cvvLength(brand);
}
