/**
 * Phone and email helpers for the callback fields.
 *
 * Numbers are stored as bare digits and formatted only for display, so a
 * backspace can never get stuck on a separator the formatter re-adds.
 */

/** One row of the international dialling picker. */
export type Country = {
  /** ISO 3166-1 alpha-2. Shown in the control's leading chip. */
  code: string;
  name: string;
  /** E.164 calling code, without the plus. */
  dial: string;
};

/** Alphabetical by name — the order the picker lists them in. */
export const COUNTRIES: readonly Country[] = [
  { code: 'AR', name: 'Argentina', dial: '54' },
  { code: 'AU', name: 'Australia', dial: '61' },
  { code: 'AT', name: 'Austria', dial: '43' },
  { code: 'BD', name: 'Bangladesh', dial: '880' },
  { code: 'BE', name: 'Belgium', dial: '32' },
  { code: 'BR', name: 'Brazil', dial: '55' },
  { code: 'CA', name: 'Canada', dial: '1' },
  { code: 'CL', name: 'Chile', dial: '56' },
  { code: 'CN', name: 'China', dial: '86' },
  { code: 'CO', name: 'Colombia', dial: '57' },
  { code: 'CZ', name: 'Czechia', dial: '420' },
  { code: 'DK', name: 'Denmark', dial: '45' },
  { code: 'EG', name: 'Egypt', dial: '20' },
  { code: 'FI', name: 'Finland', dial: '358' },
  { code: 'FR', name: 'France', dial: '33' },
  { code: 'DE', name: 'Germany', dial: '49' },
  { code: 'GH', name: 'Ghana', dial: '233' },
  { code: 'GR', name: 'Greece', dial: '30' },
  { code: 'HK', name: 'Hong Kong', dial: '852' },
  { code: 'HU', name: 'Hungary', dial: '36' },
  { code: 'IN', name: 'India', dial: '91' },
  { code: 'ID', name: 'Indonesia', dial: '62' },
  { code: 'IE', name: 'Ireland', dial: '353' },
  { code: 'IL', name: 'Israel', dial: '972' },
  { code: 'IT', name: 'Italy', dial: '39' },
  { code: 'JP', name: 'Japan', dial: '81' },
  { code: 'KE', name: 'Kenya', dial: '254' },
  { code: 'MY', name: 'Malaysia', dial: '60' },
  { code: 'MX', name: 'Mexico', dial: '52' },
  { code: 'MA', name: 'Morocco', dial: '212' },
  { code: 'NL', name: 'Netherlands', dial: '31' },
  { code: 'NZ', name: 'New Zealand', dial: '64' },
  { code: 'NG', name: 'Nigeria', dial: '234' },
  { code: 'NO', name: 'Norway', dial: '47' },
  { code: 'PK', name: 'Pakistan', dial: '92' },
  { code: 'PE', name: 'Peru', dial: '51' },
  { code: 'PH', name: 'Philippines', dial: '63' },
  { code: 'PL', name: 'Poland', dial: '48' },
  { code: 'PT', name: 'Portugal', dial: '351' },
  { code: 'QA', name: 'Qatar', dial: '974' },
  { code: 'RO', name: 'Romania', dial: '40' },
  { code: 'SA', name: 'Saudi Arabia', dial: '966' },
  { code: 'SG', name: 'Singapore', dial: '65' },
  { code: 'ZA', name: 'South Africa', dial: '27' },
  { code: 'KR', name: 'South Korea', dial: '82' },
  { code: 'ES', name: 'Spain', dial: '34' },
  { code: 'SE', name: 'Sweden', dial: '46' },
  { code: 'CH', name: 'Switzerland', dial: '41' },
  { code: 'TW', name: 'Taiwan', dial: '886' },
  { code: 'TH', name: 'Thailand', dial: '66' },
  { code: 'TR', name: 'Türkiye', dial: '90' },
  { code: 'UA', name: 'Ukraine', dial: '380' },
  { code: 'AE', name: 'United Arab Emirates', dial: '971' },
  { code: 'GB', name: 'United Kingdom', dial: '44' },
  { code: 'US', name: 'United States', dial: '1' },
  { code: 'VN', name: 'Vietnam', dial: '84' },
];

export function findCountry(code: string | null): Country | undefined {
  return code === null ? undefined : COUNTRIES.find((country) => country.code === code);
}

/**
 * The picker row for a calling code such as `44` or `+44`. Codes shared by
 * several countries (+1, +7) resolve to the first one listed — the saved
 * number only keeps the code, so any of them round-trips the same digits.
 */
export function findCountryByDial(dial: string): Country | undefined {
  const digits = dial.replace(/\D/g, '');
  return digits ? COUNTRIES.find((country) => country.dial === digits) : undefined;
}

/** Calling code + number as one run of digits, or '' when there is no number. */
export function toIntlDigits(phone: { country: string | null; number: string }): string {
  if (!phone.number) return '';
  return `${findCountry(phone.country)?.dial ?? ''}${phone.number}`;
}

/** Case-insensitive match on country name, ISO code or dialling code. */
export function searchCountries(query: string): readonly Country[] {
  const needle = query.trim().toLowerCase().replace(/^\+/, '');
  if (needle.length === 0) return COUNTRIES;

  return COUNTRIES.filter(
    (country) =>
      country.name.toLowerCase().includes(needle) ||
      country.code.toLowerCase().startsWith(needle) ||
      country.dial.startsWith(needle),
  );
}

export const US_PHONE_DIGITS = 10;
/** E.164 caps a subscriber number at 15 digits including the calling code. */
export const MAX_INTL_DIGITS = 15;
const MAX_EXT_DIGITS = 6;

/** Strips everything but digits and clamps to `max`. */
export function toDigits(input: string, max: number): string {
  return input.replace(/\D/g, '').slice(0, max);
}

export function toExtension(input: string): string {
  return toDigits(input, MAX_EXT_DIGITS);
}

/** `2125551234` → `(212) 555-1234`, and every partial state on the way there. */
export function formatUsPhone(digits: string): string {
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Loose grouping in threes. Real grouping varies by country, so this only
 * spaces the digits — and a lone trailing digit joins the group before it
 * rather than dangling on its own.
 */
export function formatIntlPhone(digits: string): string {
  const groups = digits.match(/\d{1,3}/g) ?? [];
  if (groups.length > 1 && groups[groups.length - 1].length === 1) {
    groups.splice(-2, 2, groups[groups.length - 2] + groups[groups.length - 1]);
  }
  return groups.join(' ');
}

export function isCompleteUsPhone(digits: string): boolean {
  return digits.length === US_PHONE_DIGITS;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(input: string): boolean {
  return EMAIL.test(input.trim());
}

/** Appends `ext. 12` when there is one. */
export function withExtension(number: string, extension: string): string {
  const ext = toExtension(extension);
  if (!number) return '';
  return ext ? `${number} ext. ${ext}` : number;
}
