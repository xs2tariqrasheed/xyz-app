import { UNITED_STATES, usStateName } from '@/data/regions';
import { digitsOnly, isValidUsZip, US_PHONE_LENGTH } from '@/utils/contact';

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
 * The address currently on file.
 *
 * Stands in for the profile API until it exists — the page reads its initial
 * state from here and writes back to it on save.
 */
export const SAVED_MAILING_ADDRESS: MailingAddress = {
  country: UNITED_STATES,
  state: 'NY',
  city: 'Manhattan',
  postalCode: '10103',
  buildingNumber: '666',
  streetName: '5 Ave',
  crossStreet: '53 St',
  unit: '',
  phone: '',
  intlDialCode: '',
  intlPhone: '',
  addressType: 'home',
};

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
  addressType: 'home',
};

/** One message per field that failed. An empty object means the form is good. */
export type MailingAddressErrors = Partial<Record<keyof MailingAddress, string>>;

export function isUnitedStates(value: MailingAddress): boolean {
  return value.country === UNITED_STATES;
}

/**
 * Validates the whole address at once.
 *
 * Rules follow what a carrier actually needs: country, region, city, postal
 * code and a street line. Phone numbers stay optional, but a partial one is an
 * error — a half-typed number is worse than none.
 */
export function validateMailingAddress(value: MailingAddress): MailingAddressErrors {
  const errors: MailingAddressErrors = {};
  const domestic = isUnitedStates(value);

  if (!value.country.trim()) errors.country = 'Pick a country.';

  if (!value.state.trim()) {
    errors.state = domestic ? 'Pick a state.' : 'Enter a state, province or region.';
  }

  if (!value.city.trim()) errors.city = 'Enter a city.';

  if (!value.postalCode.trim()) {
    errors.postalCode = domestic ? 'Enter a ZIP code.' : 'Enter a postal code.';
  } else if (domestic && !isValidUsZip(value.postalCode)) {
    errors.postalCode = 'Use 5 digits, or 9 for ZIP+4.';
  }

  if (!value.buildingNumber.trim()) errors.buildingNumber = 'Enter a building number.';
  if (!value.streetName.trim()) errors.streetName = 'Enter a street name.';

  const phoneDigits = digitsOnly(value.phone);
  if (phoneDigits.length > 0 && phoneDigits.length !== US_PHONE_LENGTH) {
    errors.phone = 'A US number needs 10 digits.';
  }

  const intlDigits = digitsOnly(value.intlPhone);
  const dialDigits = digitsOnly(value.intlDialCode);
  if (intlDigits.length > 0 && dialDigits.length === 0) {
    errors.intlDialCode = 'Add the country and city code.';
  } else if (dialDigits.length > 0 && intlDigits.length === 0) {
    errors.intlPhone = 'Add the phone number.';
  }

  return errors;
}

export function countErrors(errors: MailingAddressErrors): number {
  return Object.keys(errors).length;
}

/** One-line rendering of the address, for the read-back summary. */
export function formatMailingAddress(value: MailingAddress): string {
  const street = [value.buildingNumber, value.streetName].map((part) => part.trim()).filter(Boolean).join(' ');
  const region = isUnitedStates(value) ? usStateName(value.state) : value.state;

  return [street, value.unit, value.crossStreet, value.city, region, value.postalCode, value.country]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');
}
