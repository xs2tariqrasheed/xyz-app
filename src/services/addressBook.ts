import { DEFAULT_COUNTRY, type AddressDraft, type SavedAddress } from '@/components/addresses/savedAddress';
import { ADDRESS_BOOK_MESSAGES } from '@/constants/messages';
import type { GatewayJData, GatewayResponse } from '@/services/gateway';
import { assertResultCode } from '@/services/gatewayRows';
import { toCountryCode } from '@/services/places';
import type { UserAddressRow } from '@/services/savedPlaces';
import { MAX_INTL_DIGITS, toDigits } from '@/utils/phone';

/**
 * My Addresses (reverse-engineer-implemented/guide/11) over the gateway:
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

/** The gateway sends the country as a code (`USA`, `US`, legacy `01`); the form shows a name. */
function toCountryName(value: string): string {
  if (!value) return '';
  return toCountryCode(value) === 'US' || value === '01' ? DEFAULT_COUNTRY : value;
}

/**
 * `PROF.S.USER_ADDRESSES` rows → saved locations, each field read by its
 * heading. A location's id is its `address_id`, which the update and delete
 * codes take back as `P_PICKUP_COUNT`. Rows with no street and no city are
 * skipped, as the booking pickers do.
 */
export function toSavedAddresses(rows: readonly UserAddressRow[]): SavedAddress[] {
  return rows.flatMap((row) => {
    const street = row.street_name.trim();
    const city = row.city.trim();
    if (!street && !city) return [];

    return [
      {
        id: row.address_id.trim(),
        country: toCountryName(row.country.trim()),
        state: row.state.trim(),
        city,
        zip: row.zip_code.trim(),
        building: row.building_num.trim(),
        street,
        crossStreet: row.cross_street.trim(),
        pickupPoint: row.pickup_point.trim(),
        phoneUs: toDigits(row.phone_number_us, 10),
        phoneUsExt: row.phone_ext_us.trim(),
        phoneIntlCode: toDigits(row.dial_code_intl, 4),
        phoneIntl: row.phone_number_intl.trim(),
        phoneIntlExt: row.phone_ext_intl.trim(),
        directions: row.directions.trim(),
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
