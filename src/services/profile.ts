/**
 * The signed-in customer's profile, mapped from a
 * `PROF.S.LOAD_PROFILE` row. Field names are renamed here so screens never
 * read raw gateway columns.
 */

export type CustomerProfile = {
  firstName: string;
  lastName: string;
  /** The login before this one, when the server knows it. */
  lastLoginAt: Date | null;
};

export function toCustomerProfile(rows: Record<string, string>[] | undefined): CustomerProfile | null {
  const row = rows?.[0];
  if (!row) return null;

  return {
    firstName: row.first_name?.trim() ?? '',
    lastName: row.last_name?.trim() ?? '',
    lastLoginAt: parseGatewayDateTime(row.last_login),
  };
}

/** "10/11/2026 09:20 AM" (MM/DD/YYYY hh:mm AM|PM, local time) → Date. */
const DATE_TIME = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

function parseGatewayDateTime(value: string | undefined): Date | null {
  const match = value?.trim().match(DATE_TIME);
  if (!match) return null;

  const [, month, day, year, hour, minute, meridiem] = match;
  const hours = (Number(hour) % 12) + (meridiem.toUpperCase() === 'PM' ? 12 : 0);
  const date = new Date(Number(year), Number(month) - 1, Number(day), hours, Number(minute));
  return Number.isNaN(date.getTime()) ? null : date;
}
