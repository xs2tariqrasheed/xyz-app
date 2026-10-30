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

/** The `PROF.S.USER_ADDRESSES` headings the app reads (guide §10). */
export const USER_ADDRESS_HEADINGS = [
  'address_id',
  'country',
  'state',
  'city',
  'zip_code',
  'building_num',
  'street_name',
  'cross_street',
  'pickup_point',
  'phone_number_us',
  'phone_ext_us',
  'dial_code_intl',
  'phone_number_intl',
  'phone_ext_intl',
  'directions',
] as const;

export type UserAddressRow = Record<(typeof USER_ADDRESS_HEADINGS)[number], string>;

/** The `PROF.S.USER_PROFILE_ADDRESSES` / `CORPORATE_ADDRESSES` headings the app reads (guide §10). */
const ADDRESS_RECORD_HEADINGS = [
  'oCountry',
  'oState',
  'oCity',
  'oStreetNum',
  'oStreetName',
  'oCrossStreet',
  'oPickupPoint',
  'oZip',
  'oDirections',
] as const;

type AddressRecordRow = Record<(typeof ADDRESS_RECORD_HEADINGS)[number], string>;

/** `PROF.S.USER_ADDRESSES` rows, by heading. */
export function toUserAddressRows(response: GatewayResponse): UserAddressRow[] {
  return mapRowsByHeadings(response, USER_ADDRESS_HEADINGS);
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

/**
 * Saved addresses as suggestions. Rows with neither a street nor a city are
 * skipped as unusable; ids use the row position, because `address_id` is not
 * unique in today's responses (guide §10).
 */
export function userAddressSuggestions(rows: readonly UserAddressRow[]): AddressSuggestion[] {
  return toSuggestions(
    rows.map((row) =>
      stop({
        country: toCountryCode(row.country.trim()),
        state: row.state.trim(),
        city: row.city.trim(),
        zip: row.zip_code.trim(),
        streetNumber: row.building_num.trim(),
        streetName: row.street_name.trim(),
        crossStreet: row.cross_street.trim(),
        pickupPoint: row.pickup_point.trim(),
        directions: row.directions.trim(),
      }),
    ),
    'saved',
  );
}

/** The profile's (`USER_PROFILE_ADDRESSES`) or the company's (`CORPORATE_ADDRESSES`) addresses as suggestions. */
export function addressRecordSuggestions(response: GatewayResponse, source: 'profile' | 'company'): AddressSuggestion[] {
  const rows: AddressRecordRow[] = mapRowsByHeadings(response, ADDRESS_RECORD_HEADINGS);
  return toSuggestions(
    rows.map((row) =>
      stop({
        country: toCountryCode(row.oCountry.trim()),
        state: row.oState.trim(),
        city: row.oCity.trim(),
        zip: row.oZip.trim(),
        streetNumber: row.oStreetNum.trim(),
        streetName: row.oStreetName.trim(),
        crossStreet: row.oCrossStreet.trim(),
        pickupPoint: row.oPickupPoint.trim(),
        directions: row.oDirections.trim(),
      }),
    ),
    source,
  );
}

function toSuggestions(places: StructuredPlace[], source: 'saved' | 'profile' | 'company'): AddressSuggestion[] {
  return places.flatMap((place, index) =>
    place.streetName || place.city ? [toSuggestion(`${source}:${index}`, place)] : [],
  );
}
