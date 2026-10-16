import {
  MAX_ACCOUNT_REQUIREMENTS,
  type RegistrationDraft,
} from '@/components/register/registration';
import { DB_SUCCESS_CODE } from '@/constants/actionCodes';
import { normalizeLoginId } from '@/services/auth';
import { GatewayError, type GatewayJData, type GatewayResponse, mapRows } from '@/services/gateway';
import { detectBrand, digitsOnly, type CardBrand } from '@/utils/payment';
import { COUNTRIES, toIntlDigits } from '@/utils/phone';

/**
 * New-account registration against the API gateway
 * (docs/XYZ Action Codes.md, PROFILE MODULE).
 *
 * Every lookup answers with `o_code` / `o_message` in its first row. "0"
 * means the check passed; any other code is the server's refusal, carried by
 * {@link RegistrationError}. A response without `o_code` fails closed.
 */

/** Thrown when the server refuses a registration step, as opposed to failing. */
export class RegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RegistrationError';
  }
}

/**
 * `P_PAYMENT_TYPE` per billing choice. Only "CC" appears in the contract's
 * samples; the corporate-account code is an assumption to confirm with the
 * backend.
 */
export const PAYMENT_TYPE_CODES = { corporate: 'CA', card: 'CC' } as const;

/** `P_ADDRESS_TYPE`. "H" is the documented sample; "O" mirrors it for office. */
export const ADDRESS_TYPE_CODES = { home: 'H', office: 'O' } as const;

/** `P_CC_TYPE` per detected brand, in the old site's spelling. */
export const CARD_TYPE_CODES: Record<CardBrand, string> = {
  visa: 'VISA',
  mastercard: 'MASTER',
  amex: 'AMEX',
  discover: 'DISCOVER',
  unknown: '',
};

/** `JData` for {@link ACTION_CODES.IS_UNIQUE_EMAIL}. */
export function uniqueEmailJData(email: string): GatewayJData {
  return { P_LOGIN_ID: normalizeLoginId(email) };
}

/** `JData` for {@link ACTION_CODES.IS_VALID_COMPANY_NAME}. */
export function companyNameJData(accountNumber: string, companyName: string): GatewayJData {
  return { P_ACCOUNT_NUM: accountNumber.trim(), P_COMPANY_NAME: companyName.trim() };
}

/** `JData` for {@link ACTION_CODES.IS_VALID_VIP}. */
export function vipJData(accountNumber: string, vipNumber: string): GatewayJData {
  return { P_ACCOUNT_NUM: accountNumber.trim(), P_VIP_NUM: vipNumber.trim() };
}

/**
 * Throws unless the procedure answered `o_code` "0". `fallback` is the copy
 * shown when the server refuses without a message of its own.
 */
export function assertRegistrationStep(response: GatewayResponse, fallback: string): void {
  const result = mapRows(response)[0];
  if (!result || !('o_code' in result)) {
    throw new GatewayError('parsing', 'The registration response has no result code.');
  }
  if (result.o_code !== DB_SUCCESS_CODE) {
    throw new RegistrationError(result.o_message || fallback);
  }
}

/** Columns every procedure answer carries; anything else is the procedure's data. */
const RESULT_COLUMNS: ReadonlySet<string> = new Set(['o_code', 'o_message']);

/** Values that mean "no" in a flag or count column. */
const NEGATIVE_VALUES: ReadonlySet<string> = new Set(['', 'N', 'NO', '0', 'FALSE']);

/**
 * Columns an `ACCOUNT_REQUIREMENTS_RS` row may name its field in, first match
 * wins. The contract lists no outputs for either requirements code (the
 * gateway stub returns placeholders), so these follow the procedure's naming
 * style; a row with none of them falls back to its first text value.
 */
export const REQUIREMENT_LABEL_COLUMNS = [
  'requirement_label',
  'req_label',
  'requirement_name',
  'req_name',
  'requirement',
  'label',
  'description',
] as const;

/** `JData` for {@link ACTION_CODES.ACCOUNT_REQUIREMENTS} and `_RS` — both take the account only. */
export function accountRequirementsJData(accountNumber: string): GatewayJData {
  return { P_ACCOUNT_NUM: accountNumber.trim() };
}

/**
 * Reads an {@link ACTION_CODES.ACCOUNT_REQUIREMENTS} answer: whether the
 * account asks new users for requirement fields at all. Throws on a refusal
 * (an account that cannot be registered against), like the other checks.
 *
 * The procedure's outputs are undocumented, so any value besides
 * `o_code` / `o_message` that is not a "no" (`N`, `0`, empty …) counts as
 * yes. A wrong yes only costs one `_RS` call that comes back empty.
 */
export function accountHasRequirements(response: GatewayResponse, fallback: string): boolean {
  assertRegistrationStep(response, fallback);
  const row = mapRows(response)[0] ?? {};

  return Object.entries(row).some(
    ([column, value]) => !RESULT_COLUMNS.has(column) && !NEGATIVE_VALUES.has(value.trim().toUpperCase()),
  );
}

/**
 * Reads an {@link ACTION_CODES.ACCOUNT_REQUIREMENTS_RS} answer: one row per
 * requirement field, in `P_ACCOUNT_REQ1–4` order. A record set may carry no
 * result code, so `o_code` is only checked when present; no rows means no
 * fields.
 */
