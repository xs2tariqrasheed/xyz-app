import {
  MAX_ACCOUNT_REQUIREMENTS,
  type RegistrationDraft,
} from '@/components/register/registration';
import { DB_INTERNAL_ERROR_CODE, DB_SUCCESS_CODE } from '@/constants/actionCodes';
import { normalizeLoginId } from '@/services/auth';
import { GatewayError, type GatewayJData, type GatewayResponse, mapRows } from '@/services/gateway';
import { CONFIRMATION_CODES, mailingAddressParams, SPECIAL_OFFER_CODES } from '@/services/profile';
import { detectBrand, type CardBrand } from '@/utils/payment';
import { digitsOnly, toIntlDigits } from '@/utils/phone';

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
 * `P_PAYMENT_TYPE` per billing choice. "1" (corporate account) is the backend
 * test client's value, and `RES.S.BILLING_METHOD` answers "1" = Corporate Account.
 */
export const PAYMENT_TYPE_CODES = {
  corporate: '1',
  // TODO(schema-unverified): the credit-card code is not in any backend sample;
  // confirm it with the backend and remove this comment.
  card: 'CC',
} as const;

/**
 * `P_CC_TYPE` per detected brand: the old site's `CardType` codes
 * (reverse-engineer-implemented/guide/04 §4.1); the backend's reservation test
 * client sends the same numeric codes ("0").
 */
export const CARD_TYPE_CODES: Record<CardBrand, string> = {
  visa: '2',
  mastercard: '1',
  amex: '0',
  discover: '5',
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
    throw new RegistrationError(refusalMessage(result, fallback));
  }
}

/**
 * The procedure's own refusal text, or `fallback`. `o_code` "9" is a database
 * error whose message is raw Oracle text (guide §10), so it never reaches the
 * screen.
 */
function refusalMessage(result: Record<string, string>, fallback: string): string {
  if (result.o_code === DB_INTERNAL_ERROR_CODE) return fallback;
  return ('o_message' in result ? result.o_message.trim() : '') || fallback;
}

/** Columns every procedure answer carries; anything else is the procedure's data. */
const RESULT_COLUMNS: ReadonlySet<string> = new Set(['o_code', 'o_message']);

/** Values that mean "no" in a flag or count column. */
const NEGATIVE_VALUES: ReadonlySet<string> = new Set(['', 'N', 'NO', '0', 'FALSE']);

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
 * requirement field, in `P_ACCOUNT_REQ1–4` order. An account without
 * requirements answers a single `dummy` heading (`"X"`), which means no
 * fields (guide §10). A record set may carry no result code, so `o_code` is
 * only checked when present; no rows means no fields.
 */
export function accountRequirementLabels(response: GatewayResponse, fallback: string): string[] {
  const headings = (response.JMetaData?.Headings ?? []).map((heading) =>
    String(Array.isArray(heading) ? heading[0] : heading),
  );
  if (headings.length === 1 && headings[0] === NO_REQUIREMENTS_HEADING) return [];

  const rows = mapRows(response);
  const result = rows[0];
  if (result && 'o_code' in result && result.o_code !== DB_SUCCESS_CODE) {
    throw new RegistrationError(refusalMessage(result, fallback));
  }

  return rows.map(requirementLabel).filter(Boolean).slice(0, MAX_ACCOUNT_REQUIREMENTS);
}

/** The only heading `_RS` sends for an account with no requirements. */
const NO_REQUIREMENTS_HEADING = 'dummy';

/**
 * A row's field name. No account with requirements has been seen yet
 * (docs/XYZ_INTEGRATION_GUIDE.md §10).
 */
function requirementLabel(row: Record<string, string>): string {
  // TODO(schema-unverified): assumed the field name arrives under `o_message`;
  // confirm against an account with requirements and remove this comment. Do
  // NOT replace with a list of fallback headings.
  return 'o_message' in row ? row.o_message.trim() : '';
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
    ...mailingAddressParams(address),
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
    P_CONFIRMATION_METHOD: preferences.confirmByPhone ? CONFIRMATION_CODES.phone : CONFIRMATION_CODES.email,
    P_PREFERRED_FLEET: car.preferredFleet.trim(),
    // TODO(schema-unverified): the backend test client sends P_CAR_YEAR "90" and
    // P_CAR_PHONE "N" (a Y/N flag, not a number); confirm both meanings with the
    // backend and remove this comment.
    P_CAR_YEAR: car.carYear,
    P_CAR_PHONE: car.carPhone.number,
    P_SPECIAL_OFFER: preferences.subscribeSpecialOffers ? SPECIAL_OFFER_CODES.yes : SPECIAL_OFFER_CODES.no,
    P_SMOKING_CAR: car.smokingCar ? 'Y' : 'N',
    P_IVR_PIN: car.ivrPin,
  };
}
