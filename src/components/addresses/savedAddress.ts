import { ADDRESS_BOOK_MESSAGES } from '@/constants/messages';
import { formatUsPhone, isCompleteUsPhone, MAX_INTL_DIGITS, toDigits, withExtension } from '@/utils/phone';

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

/** Street and cross street: letters, digits, space and `. , - ( ) / &` (guide 26 `isValidStreets`). */
const STREET_CHARS = /^[A-Za-z0-9 .,\-()/&]+$/;
/** Pickup point: letters, digits, space and `. , ~ & / - ( ) \ #` (guide 26). */
const PICKUP_POINT_CHARS = /^[A-Za-z0-9 .,~&/\-()\\#]+$/;

const STREET_MIN = 4;
const STREET_MAX = 30;
const PICKUP_POINT_MAX = 20;
const DIRECTIONS_MAX = 500;
const INTL_NUMBER_MIN = 4;

function isValidStreet(value: string): boolean {
  return value.length >= STREET_MIN && value.length <= STREET_MAX && STREET_CHARS.test(value);
}

/**
 * The legacy address book's rules (reverse-engineer-implemented/guide/11 §3, 26): country,
 * state, city, building # and street are required, and at least one callback
 * number — US, or a complete international one.
 */
export function validateDraft(draft: AddressDraft): AddressErrors {
  const errors: AddressErrors = {};
  const M = ADDRESS_BOOK_MESSAGES;

  if (!draft.country.trim()) errors.country = M.COUNTRY_REQUIRED;
  if (!draft.state.trim()) errors.state = M.STATE_REQUIRED;
  if (!draft.city.trim()) errors.city = M.CITY_REQUIRED;

  const building = draft.building.trim();
  if (!building) errors.building = M.BUILDING_REQUIRED;
  else if (!/^\d{1,6}$/.test(building)) errors.building = M.BUILDING_INVALID;

  const street = draft.street.trim();
  if (!street) errors.street = M.STREET_REQUIRED;
  else if (!isValidStreet(street)) errors.street = M.STREET_INVALID;

  const crossStreet = draft.crossStreet.trim();
  if (crossStreet && !isValidStreet(crossStreet)) errors.crossStreet = M.CROSS_STREET_INVALID;

  const pickupPoint = draft.pickupPoint.trim();
  if (pickupPoint && (pickupPoint.length > PICKUP_POINT_MAX || !PICKUP_POINT_CHARS.test(pickupPoint))) {
    errors.pickupPoint = M.PICKUP_POINT_INVALID;
  }

  const zip = draft.zip.trim();
  if (zip && !/^\d{5}$/.test(zip)) errors.zip = M.ZIP_INVALID;

  const phoneUs = draft.phoneUs.trim();
  if (phoneUs && !(isCompleteUsPhone(phoneUs) && /^[2-9]/.test(phoneUs))) {
    errors.phoneUs = M.US_PHONE_INVALID;
  }

  // The international number is a pair: a code without a number, or the
  // reverse, is incomplete.
  const intlCode = draft.phoneIntlCode.trim();
  const intlDigits = toDigits(draft.phoneIntl, MAX_INTL_DIGITS);
  if (intlDigits && !intlCode) errors.phoneIntlCode = M.INTL_CODE_REQUIRED;
  if (intlCode && !intlDigits) errors.phoneIntl = M.INTL_NUMBER_REQUIRED;
  else if (intlDigits && intlDigits.length < INTL_NUMBER_MIN) errors.phoneIntl = M.INTL_NUMBER_INVALID;

  if (!phoneUs && !intlDigits && !intlCode) errors.phoneUs = M.PHONE_REQUIRED;

  const directions = draft.directions.trim();
  if (directions.length > DIRECTIONS_MAX || directions.includes('"')) {
    errors.directions = M.DIRECTIONS_INVALID;
  }

  return errors;
}

export function hasErrors(errors: AddressErrors): boolean {
  return Object.keys(errors).length > 0;
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
