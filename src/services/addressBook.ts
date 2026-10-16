import { DEFAULT_COUNTRY, type AddressDraft, type SavedAddress } from '@/components/addresses/savedAddress';
import { ADDRESS_BOOK_MESSAGES } from '@/constants/messages';
import type { GatewayJData, GatewayResponse } from '@/services/gateway';
import { assertResultCode, type GatewayRow, pick } from '@/services/gatewayRows';
import { toCountryCode } from '@/services/places';
import { MAX_INTL_DIGITS, toDigits } from '@/utils/phone';

/**
 * My Addresses (reverse-engineer-guide/11) over the gateway:
 *
 * - `PROF.S.USER_ADDRESSES` lists the saved locations — the same request
 *   `SavedPlacesContext` already makes for Home and the booking form, so the
 *   address book and the pickers can never disagree;
 * - `PROF.I` / `PROF.U` / `PROF.D.USER_ADDRESS` add, change and delete one.
 */

/** A write the gateway refused; the message is its `o_message`. */
export class AddressBookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AddressBookError';
  }
}

/**
 * Columns per field: today's `USER_ADDRESSES` names first, then the old site's
 * (`GetAddressInfo`, guide 05 §3).
 */
const COLUMNS = {
  id: ['address_id', 'addressid', 'pickup_count', 'id'],
  country: ['country', 'country_name'],
  state: ['state', 'state_code', 'state_name'],
  city: ['city', 'city_name'],
  zip: ['zip_code', 'zip', 'zipcode'],
  building: ['building_num', 'buildingno', 'street_num', 'street_number'],
  street: ['street_name', 'streetname', 'street'],
  crossStreet: ['cross_street', 'crossstreet', 'cross_street1'],
  pickupPoint: ['pickup_point', 'pickuppoint'],
  phoneUs: ['phone_number_us', 'phone_num_us', 'phoneus'],
  phoneUsExt: ['phone_ext_us', 'ext_us', 'extus'],
  phoneIntlCode: ['dial_code_intl', 'phoneintareacode'],
  phoneIntl: ['phone_number_intl', 'phone_num', 'phoneint'],
  phoneIntlExt: ['phone_ext_intl', 'ext', 'extint'],
  // The old site had one Directions field; today's rows add driver notes.
  directions: ['directions', 'driver_notes'],
} as const;

/** The gateway sends the country as a code (`USA`, `US`, legacy `01`); the form shows a name. */
function toCountryName(value: string): string {
  if (!value) return '';
  return toCountryCode(value) === 'US' || value === '01' ? DEFAULT_COUNTRY : value;
}

/**
 * Rows → saved locations. A row's id is the `address_id` the update and delete
 * codes take as `P_PICKUP_COUNT`. The old site identified a location by its
 * position in this list instead, so a row without an id falls back to that
 * (1-based) position. Rows with no street and no city are skipped, as the
 * booking pickers do.
 */
export function toSavedAddresses(rows: readonly GatewayRow[]): SavedAddress[] {
  return rows.flatMap((row, index) => {
    const street = pick(row, COLUMNS.street);
    const city = pick(row, COLUMNS.city);
    if (!street && !city) return [];

    return [
      {
        id: pick(row, COLUMNS.id) || String(index + 1),
        country: toCountryName(pick(row, COLUMNS.country)),
        state: pick(row, COLUMNS.state),
        city,
        zip: pick(row, COLUMNS.zip),
        building: pick(row, COLUMNS.building),
        street,
        crossStreet: pick(row, COLUMNS.crossStreet),
        pickupPoint: pick(row, COLUMNS.pickupPoint),
        phoneUs: toDigits(pick(row, COLUMNS.phoneUs), 10),
        phoneUsExt: pick(row, COLUMNS.phoneUsExt),
        phoneIntlCode: toDigits(pick(row, COLUMNS.phoneIntlCode), 4),
        phoneIntl: pick(row, COLUMNS.phoneIntl),
        phoneIntlExt: pick(row, COLUMNS.phoneIntlExt),
        directions: pick(row, COLUMNS.directions),
      },
    ];
  });
}

/**
 * The location fields shared by the add and update codes, spelled as the
 * contract does. The contract carries no dial-code parameter, so the
 * international number travels as dial code + number in `P_PHONE_NUM` — the
 * same convention `PROF.U.PROFILE` uses for the callback phone.
 */
function locationJData(draft: AddressDraft): GatewayJData {
  const intlNumber = toDigits(draft.phoneIntl, MAX_INTL_DIGITS);
  const phoneUs = draft.phoneUs.trim();
  return {
    P_COUNTRY: toCountryCode(draft.country),
    P_STATE: draft.state.trim(),
    P_CITY: draft.city.trim(),
    P_STREET_NUM: draft.building.trim(),
    P_STREET_NAME: draft.street.trim(),
    P_CROSS_STREET: draft.crossStreet.trim(),
    P_PICKUP_POINT: draft.pickupPoint.trim(),
    P_ZIP: draft.zip.trim(),
    P_DIRECTIONS: draft.directions.trim(),
    P_PHONE_NUM: intlNumber ? `${draft.phoneIntlCode.trim()}${intlNumber}` : '',
    P_EXT: intlNumber ? draft.phoneIntlExt.trim() : '',
    P_PHONE_NUM_US: phoneUs,
    P_EXT_US: phoneUs ? draft.phoneUsExt.trim() : '',
  };
}

/** `JData` for {@link ACTION_CODES.ADD_USER_ADDRESS}. */
export function addAddressJData(loginId: string, draft: AddressDraft): GatewayJData {
  return { P_LOGIN_ID: loginId, ...locationJData(draft) };
}

/** `JData` for {@link ACTION_CODES.UPDATE_USER_ADDRESS}. */
export function updateAddressJData(loginId: string, id: string, draft: AddressDraft): GatewayJData {
  return { P_LOGIN_ID: loginId, P_PICKUP_COUNT: id, ...locationJData(draft) };
}

/** `JData` for {@link ACTION_CODES.DELETE_USER_ADDRESS}. */
export function deleteAddressJData(loginId: string, id: string): GatewayJData {
  return { P_LOGIN_ID: loginId, P_PICKUP_COUNT: id };
}

/** Throws unless the write's row 0 carries `o_code` "0"; a missing code fails closed. */
export function assertAddressSaved(response: GatewayResponse): void {
  assertResultCode(response, (message) => new AddressBookError(message), ADDRESS_BOOK_MESSAGES.SAVE_REJECTED);
}

export function assertAddressDeleted(response: GatewayResponse): void {
  assertResultCode(response, (message) => new AddressBookError(message), ADDRESS_BOOK_MESSAGES.DELETE_REJECTED);
}
