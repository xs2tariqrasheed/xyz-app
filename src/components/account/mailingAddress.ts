import { FIELD_LIMITS } from '@/constants/fieldLimits';
import { MAILING_ADDRESS_MESSAGES as M, VALIDATION_MESSAGES as V } from '@/constants/messages';
import { UNITED_STATES } from '@/data/regions';
import { digitsOnly } from '@/utils/phone';
import {
  hasNoDoubleQuote,
  hasValidStreetChars,
  intlPhoneProblem,
  isValidBuildingNo,
  isValidStreetName,
  isValidUsPhone,
  isValidZip,
} from '@/utils/validation';

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
  } else if (domestic && !isValidZip(postalCode)) {
    errors.postalCode = V.ZIP_INVALID;
  }

  const building = value.buildingNumber.trim();
  if (!building) errors.buildingNumber = M.BUILDING_REQUIRED;
  else if (!isValidBuildingNo(building)) errors.buildingNumber = V.BUILDING_INVALID;

  const street = value.streetName.trim();
  if (!street) errors.streetName = M.STREET_REQUIRED;
  else if (!isValidStreetName(street)) errors.streetName = V.STREET_INVALID;

  const crossStreet = value.crossStreet.trim();
  if (crossStreet && (!hasValidStreetChars(crossStreet) || crossStreet.length > FIELD_LIMITS.MAILING_CROSS_STREET)) {
    errors.crossStreet = V.STREET_CHARACTERS;
  }

  if (!hasNoDoubleQuote(value.unit)) errors.unit = M.UNIT_INVALID;

  const phoneDigits = digitsOnly(value.phone);
  if (phoneDigits.length > 0 && !isValidUsPhone(phoneDigits)) errors.phone = V.US_PHONE_INVALID;

  // The gateway stores the code and number as one run of digits, so a loaded
  // number's split is a guess — only the pair as a whole is checked.
  const intlDigits = digitsOnly(value.intlPhone);
  const dialDigits = digitsOnly(value.intlDialCode);
  switch (intlPhoneProblem(dialDigits, intlDigits)) {
    case 'codeRequired':
      errors.intlDialCode = V.INTL_CODE_REQUIRED;
      break;
    case 'numberRequired':
      errors.intlPhone = V.INTL_NUMBER_REQUIRED;
      break;
    case 'incomplete':
      errors.intlPhone = V.INTL_NUMBER_INCOMPLETE;
      break;
  }

  if (phoneDigits.length === 0 && intlDigits.length === 0 && dialDigits.length === 0) {
    errors.phone = M.PHONE_REQUIRED;
  }

  return errors;
}

export function countErrors(errors: MailingAddressErrors): number {
  return Object.keys(errors).length;
}
