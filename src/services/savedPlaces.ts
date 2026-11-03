import { EMPTY_PLACE, type AddressSuggestion, type StructuredPlace, toCountryCode, toSuggestion } from '@/services/places';
import { type GatewayJData, type GatewayResponse, mapRowsByHeadings } from '@/services/gateway';

/**
 * The customer's own places, offered above the Google results in the address
 * fields and in the Express Checkout lists (reverse-engineer-implemented/guide/05, 06):
 *
 * - `PROF.S.USER_ADDRESSES` — saved ("favourite") addresses;
 * - `PROF.S.USER_PROFILE_ADDRESSES` — the profile's frequent pickup places;
 * - `PROF.S.CORPORATE_ADDRESSES` — the company's own locations.
 *
 * All three map to {@link AddressSuggestion}s that already carry their booking
 * fields, so picking one needs no Google lookup.
 */

/**
 * The headings the app reads from all three address codes, which send the
 * same 17 (guide §10). `oerowid`, `oeusagefrequency` and `oelastservicedate`
 * are not read.
 */
const ADDRESS_HEADINGS = [
  'ocountry',
  'ostate',
  'ocity',
  'ostreetnum',
  'ostreetname',
  'ocrossstreet',
  'opickuppoint',
  'ozip',
  'odirections',
  'ophonenum',
  'oext',
  'ophonenumus',
  'oextus',
  'oepickupcount',
] as const;

export type UserAddressRow = Record<(typeof ADDRESS_HEADINGS)[number], string>;

/** `PROF.S.USER_ADDRESSES` rows, by heading. */
export function toUserAddressRows(response: GatewayResponse): UserAddressRow[] {
  return mapRowsByHeadings(response, ADDRESS_HEADINGS);
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

type AddressFields = Pick<
  StructuredPlace,
  'country' | 'state' | 'city' | 'zip' | 'streetNumber' | 'streetName' | 'crossStreet' | 'pickupPoint' | 'directions'
>;

/**
 * An address row as a booking stop; an airport kept in the address book reads
 * as an airport stop. No address heading carries coordinates, so they stay
 * empty and the stop is placed from its address.
 */
function stop(fields: AddressFields): StructuredPlace {
  const airport = AIRPORT_NAME.test(fields.streetName);
  return {
    ...EMPTY_PLACE,
    ...fields,
    kind: airport ? 'airport' : 'address',
    airportName: airport ? fields.streetName : '',
  };
}

/** An address row's booking fields, by heading. */
function addressFields(row: UserAddressRow): AddressFields {
  return {
    country: toCountryCode(row.ocountry.trim()),
    state: row.ostate.trim(),
    city: row.ocity.trim(),
    zip: row.ozip.trim(),
    streetNumber: row.ostreetnum.trim(),
    streetName: row.ostreetname.trim(),
    crossStreet: row.ocrossstreet.trim(),
    pickupPoint: row.opickuppoint.trim(),
    directions: row.odirections.trim(),
  };
}

/** Saved addresses as suggestions. Rows with neither a street nor a city are skipped as unusable. */
export function userAddressSuggestions(rows: readonly UserAddressRow[]): AddressSuggestion[] {
  return toSuggestions(rows.map((row) => stop(addressFields(row))), 'saved');
}

/** The profile's (`USER_PROFILE_ADDRESSES`) or the company's (`CORPORATE_ADDRESSES`) addresses as suggestions. */
export function addressRecordSuggestions(response: GatewayResponse, source: 'profile' | 'company'): AddressSuggestion[] {
  const rows = mapRowsByHeadings(response, ADDRESS_HEADINGS);
  return toSuggestions(rows.map((row) => stop(addressFields(row))), source);
}

function toSuggestions(places: StructuredPlace[], source: 'saved' | 'profile' | 'company'): AddressSuggestion[] {
  return places.flatMap((place, index) =>
    place.streetName || place.city ? [toSuggestion(`${source}:${index}`, place)] : [],
  );
}
