import { FIELD_LIMITS } from '@/constants/fieldLimits';
import { ADDRESS_BOOK_MESSAGES, VALIDATION_MESSAGES as V } from '@/constants/messages';
import { formatUsPhone, MAX_INTL_DIGITS, toDigits, withExtension } from '@/utils/phone';
import {
  hasNoDoubleQuote,
  hasValidStreetChars,
  intlPhoneProblem,
  isValidBuildingNo,
  isValidPickupPoint,
  isValidStreetName,
  isValidUsPhone,
  isValidZip,
} from '@/utils/validation';

/**
 * A saved pickup location, as the address form collects it.
 *
 * Every field is a string — including the ones that hold digits — because the
 * form owns the raw text and formatting happens on the way out.
 */
export type AddressDraft = {
  country: string;
  state: string;
  city: string;
  zip: string;
  /** House or building number, e.g. "666". */
  building: string;
  street: string;
  /** Nearest intersection, for drivers working from landmarks. */
  crossStreet: string;
  /** Where exactly to wait, e.g. "North entrance". */
  pickupPoint: string;
  phoneUs: string;
  phoneUsExt: string;
  /** Dial code without the leading plus, e.g. "44". */
  phoneIntlCode: string;
  phoneIntl: string;
  phoneIntlExt: string;
  directions: string;
};

/**
 * A location from `PROF.S.USER_ADDRESSES`. `id` is what the update and delete
 * codes take as `P_PICKUP_COUNT` (src/services/addressBook.ts).
 */
export type SavedAddress = AddressDraft & { id: string };

export type AddressErrors = Partial<Record<keyof AddressDraft, string>>;

export const DEFAULT_COUNTRY = 'United States';

/** A blank form, pre-filled with the country most customers will pick. */
export function emptyDraft(): AddressDraft {
  return {
    country: DEFAULT_COUNTRY,
    state: '',
    city: '',
    zip: '',
    building: '',
    street: '',
    crossStreet: '',
    pickupPoint: '',
    phoneUs: '',
    phoneUsExt: '',
    phoneIntlCode: '',
    phoneIntl: '',
    phoneIntlExt: '',
    directions: '',
  };
}

/** Loads a saved location back into the form. */
export function toDraft({ id: _id, ...draft }: SavedAddress): AddressDraft {
  return draft;
}

/** `T_VIP_PICKUP.STATE` holds 2 characters (`ORA-12899` for longer; guide §10). */
const STATE_CODE = /^[A-Za-z]{2}$/;

/**
 * The legacy address book's rules (reverse-engineer-implemented/guide/11 §3, 26): country,
 * state, city, building # and street are required, and at least one callback
 * number — US, or a complete international one.
 */
export function validateDraft(draft: AddressDraft): AddressErrors {
  const errors: AddressErrors = {};
  const M = ADDRESS_BOOK_MESSAGES;

  if (!draft.country.trim()) errors.country = M.COUNTRY_REQUIRED;
  const state = draft.state.trim();
  if (!state) errors.state = M.STATE_REQUIRED;
  else if (!STATE_CODE.test(state)) errors.state = M.STATE_INVALID;
  if (!draft.city.trim()) errors.city = M.CITY_REQUIRED;

  const building = draft.building.trim();
  if (!building) errors.building = M.BUILDING_REQUIRED;
  else if (!isValidBuildingNo(building)) errors.building = V.BUILDING_INVALID;

  const street = draft.street.trim();
  if (!street) errors.street = M.STREET_REQUIRED;
  else if (!isValidStreetName(street)) errors.street = V.STREET_INVALID;

  // A cross street is checked like the mailing address's: characters only.
  const crossStreet = draft.crossStreet.trim();
  if (crossStreet && (!hasValidStreetChars(crossStreet) || crossStreet.length > FIELD_LIMITS.STREET)) {
    errors.crossStreet = V.STREET_CHARACTERS;
  }

  const pickupPoint = draft.pickupPoint.trim();
  if (pickupPoint && !isValidPickupPoint(pickupPoint)) errors.pickupPoint = V.PICKUP_POINT_INVALID;

  const zip = draft.zip.trim();
  if (zip && !isValidZip(zip)) errors.zip = V.ZIP_INVALID;

  const phoneUs = draft.phoneUs.trim();
  if (phoneUs && !isValidUsPhone(phoneUs)) errors.phoneUs = V.US_PHONE_INVALID;

  const intlCode = draft.phoneIntlCode.trim();
  const intlDigits = toDigits(draft.phoneIntl, MAX_INTL_DIGITS);
  switch (intlPhoneProblem(intlCode, intlDigits)) {
    case 'codeRequired':
      errors.phoneIntlCode = V.INTL_CODE_REQUIRED;
      break;
    case 'numberRequired':
      errors.phoneIntl = V.INTL_NUMBER_REQUIRED;
      break;
    case 'incomplete':
      errors.phoneIntl = V.INTL_NUMBER_INCOMPLETE;
      break;
  }

  if (!phoneUs && !intlDigits && !intlCode) errors.phoneUs = M.PHONE_REQUIRED;

  const directions = draft.directions.trim();
  if (directions.length > FIELD_LIMITS.DIRECTIONS || !hasNoDoubleQuote(directions)) {
    errors.directions = V.DIRECTIONS_INVALID;
  }

  return errors;
}

/** "666 5 Ave" */
export function formatStreet(address: AddressDraft): string {
  return [address.building.trim(), address.street.trim()].filter(Boolean).join(' ');
}

/** "Manhattan, NY 10019" */
export function formatLocality(address: AddressDraft): string {
  const cityState = [address.city.trim(), address.state.trim()].filter(Boolean).join(', ');
  return [cityState, address.zip.trim()].filter(Boolean).join(' ');
}

/** One line, for the delete confirmation and accessibility labels. */
export function formatAddressLine(address: AddressDraft): string {
  return [formatStreet(address), formatLocality(address)].filter(Boolean).join(', ');
}

/** `null` when the customer left the number blank, so callers can skip the row. */
export function formatUsCallback(address: AddressDraft): string | null {
  const number = formatUsPhone(address.phoneUs);
  return number ? withExtension(number, address.phoneUsExt) : null;
}

export function formatIntlCallback(address: AddressDraft): string | null {
  // International numbers are kept as the customer typed them — grouping
  // varies by country — so only the dial code is normalised.
  const rest = address.phoneIntl.trim();
  if (!rest) return null;
  const dial = toDigits(address.phoneIntlCode, 4);
  return withExtension(dial ? `+${dial} ${rest}` : rest, address.phoneIntlExt);
}
