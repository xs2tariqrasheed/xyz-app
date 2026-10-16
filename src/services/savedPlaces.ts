import { EMPTY_PLACE, type AddressSuggestion, type StructuredPlace, toCountryCode, toSuggestion } from '@/services/places';
import { type GatewayRow, pick } from '@/services/gatewayRows';
import type { GatewayJData } from '@/services/gateway';

/**
 * The customer's own places, offered above the Google results in the address
 * fields and in the Express Checkout lists (reverse-engineer-guide/05, 06):
 *
 * - `PROF.S.USER_ADDRESSES` — saved ("favourite") addresses;
 * - `PROF.S.USER_PROFILE_ADDRESSES` — the profile's home / office address;
 * - `PROF.S.CORPORATE_ADDRESSES` — the company's own locations.
 *
 * All three map to {@link AddressSuggestion}s that already carry their booking
 * fields, so picking one needs no Google lookup.
 */

/**
 * Columns per field: today's `USER_ADDRESSES` names first, then the old
 * site's (`GetPickupAddresses`, guide 05) for the two codes whose outputs are
 * undocumented.
 */
const COLUMNS = {
  id: ['address_id', 'addressid', 'pickup_count', 'id'],
  country: ['country', 'country_name'],
  state: ['state', 'state_code', 'state_name'],
  city: ['city', 'city_name'],
  zip: ['zip_code', 'zip', 'zipcode'],
  streetNumber: ['building_num', 'buildingno', 'street_num', 'street_number'],
  streetName: ['street_name', 'streetname', 'street'],
  crossStreet: ['cross_street', 'crossstreet', 'cross_street1'],
  pickupPoint: ['pickup_point', 'pickuppoint'],
  directions: ['directions'],
  latitude: ['latitude', 'lat'],
  longitude: ['longitude', 'lon', 'lng'],
  label: ['short_address', 'shortaddress', 'address_name', 'location_name', 'name'],
} as const;

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

export function toStructuredPlace(row: GatewayRow): StructuredPlace {
  const streetName = pick(row, COLUMNS.streetName);
  const airport = AIRPORT_NAME.test(streetName);
  return {
    ...EMPTY_PLACE,
    kind: airport ? 'airport' : 'address',
    country: toCountryCode(pick(row, COLUMNS.country)),
    state: pick(row, COLUMNS.state),
    city: pick(row, COLUMNS.city),
    zip: pick(row, COLUMNS.zip),
    streetNumber: pick(row, COLUMNS.streetNumber),
    streetName,
    crossStreet: pick(row, COLUMNS.crossStreet),
    pickupPoint: pick(row, COLUMNS.pickupPoint),
    directions: pick(row, COLUMNS.directions),
    airportName: airport ? streetName : '',
    latitude: pick(row, COLUMNS.latitude),
    longitude: pick(row, COLUMNS.longitude),
  };
}

/**
 * Rows → suggestions. `source` keeps ids unique across the three lists; a row
 * with neither a street nor a city (the old site had many ",MANHATTAN,NY"
 * stubs, guide 19 of the PDF) is skipped as unusable.
 */
export function toSavedSuggestions(
  rows: readonly GatewayRow[],
  source: 'saved' | 'profile' | 'company',
): AddressSuggestion[] {
  return rows.flatMap((row, index) => {
    const place = toStructuredPlace(row);
    if (!place.streetName && !place.city) return [];
    const id = `${source}:${pick(row, COLUMNS.id) || index}`;
    const suggestion = toSuggestion(id, place);
    const label = pick(row, COLUMNS.label);
    return [label ? { ...suggestion, primary: label } : suggestion];
  });
}
