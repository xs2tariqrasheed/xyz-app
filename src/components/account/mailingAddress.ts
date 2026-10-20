import { MAILING_ADDRESS_MESSAGES as M } from '@/constants/messages';
import { UNITED_STATES } from '@/data/regions';
import { digitsOnly, US_PHONE_LENGTH } from '@/utils/contact';
import { hasValidStreetChars } from '@/utils/validation';

export type AddressType = 'home' | 'office';

/** The mailing address on file. Strings throughout — this is form state. */
export type MailingAddress = {
  country: string;
  /** USPS code inside the US, free text everywhere else. */
  state: string;
  city: string;
  postalCode: string;
  buildingNumber: string;
  streetName: string;
  /** Cross street or second address line. */
  crossStreet: string;
  /** Apartment, suite or mail stop. */
  unit: string;
  /** US number at this address, formatted. */
  phone: string;
  /** Country + city code for the international number. */
  intlDialCode: string;
  intlPhone: string;
  addressType: AddressType;
};

/** Field limits from the legacy mailing address page (reverse-engineer-implemented/guide/08 §3). */
export const MAILING_ADDRESS_LIMITS = {
  city: 30,
  zip: 5,
  buildingNumber: 6,
  street: 30,
  unit: 30,
} as const;

const STREET_MIN = 4;
const INTL_NUMBER_MIN = 4;
/**
 * Legacy minimums: 3 for the country + city code, 4 for the number. The
 * gateway stores both as one run of digits, so a loaded number's split is a
 * guess — the code alone is not checked, only the pair's total.
 */
const INTL_TOTAL_MIN = 3 + INTL_NUMBER_MIN;

/**
 * A blank form: registration starts here, and so does the Update Mailing
 * Address screen when the profile carries no address. Office is the legacy
 * default.
 */
export const EMPTY_MAILING_ADDRESS: MailingAddress = {
  country: UNITED_STATES,
  state: '',
  city: '',
  postalCode: '',
  buildingNumber: '',
  streetName: '',
  crossStreet: '',
  unit: '',
  phone: '',
  intlDialCode: '',
  intlPhone: '',
  addressType: 'office',
};

/** One message per field that failed. An empty object means the form is good. */
export type MailingAddressErrors = Partial<Record<keyof MailingAddress, string>>;

export function isUnitedStates(value: MailingAddress): boolean {
  return value.country === UNITED_STATES;
}

/** Flat by design — a value compare, so the Update button knows it has work. */
export function mailingAddressEqual(a: MailingAddress, b: MailingAddress): boolean {
  return (Object.keys(a) as (keyof MailingAddress)[]).every((field) => a[field] === b[field]);
}

/**
 * Validates the whole address at once, to the legacy site's rules
 * (reverse-engineer-implemented/guide/08, reverse-engineer-guide/26): a complete street address, and at least
 * one phone at it — US, or a full international code + number pair.
 */
export function validateMailingAddress(value: MailingAddress): MailingAddressErrors {
  const errors: MailingAddressErrors = {};
  const domestic = isUnitedStates(value);

  if (!value.country.trim()) errors.country = M.COUNTRY_REQUIRED;

  if (!value.state.trim()) errors.state = domestic ? M.STATE_REQUIRED : M.REGION_REQUIRED;

  if (!value.city.trim()) errors.city = M.CITY_REQUIRED;

  const postalCode = value.postalCode.trim();
  if (!postalCode) {
    errors.postalCode = domestic ? M.ZIP_REQUIRED : M.POSTAL_CODE_REQUIRED;
  } else if (domestic && !/^\d{5}$/.test(postalCode)) {
    errors.postalCode = M.ZIP_INVALID;
  }

  const building = value.buildingNumber.trim();
  if (!building) errors.buildingNumber = M.BUILDING_REQUIRED;
  else if (!/^\d{1,6}$/.test(building)) errors.buildingNumber = M.BUILDING_INVALID;

  const street = value.streetName.trim();
  if (!street) errors.streetName = M.STREET_REQUIRED;
  else if (!hasValidStreetChars(street)) errors.streetName = M.STREET_CHARACTERS;
  else if (street.length < STREET_MIN || street.length > MAILING_ADDRESS_LIMITS.street) {
    errors.streetName = M.STREET_INVALID;
  }

  const crossStreet = value.crossStreet.trim();
  if (crossStreet && !hasValidStreetChars(crossStreet)) errors.crossStreet = M.STREET_CHARACTERS;

  if (value.unit.includes('"')) errors.unit = M.UNIT_INVALID;

  const phoneDigits = digitsOnly(value.phone);
  // A US area code never starts with 0 or 1.
  if (phoneDigits.length > 0 && !(phoneDigits.length === US_PHONE_LENGTH && /^[2-9]/.test(phoneDigits))) {
    errors.phone = M.PHONE_INVALID;
  }

  // The international number is a pair: a code without a number, or the
  // reverse, is incomplete.
  const intlDigits = digitsOnly(value.intlPhone);
  const dialDigits = digitsOnly(value.intlDialCode);
  if (dialDigits.length > 0 && intlDigits.length === 0) {
    errors.intlPhone = M.INTL_NUMBER_REQUIRED;
  } else if (intlDigits.length > 0 && dialDigits.length === 0) {
    errors.intlDialCode = M.INTL_DIAL_REQUIRED;
  } else if (
    dialDigits.length > 0 &&
    (intlDigits.length < INTL_NUMBER_MIN || dialDigits.length + intlDigits.length < INTL_TOTAL_MIN)
  ) {
    errors.intlPhone = M.INTL_NUMBER_INVALID;
  }

  if (phoneDigits.length === 0 && intlDigits.length === 0 && dialDigits.length === 0) {
    errors.phone = M.PHONE_REQUIRED;
  }

  return errors;
}

export function countErrors(errors: MailingAddressErrors): number {
  return Object.keys(errors).length;
}