export function accountRequirementLabels(response: GatewayResponse, fallback: string): string[] {
  const rows = mapRows(response);
  const result = rows[0];
  if (result && 'o_code' in result && result.o_code !== DB_SUCCESS_CODE) {
    throw new RegistrationError(result.o_message || fallback);
  }

  return rows.map(requirementLabel).filter(Boolean).slice(0, MAX_ACCOUNT_REQUIREMENTS);
}

/** A row's field name: a known label column, else its first non-numeric value. */
function requirementLabel(row: Record<string, string>): string {
  const named = REQUIREMENT_LABEL_COLUMNS.find((column) => row[column]?.trim());
  if (named) return row[named].trim();

  const text = Object.entries(row).find(
    ([column, value]) => !RESULT_COLUMNS.has(column) && value.trim() && !/^\d+$/.test(value.trim()),
  );
  return text ? text[1].trim() : '';
}

/** The `P_COUNTRY` code for a country name from the address form. */
function countryCode(name: string): string {
  return COUNTRIES.find((country) => country.name === name)?.code ?? name.trim();
}

/** `MM/YY` → ['MM', 'YYYY'], or blanks while incomplete. */
function splitExpiry(expiry: string): [string, string] {
  const digits = digitsOnly(expiry);
  if (digits.length !== 4) return ['', ''];
  return [digits.slice(0, 2), `20${digits.slice(2)}`];
}

/**
 * `JData` for {@link ACTION_CODES.CREATE_PROFILE}. Every contract parameter
 * is sent; the ones left empty go out blank. `requirementCount` is how many
 * requirement fields the account asked for — only those answers are sent.
 */
export function createProfileJData(draft: RegistrationDraft, requirementCount: number): GatewayJData {
  const { account, personal, address, billing, preferences, car } = draft;
  const corporate = billing.method === 'corporate';
  const card = corporate ? null : billing.card;
  const [ccMonth, ccYear] = card ? splitExpiry(card.expiry) : ['', ''];
  const requirement = (index: number) =>
    corporate && index < requirementCount ? (billing.requirements[index] ?? '').trim() : '';

  return {
    P_LOGIN_ID: normalizeLoginId(account.email),
    P_PASSWORD: account.password,
    P_CONFIRM_PASSWORD: account.confirmPassword,
    P_FIRST_NAME: personal.firstName.trim(),
    P_LAST_NAME: personal.lastName.trim(),
    P_PHONE_NUMBER: toIntlDigits(personal.intlPhone),
    P_PHONE_EXT: personal.intlPhone.number ? personal.intlPhone.ext : '',
    P_PHONE_NUMBER_US: personal.usPhone.number,
    P_PHONE_EXT_US: personal.usPhone.number ? personal.usPhone.ext : '',
    P_FAX: toIntlDigits(personal.fax),
    P_COUNTRY: countryCode(address.country),
    P_STATE: address.state.trim(),
    P_CITY: address.city.trim(),
    P_ZIP: address.postalCode.trim(),
    P_BUILDING_NUM: address.buildingNumber.trim(),
    P_STREET_NAME: address.streetName.trim(),
    P_CROSS_STREET1: address.crossStreet.trim(),
    // Apt # / Mail stop has no parameter of its own, so it uses the second
    // cross-street slot, which the form does not otherwise fill.
    P_CROSS_STREET2: address.unit.trim(),
    P_ADDRESS_PHONE: digitsOnly(`${address.intlDialCode}${address.intlPhone}`),
    P_ADDRESS_PHONE_US: digitsOnly(address.phone),
    P_ADDRESS_TYPE: ADDRESS_TYPE_CODES[address.addressType],
    P_PAYMENT_TYPE: PAYMENT_TYPE_CODES[billing.method],
    P_ACCOUNT_NUM: corporate ? billing.accountNumber.trim() : '',
    P_VIP_NUM: corporate ? billing.vipNumber.trim() : '',
    P_CC_TYPE: card ? CARD_TYPE_CODES[detectBrand(card.number)] : '',
    P_CARD_HOLDER_NAME: card ? card.holder.trim() : '',
    P_CARD_NUMBER: card ? digitsOnly(card.number) : '',
    P_VERIFY_CODE: card ? card.cvv : '',
    P_CC_MONTH: ccMonth,
    P_CC_YEAR: ccYear,
    P_ACCOUNT_REQ1: requirement(0),
    P_ACCOUNT_REQ2: requirement(1),
    P_ACCOUNT_REQ3: requirement(2),
    P_ACCOUNT_REQ4: requirement(3),
    P_CONFIRMATION_METHOD: preferences.confirmByPhone ? 'PHONE' : 'EMAIL',
    P_PREFERRED_FLEET: car.preferredFleet.trim(),
    P_CAR_YEAR: car.carYear,
    P_CAR_PHONE: car.carPhone.number,
    P_SPECIAL_OFFER: preferences.subscribeSpecialOffers ? 'Y' : 'N',
    P_SMOKING_CAR: car.smokingCar ? 'Y' : 'N',
    P_IVR_PIN: car.ivrPin,
  };
}
