import { EMPTY_PLACE, type AddressSuggestion, type StructuredPlace, toCountryCode, toSuggestion } from '@/services/places';
import { GatewayError, type GatewayJData, type GatewayResponse, mapRowsByPosition } from '@/services/gateway';

/**
 * The customer's own places, offered above the Google results in the address
 * fields and in the Express Checkout lists (reverse-engineer-implemented/guide/05, 06):
 *
 * - `PROF.S.USER_ADDRESSES` — saved ("favourite") addresses;
 * - `PROF.S.USER_PROFILE_ADDRESSES` — the profile's home / office address;
 * - `PROF.S.CORPORATE_ADDRESSES` — the company's own locations.
 *
 * All three map to {@link AddressSuggestion}s that already carry their booking
 * fields, so picking one needs no Google lookup.
 */

/**
 * The 17 columns every address record set really carries, in order
 * (docs/XYZ_INTEGRATION_GUIDE.md §10). `USER_PROFILE_ADDRESSES` and
 * `CORPORATE_ADDRESSES` send these as their headings; `USER_ADDRESSES` sends
 * the same row under headings that do not match it, so it is read by position
 * with this list.
 */
export const ADDRESS_RECORD_COLUMNS = [
  'oCountry',
  'oState',
  'oCity',
  'oStreetNum',
  'oStreetName',
  'oCrossStreet',
  'oPickupPoint',
  'oZip',
  'oDirections',
  'oPhoneNum',
  'oExt',
  'oPhoneNumUS',
  'oExtUS',
  'oePickupCount',
  'oeRowID',
  'oeUsageFrequency',
  'oeLastServiceDate',
] as const;

/** One address row, each field under its verified column name. */
export type AddressRecord = Record<(typeof ADDRESS_RECORD_COLUMNS)[number], string>;

/**
 * Rows of any of the three address codes as {@link AddressRecord}s. Every row
 * must carry exactly the 17 verified columns; a row of any other length means
 * the layout changed, so the response fails closed rather than being read
 * under the wrong names.
 */
export function toAddressRecords(response: GatewayResponse): AddressRecord[] {
  const rows = response.JData ?? [];
  if (rows.some((row) => !Array.isArray(row) || row.length !== ADDRESS_RECORD_COLUMNS.length)) {
    throw new GatewayError('parsing', 'Address rows do not match the 17-column layout.');
  }
  return mapRowsByPosition(response, ADDRESS_RECORD_COLUMNS);
}

/** An airport kept in the address book reads as an airport stop. */
const AIRPORT_NAME = /\bairport\b/i;

/** `JData` for {@link ACTION_CODES.USER_ADDRESSES} and `USER_PROFILE_ADDRESSES`. */
export function userAddressesJData(loginId: string): GatewayJData {
  return { P_LOGIN_ID: loginId };
}

/** `JData` for {@link ACTION_CODES.CORPORATE_ADDRESSES}. */
export function corporateAddressesJData(accountNumber: string): GatewayJData {
  return { P_ACCOUNT_NUM: accountNumber.trim() };
}

/**
 * The address record as a booking stop. The record has no coordinates, so
 * they stay empty and the stop is placed from its address.
 */
export function toStructuredPlace(record: AddressRecord): StructuredPlace {
  const streetName = record.oStreetName.trim();
  const airport = AIRPORT_NAME.test(streetName);
  return {
    ...EMPTY_PLACE,
    kind: airport ? 'airport' : 'address',
    country: toCountryCode(record.oCountry.trim()),
    state: record.oState.trim(),
    city: record.oCity.trim(),
    zip: record.oZip.trim(),
    streetNumber: record.oStreetNum.trim(),
    streetName,
    crossStreet: record.oCrossStreet.trim(),
    pickupPoint: record.oPickupPoint.trim(),
    directions: record.oDirections.trim(),
    airportName: airport ? streetName : '',
  };
}

/**
 * Records → suggestions, keyed by `oePickupCount`; `source` keeps ids unique
 * across the three lists. A record with neither a street nor a city (the old
 * site had many ",MANHATTAN,NY" stubs, guide 19 of the PDF) is skipped as
 * unusable.
 */
export function toSavedSuggestions(
  records: readonly AddressRecord[],
  source: 'saved' | 'profile' | 'company',
): AddressSuggestion[] {
  return records.flatMap((record) => {
    const place = toStructuredPlace(record);
    if (!place.streetName && !place.city) return [];
    return [toSuggestion(`${source}:${record.oePickupCount.trim()}`, place)];
  });
}
