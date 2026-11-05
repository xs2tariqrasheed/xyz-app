import { DB_INTERNAL_ERROR_CODE, DB_SUCCESS_CODE } from '@/constants/actionCodes';
import { GatewayError, type GatewayResponse, mapRowsByHeadings } from '@/services/gateway';
import { MONTHS_SHORT } from '@/utils/datetime';

/**
 * Readers for gateway rows, shared by the services. Every value is read by
 * the one heading its code sends (docs/XYZ_INTEGRATION_GUIDE.md §10): no
 * fallback names, no case folding.
 */

/**
 * The heading a record set sends, alone and with the value `X`, when it has
 * no rows for the inputs (e.g. `RES.S.LOAD_RESERVATION` for an unknown
 * number, `RES.S.ACCOUNT_REQUIREMENTS_LIST` for an account without one).
 */
const NO_DATA_HEADING = 'dummy';

/**
 * Rows of a record set, read by `headings` ({@link mapRowsByHeadings}: a
 * missing heading fails closed). The `dummy` answer means no rows.
 */
export function readRecords<Heading extends string>(
  response: GatewayResponse,
  headings: readonly Heading[],
): Record<Heading, string>[] {
  const sent = response.JMetaData?.Headings ?? [];
  if (sent.length === 1 && String(Array.isArray(sent[0]) ? sent[0][0] : sent[0]) === NO_DATA_HEADING) return [];
  return mapRowsByHeadings(response, headings);
}

/** Whole number, or `fallback` when the column is blank or not a number. */
export function toInt(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** The procedure's own verdict, row 0 of `o_code` / `o_message`. */
export type GatewayResult = { code: string; message: string };

/**
 * Reads `o_code` / `o_message` by their exact headings. A response without
 * them, or without a row, fails closed (docs/XYZ_INTEGRATION_GUIDE.md §4).
 */
export function readResult(response: GatewayResponse): GatewayResult {
  const row = mapRowsByHeadings(response, ['o_code', 'o_message'] as const)[0];
  if (!row) throw new GatewayError('parsing', 'The response has no result row.');
  return { code: row.o_code.trim(), message: row.o_message.trim() };
}

/**
 * What a refusal shows: the procedure's own message, or `fallbackMessage`
 * when it is empty or the code is "9" (a database error, whose message is
 * raw Oracle text).
 */
export function refusalMessage(result: GatewayResult, fallbackMessage: string): string {
  return result.code === DB_INTERNAL_ERROR_CODE ? fallbackMessage : result.message || fallbackMessage;
}

/**
 * Throws unless the verdict is `o_code` "0" ({@link readResult}); a refusal
 * throws `makeError` with {@link refusalMessage}.
 */
export function assertResultCode(
  response: GatewayResponse,
  makeError: (message: string) => Error,
  fallbackMessage: string,
): GatewayResult {
  const result = readResult(response);
  if (result.code !== DB_SUCCESS_CODE) throw makeError(refusalMessage(result, fallbackMessage));
  return result;
}

/**
 * Parses the gateway's `MM/DD/YYYY` date plus an optional `hh:mm AM|PM` or
 * 24-hour `HH:mm` time, in local time. `null` when the date is unreadable.
 */
export function parseGatewayDate(date: string, time = ''): Date | null {
  const day = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(date.trim());
  if (!day) return null;

  let hours = 0;
  let minutes = 0;
  const clock = /(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?/.exec(time.trim() || date.trim().slice(day[0].length));
  if (clock) {
    hours = Number(clock[1]) % 24;
    minutes = Number(clock[2]);
    const meridiem = clock[3]?.toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
  }

  const parsed = new Date(Number(day[3]), Number(day[1]) - 1, Number(day[2]), hours, minutes);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** "10-SEP-26" (DD-MON-YY, local day; guide §10) → Date, or `null` when unreadable. */
export function parseDayMonthYear(value: string): Date | null {
  const match = /^(\d{1,2})-([A-Z]{3})-(\d{2})$/i.exec(value);
  if (!match) return null;
  const month = MONTHS_SHORT.findIndex((name) => name.toUpperCase() === match[2].toUpperCase());
  if (month < 0) return null;
  const date = new Date(2000 + Number(match[3]), month, Number(match[1]));
  return Number.isNaN(date.getTime()) ? null : date;
}
