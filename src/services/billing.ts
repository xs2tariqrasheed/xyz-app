import type { BillingMethodId, BillingMethodValue } from '@/components/reservation/BillingMethodSection';
import { DB_SUCCESS_CODE } from '@/constants/actionCodes';
import { RESERVATION_MESSAGES } from '@/constants/messages';
import { type GatewayJData, type GatewayResponse, mapRowsByHeadings } from '@/services/gateway';
import { assertResultCode, readRecords, readResult, refusalMessage } from '@/services/gatewayRows';
import { CARD_TYPE_CODES } from '@/services/registration';
import { detectBrand } from '@/utils/payment';
import { digitsOnly } from '@/utils/phone';

/**
 * Step 3 of the booking — who pays and how (reverse-engineer-implemented/guide/16).
 *
 * Card numbers only ever leave the device inside the authorisation and booking
 * calls themselves; nothing here stores, logs or echoes one back
 * (00-README §5 #1–2).
 */

/** Thrown when the server refuses a billing check, as opposed to failing. */
export class BillingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BillingError';
  }
}

/** Every method, in the order the option cards list them. */
export const ALL_BILLING_METHODS: readonly BillingMethodId[] = ['corporate', 'corporate-card', 'card'];

/**
 * `RES.S.BILLING_METHOD`'s `o_code` is the old site's `acctype` (guide 16, §10):
 * `1` Corporate Account (no account + card), `2` Credit Card With Corporate
 * Account (no plain account), `3` card only (not seen yet). `5` is "Invalid
 * Account Number.", a refusal like any other code.
 */
const METHODS_BY_ACCOUNT_TYPE: Record<string, readonly BillingMethodId[]> = {
  '1': ['corporate', 'card'],
  '2': ['corporate-card', 'card'],
  '3': ['card'],
};

/** Methods that charge a card, all a credit-card-specific account allows. */
const CARD_METHODS: readonly BillingMethodId[] = ['corporate-card', 'card'];

/** `RES.S.IS_CREDIT_CARD_SPECIFIC_ACCOUNT`: `0` "Corporate Account", `1` "Credit Card Specific" (§10). */
const CARD_SPECIFIC_CODES = { no: '0', yes: '1' } as const;

/** `JData` for {@link ACTION_CODES.BILLING_METHOD} and `IS_CREDIT_CARD_SPECIFIC_ACCOUNT`. */
export function accountJData(accountNumber: string): GatewayJData {
  return { P_ACCOUNT_NUM: accountNumber.trim() };
}

/**
 * Methods the account allows, from `RES.S.BILLING_METHOD`'s `o_code`. Any
 * code that is not an account type is a refusal and throws.
 */
export function toAllowedMethods(response: GatewayResponse): readonly BillingMethodId[] {
  const result = readResult(response);
  const methods = METHODS_BY_ACCOUNT_TYPE[result.code];
  if (!methods) throw new BillingError(refusalMessage(result, RESERVATION_MESSAGES.ACCOUNT_REJECTED));
  return methods;
}

/**
 * Whether the account takes only card payments, from
 * `RES.S.IS_CREDIT_CARD_SPECIFIC_ACCOUNT`. Any other code is a refusal and throws.
 */
export function toCardSpecific(response: GatewayResponse): boolean {
  const result = readResult(response);
  if (result.code === CARD_SPECIFIC_CODES.yes) return true;
  if (result.code === CARD_SPECIFIC_CODES.no) return false;
  throw new BillingError(refusalMessage(result, RESERVATION_MESSAGES.ACCOUNT_REJECTED));
}

/** {@link toAllowedMethods}, narrowed to the card methods for a card-specific account. */
export function accountMethods(allowed: readonly BillingMethodId[], cardSpecific: boolean): readonly BillingMethodId[] {
  return cardSpecific ? allowed.filter((method) => CARD_METHODS.includes(method)) : allowed;
}

/** `JData` for {@link ACTION_CODES.ACCOUNT_VIP_NUM}: blanks ask for what is on file. */
export function accountVipJData(loginId: string, accountNumber = '', vipNumber = ''): GatewayJData {
  return { P_LOGIN_ID: loginId, P_ACCOUNT_NUM: accountNumber.trim(), P_VIP_NUM: vipNumber.trim() };
}

export type AccountOnFile = { accountNumber: string; vipNumber: string };

/**
 * The account and VIP number on file, read by the code's headings
 * `paccountnum` / `pvipnum` (guide §10). It sends no `o_code`; a login with
 * nothing on file answers both blank, which reads as `null`.
 */
export function toAccountOnFile(response: GatewayResponse): AccountOnFile | null {
  const row = mapRowsByHeadings(response, ['paccountnum', 'pvipnum'])[0];
  if (!row) return null;
  const accountNumber = row.paccountnum.trim();
  const vipNumber = row.pvipnum.trim();
  return accountNumber || vipNumber ? { accountNumber, vipNumber } : null;
}

/** Throws a {@link BillingError} on any refusal of a yes / no account check. */
export function assertAccountCheck(response: GatewayResponse, fallback: string): void {
  assertResultCode(response, (message) => new BillingError(message), fallback);
}

/** A requirement field the account asks for (`P_ACCOUNT_REQUIREMENT1–4`). */
export type RequirementField = {
  /** 1–4: which `P_ACCOUNT_REQUIREMENTn` it fills. */
  index: number;
  label: string;
  /** Allowed answers when the account lists them; empty means free text. */
  options: readonly RequirementOption[];
};

/** One allowed answer: `value` goes in `P_ACCOUNT_REQUIREMENTn`, `label` is shown. */
export type RequirementOption = { value: string; label: string };

export const REQUIREMENT_INDEXES = [1, 2, 3, 4] as const;

