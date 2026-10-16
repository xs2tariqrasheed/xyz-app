import { DB_SUCCESS_CODE } from '@/constants/actionCodes';
import { GatewayError, type GatewayResponse, mapRows } from '@/services/gateway';

/**
 * Defensive readers for gateway rows, shared by the reservation services.
 *
 * Most reservation codes have no documented outputs, and today's gateway
 * returns stub columns. Each service therefore names, per field, every column
 * the value may arrive under (the stub's name first, then the names the old
 * site used), and these helpers take the first one present. A missing column
 * becomes '' rather than an error, so the same mapping keeps working once the
 * real procedures answer.
 */

export type GatewayRow = Record<string, string>;

/** Column lookups ignore case: the stub mixes `o_Latitude` with `o_code`. */
function lowerKeys(row: GatewayRow): GatewayRow {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.toLowerCase(), value]));
}

/** First non-blank value among `columns`, trimmed; '' when none has one. */
export function pick(row: GatewayRow | undefined, columns: readonly string[]): string {
  if (!row) return '';
  const lowered = lowerKeys(row);
  for (const column of columns) {
    const value = lowered[column.toLowerCase()];
    if (value !== undefined && value.trim().length > 0) return value.trim();
  }
  return '';
}

/** True when the row carries any of `columns`, even blank. */
export function hasColumn(row: GatewayRow | undefined, columns: readonly string[]): boolean {
  if (!row) return false;
  const lowered = lowerKeys(row);
  return columns.some((column) => column.toLowerCase() in lowered);
}

/** `Y`, `YES`, `TRUE`, `1` read as yes; anything else as no. */
export function isYes(value: string): boolean {
  return /^(y|yes|true|1)$/i.test(value.trim());
}

/** Whole number, or `fallback` when the column is blank or not a number. */
export function toInt(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Columns every procedure uses for its own verdict. */
const RESULT_CODE = 'o_code';
const RESULT_MESSAGE = 'o_message';

/** Gateway placeholders a stub record set carries in place of real columns. */
const RESULT_COLUMNS = new Set([RESULT_CODE, RESULT_MESSAGE]);

/**
 * Throws unless row 0 carries `o_code` "0". A missing code fails closed
 * (docs/XYZ_INTEGRATION_GUIDE.md §4); a refusal throws `makeError(o_message)`.
 */
export function assertResultCode(
  response: GatewayResponse,
  makeError: (message: string) => Error,
  fallbackMessage: string,
): GatewayRow {
  const row = mapRows(response)[0];
  if (!row || !hasColumn(row, [RESULT_CODE])) {
    throw new GatewayError('parsing', 'The response has no result code.');
  }
  if (pick(row, [RESULT_CODE]) !== DB_SUCCESS_CODE) {
    throw makeError(pick(row, [RESULT_MESSAGE]) || fallbackMessage);
  }
  return row;
}

/**
 * Rows of a record set. A set may lead with `o_code` / `o_message`; when it
 * does, a refusal throws, and rows that carry nothing but the verdict (or the
 * stub's `placeholder_col*` filler) are dropped rather than shown as data.
 */
export function recordSet(
  response: GatewayResponse,
  makeError: (message: string) => Error,
  fallbackMessage: string,
): GatewayRow[] {
  const rows = mapRows(response);
  const first = rows[0];
  if (first && hasColumn(first, [RESULT_CODE]) && pick(first, [RESULT_CODE]) !== DB_SUCCESS_CODE) {
    throw makeError(pick(first, [RESULT_MESSAGE]) || fallbackMessage);
  }
  return rows.filter((row) =>
    Object.keys(row).some(
      (key) => !RESULT_COLUMNS.has(key.toLowerCase()) && !/^placeholder_col/i.test(key),
    ),
  );
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
