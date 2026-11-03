import type { BillingMethodId, BillingMethodValue } from '@/components/reservation/BillingMethodSection';
import { DB_SUCCESS_CODE } from '@/constants/actionCodes';
import { RESERVATION_MESSAGES } from '@/constants/messages';
import { GatewayError, type GatewayJData, type GatewayResponse, mapRows, mapRowsByHeadings } from '@/services/gateway';
import { assertResultCode, type GatewayRow, hasColumn, pick, recordSet } from '@/services/gatewayRows';
import { CARD_TYPE_CODES } from '@/services/registration';
import { detectBrand, digitsOnly } from '@/utils/payment';

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
 * `acctype` from the old site (guide 16): 1 account (no account + card),
 * 2 account + card (no plain account), 3 card only.
 */
const METHODS_BY_ACCOUNT_TYPE: Record<string, readonly BillingMethodId[]> = {
  '1': ['corporate', 'card'],
  '2': ['corporate-card', 'card'],
  '3': ['card'],
};

const ACCOUNT_TYPE_COLUMNS = ['acctype', 'o_acctype', 'account_type', 'o_account_type', 'billing_method', 'o_billing_method'];

/** `JData` for {@link ACTION_CODES.BILLING_METHOD} and `IS_CREDIT_CARD_SPECIFIC_ACCOUNT`. */
export function accountJData(accountNumber: string): GatewayJData {
  return { P_ACCOUNT_NUM: accountNumber.trim() };
}

/**
 * Methods the account allows. A refusal throws; an answer without an account
 * type (today's gateway) allows all three rather than inventing a limit.
 */
export function toAllowedMethods(response: GatewayResponse): readonly BillingMethodId[] {
  const row = assertResultCode(response, (message) => new BillingError(message), RESERVATION_MESSAGES.ACCOUNT_REJECTED);
  return METHODS_BY_ACCOUNT_TYPE[pick(row, ACCOUNT_TYPE_COLUMNS)] ?? ALL_BILLING_METHODS;
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
  options: readonly string[];
};

export const REQUIREMENT_INDEXES = [1, 2, 3, 4] as const;

/** `JData` for {@link ACTION_CODES.ACCOUNT_REQUIREMENTS_LIST}. */
export function requirementListJData(accountNumber: string, index: number): GatewayJData {
  return { P_ACCOUNT_NUM: accountNumber.trim(), P_REQUIREMENT_NUM: String(index) };
}

const REQUIREMENT_LABEL_COLUMNS = ['requirement_label', 'o_requirement_label', 'label', 'requirement_name', 'field_name', 'description', 'o_label'];
const REQUIREMENT_VALUE_COLUMNS = ['requirement_value', 'o_requirement_value', 'value', 'option_value', 'column_value'];

/**
 * One requirement field, or `null` when the account has none at `index`.
 * Rows carrying only the verdict or stub placeholders are not a field.
 */
export function toRequirementField(index: number, response: GatewayResponse): RequirementField | null {
  const rows = recordSet(response, (message) => new BillingError(message), RESERVATION_MESSAGES.REQUIREMENTS_REJECTED);
  const label = rows.map((row) => pick(row, REQUIREMENT_LABEL_COLUMNS)).find(Boolean) ?? '';
  const options = [...new Set(rows.map((row) => pick(row, REQUIREMENT_VALUE_COLUMNS)).filter(Boolean))];
  if (!label && options.length === 0) return null;
  return { index, label, options };
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

/** `MM/YY` → `MM/YYYY`, the contract's `P_EXPIRATION_DATE`. */
export function contractExpiry(expiry: string): string {
  const digits = digitsOnly(expiry);
  return digits.length === 4 ? `${digits.slice(0, 2)}/20${digits.slice(2)}` : '';
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

const REQUEST_COLUMNS = ['o_request_num', 'request_num', 'o_req_num', 'req_num', 'p_request_num'];
const APPROVAL_COLUMNS = ['o_approval_num', 'approval_num', 'o_approval_number', 'approval_number'];
const STATUS_COLUMNS = ['o_status', 'status', 'approval_status'];
/** The old processor's "still working on it" answer. */
const PENDING = /^(cccall|pending|processing)$/i;

/**
 * Reads a start or a check answer. A request number with no approval yet
 * means pending; a refusal is a decline with the server's message; a missing
 * `o_code` fails closed.
 */
export function toApprovalState(response: GatewayResponse, requestNumber = ''): ApprovalState {
  const row: GatewayRow | undefined = mapRows(response)[0];
  if (!row || !hasColumn(row, ['o_code'])) {
    throw new GatewayError('parsing', 'The card authorisation response has no result code.');
  }

  const message = pick(row, ['o_message']);
  const status = pick(row, STATUS_COLUMNS);
  if (PENDING.test(message) || PENDING.test(status)) {
    return { status: 'pending', requestNumber: pick(row, REQUEST_COLUMNS) || requestNumber };
  }
  if (pick(row, ['o_code']) !== DB_SUCCESS_CODE) {
    return { status: 'declined', message: message || RESERVATION_MESSAGES.CARD_DECLINED };
  }

  const approvalNumber = pick(row, APPROVAL_COLUMNS);
  const newRequest = pick(row, REQUEST_COLUMNS);
  // A fresh request with no approval yet is still with the processor.
  if (!approvalNumber && newRequest && newRequest !== requestNumber) {
    return { status: 'pending', requestNumber: newRequest };
  }
  return { status: 'approved', approvalNumber };
}

/**
 * What the authorisation covered, so a later step can tell whether the card
 * changed since — never the number itself, only its last four digits.
 */
export function cardFingerprint(billing: BillingMethodValue): string {
  const digits = digitsOnly(billing.card.number);
  return [billing.method, digits.length, digits.slice(-4), billing.card.expiry, billing.card.holder.trim()].join('|');
}