/** `JData` for {@link ACTION_CODES.ACCOUNT_REQUIREMENTS_LIST}. */
export function requirementListJData(accountNumber: string, index: number): GatewayJData {
  return { P_ACCOUNT_NUM: accountNumber.trim(), P_REQUIREMENT_NUM: String(index) };
}

/**
 * `RES.S.ACCOUNT_REQUIREMENTS_LIST` headings (§10): one row per allowed answer.
 * An account with nothing at that number answers `dummy` alone.
 */
const REQUIREMENT_HEADINGS = ['requirement_num', 'value', 'description'] as const;

/**
 * One requirement field, or `null` when the account has none at `index`.
 * The code sends the answers but no field label, so the label stays empty.
 */
export function toRequirementField(index: number, response: GatewayResponse): RequirementField | null {
  const seen = new Set<string>();
  const options = readRecords(response, REQUIREMENT_HEADINGS).flatMap((row) => {
    const value = row.value.trim();
    if (!value || seen.has(value) || row.requirement_num.trim() !== String(index)) return [];
    seen.add(value);
    return [{ value, label: row.description.trim() || value }];
  });
  return options.length > 0 ? { index, label: '', options } : null;
}

/** `JData` for {@link ACTION_CODES.VERIFY_ACCOUNT_REQUIREMENTS} — `P_IS_RES` "Y" from the booking. */
export function verifyRequirementsJData(billing: BillingMethodValue): GatewayJData {
  return {
    P_ACCOUNT_NUMBER: billing.accountNumber.trim(),
    P_VIP_NUMBER: billing.vipNumber.trim(),
    P_IS_RES: 'Y',
    ...requirementParams(billing, 'P_ACCOUNT_REQUIREMENT'),
  };
}

/** `P_ACCOUNT_REQUIREMENT1–4`, blank where the account asks for nothing. */
export function requirementParams(billing: BillingMethodValue, prefix: string): GatewayJData {
  return Object.fromEntries(
    REQUIREMENT_INDEXES.map((index) => [`${prefix}${index}`, billing.requirements[index]?.trim() ?? '']),
  );
}

/** `P_CARD_TYPE` / `P_CC_TYPE` for the number typed, in the old site's spelling. */
export function cardTypeCode(cardNumber: string): string {
  return CARD_TYPE_CODES[detectBrand(cardNumber)];
}

/**
 * `MM/YY` → `MM-YYYY`, the `P_EXPIRATION_DATE` the backend test client sends
 * (`11-2027`; the contract's sample is `12/2027`).
 * TODO(schema-unverified): assumed format is MM-YYYY; confirm against guide §10
 */
export function contractExpiry(expiry: string): string {
  const digits = digitsOnly(expiry);
  return digits.length === 4 ? `${digits.slice(0, 2)}-20${digits.slice(2)}` : '';
}

/** `JData` for {@link ACTION_CODES.START_CREDIT_CARD_APPROVAL}. */
export function startApprovalJData(loginId: string, billing: BillingMethodValue): GatewayJData {
  return {
    P_LOGIN_ID: loginId,
    P_CARD_TYPE: cardTypeCode(billing.card.number),
    P_CARD_HOLDER_NAME: billing.card.holder.trim(),
    P_CARD_NUMBER: digitsOnly(billing.card.number),
    P_EXPIRATION_DATE: contractExpiry(billing.card.expiry),
    P_VERIFY_CODE: digitsOnly(billing.card.cvv),
  };
}

/** `JData` for {@link ACTION_CODES.CHECK_CREDIT_CARD_APPROVAL}. */
export function checkApprovalJData(loginId: string, requestNumber: string): GatewayJData {
  return { P_LOGIN_ID: loginId, P_REQUEST_NUM: requestNumber };
}

/**
 * Where an authorisation stands. The old site polled every 10 s for up to
 * 90 s while the processor answered "CCcall" (guide 16).
 */
export type ApprovalState =
  | { status: 'approved'; approvalNumber: string }
  | { status: 'pending'; requestNumber: string }
  | { status: 'declined'; message: string };

export const APPROVAL_POLL_MS = 10_000;
export const APPROVAL_TIMEOUT_MS = 90_000;

/**
 * Reads `RES.I.CREDIT_CARD_APPROVAL`'s answer: `"0"` with the **request
 * number** in `o_message` (§10), which is then polled. Anything else declines.
 */
export function toApprovalRequest(response: GatewayResponse): ApprovalState {
  const result = readResult(response);
  if (result.code !== DB_SUCCESS_CODE || !result.message) {
    return { status: 'declined', message: refusalMessage(result, RESERVATION_MESSAGES.CARD_DECLINED) };
  }
  return { status: 'pending', requestNumber: result.message };
}

/**
 * Reads `RES.S.CREDIT_CARD_APPROVAL`'s answer: `"0"` with the **approval
 * number** in `o_message` (§10). A fresh request answered `"1"` / "Invalid
 * request number." while the processor was still on it, so any other answer
 * keeps the request pending until the caller's wait runs out.
 * TODO(schema-unverified): assumed a decline has no code of its own; confirm against guide §10
 */
export function toApprovalCheck(response: GatewayResponse, requestNumber: string): ApprovalState {
  const result = readResult(response);
  if (result.code === DB_SUCCESS_CODE && result.message) {
    return { status: 'approved', approvalNumber: result.message };
  }
  return { status: 'pending', requestNumber };
}

/**
 * What the authorisation covered, so a later step can tell whether the card
 * changed since — never the number itself, only its last four digits.
 */
export function cardFingerprint(billing: BillingMethodValue): string {
  const digits = digitsOnly(billing.card.number);
  return [billing.method, digits.length, digits.slice(-4), billing.card.expiry, billing.card.holder.trim()].join('|');
}
