import {
  EMPTY_MAILING_ADDRESS,
  type AddressType,
  type MailingAddress,
} from '@/components/account/mailingAddress';
import type { PreferencesValue } from '@/components/preferences/preferences';
import type { PersonalInfoValue } from '@/components/profile/PersonalInfoSection';
import type { PhoneValue } from '@/components/ui/PhoneField';
import { DB_SUCCESS_CODE } from '@/constants/actionCodes';
import { PROFILE_MESSAGES } from '@/constants/messages';
import { COUNTRIES as REGION_COUNTRIES, UNITED_STATES } from '@/data/regions';
import { GatewayError, type GatewayJData, type GatewayResponse, mapRows } from '@/services/gateway';
import { isYes } from '@/services/gatewayRows';
import { digitsOnly, formatUsPhone } from '@/utils/contact';
import { COUNTRIES, findCountryByDial, toIntlDigits } from '@/utils/phone';

/**
 * The signed-in customer's profile, mapped from a
 * `PROF.S.LOAD_PROFILE` row. Field names are renamed here so screens never
 * read raw gateway columns.
 */

export type CustomerProfile = {
  firstName: string;
  lastName: string;
  /** The login before this one, when the server knows it. */
  lastLoginAt: Date | null;
  /** What the Profile screen's Personal Info panel edits. */
  personalInfo: PersonalInfoValue;
  /** Contact e-mail on file; '' when the profile has none. */
  email: string;
  /** Corporate account the customer books against; '' for card-only profiles. */
  accountNumber: string;
  /** Car preferences from registration, sent with every booking ('' when unset). */
  carPreferences: { fleetName: string; carYear: string; smokingAllowed: string };
  /** What the Preferences screen edits; a new booking's confirmation starts from it. */
  preferences: PreferencesValue;
  /** What the Update Mailing Address screen edits; blank when the profile has none. */
  mailingAddress: MailingAddress;
};

/** `P_CONFIRMATION_METHOD`: "EMAIL" is the sample; "PHONE" mirrors it. */
export const CONFIRMATION_CODES = { email: 'EMAIL', phone: 'PHONE' } as const;

/** `P_SPECIAL_OFFER`: "N" is the sample; "Y" opts in. */
export const SPECIAL_OFFER_CODES = { yes: 'Y', no: 'N' } as const;

/** `P_ADDRESS_TYPE`. "H" is the documented sample; "O" mirrors it for office. */
export const ADDRESS_TYPE_CODES: Record<AddressType, string> = { home: 'H', office: 'O' };

/** Thrown when the server refuses a profile update, as opposed to failing. */
export class ProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfileError';
  }
}

/** `PROF.S.LOAD_PROFILE` columns behind each personal info field. */
const COLUMNS = {
  firstName: 'first_name',
  lastName: 'last_name',
  usNumber: 'phone_number_us',
  usExt: 'phone_ext_us',
  intlDial: 'dial_code_intl',
  intlNumber: 'phone_number_intl',
  intlExt: 'phone_ext_intl',
  faxDial: 'fax_dial_code',
  faxNumber: 'fax_number',
  faxExt: 'fax_ext',
  lastLogin: 'last_login',
  email: 'email',
  accountNumber: 'account_number',
  /** The contract's own spelling (`P_ACCOUNT_NUM`), should the row use it. */
  accountNum: 'account_num',
  preferredFleet: 'preferred_fleet',
  carYear: 'car_year',
  smokingCar: 'smoking_car',
  confirmationMethod: 'confirmation_method',
  specialOffer: 'special_offer',
  // Mailing address: named like the `PROF.U.PROFILE` parameters without `P_`.
  country: 'country',
  state: 'state',
  city: 'city',
  zip: 'zip',
  buildingNumber: 'building_num',
  streetName: 'street_name',
  crossStreet1: 'cross_street1',
  crossStreet2: 'cross_street2',
  addressPhoneUs: 'address_phone_us',
  addressPhone: 'address_phone',
  addressType: 'address_type',
} as const;

type ProfileRow = Record<string, string>;

export function toCustomerProfile(rows: ProfileRow[] | undefined): CustomerProfile | null {
  const row = rows?.[0];
  if (!row) return null;

  const firstName = text(row, COLUMNS.firstName);
  const lastName = text(row, COLUMNS.lastName);

  return {
    firstName,
    lastName,
    lastLoginAt: parseGatewayDateTime(row[COLUMNS.lastLogin]),
    personalInfo: {
      firstName,
      lastName,
      usPhone: { country: null, number: digits(row, COLUMNS.usNumber), ext: digits(row, COLUMNS.usExt) },
      intlPhone: intlPhone(row, COLUMNS.intlDial, COLUMNS.intlNumber, COLUMNS.intlExt),
      fax: intlPhone(row, COLUMNS.faxDial, COLUMNS.faxNumber, COLUMNS.faxExt),
    },
    email: text(row, COLUMNS.email),
    accountNumber: text(row, COLUMNS.accountNumber) || text(row, COLUMNS.accountNum),
    carPreferences: {
      fleetName: text(row, COLUMNS.preferredFleet),
      carYear: text(row, COLUMNS.carYear),
      smokingAllowed: text(row, COLUMNS.smokingCar).toUpperCase(),
    },
    preferences: {
      confirmByPhone: isPhoneConfirmation(text(row, COLUMNS.confirmationMethod)),
      subscribeSpecialOffers: isYes(text(row, COLUMNS.specialOffer)),
    },
    mailingAddress: toMailingAddress(row),
  };
}

function toMailingAddress(row: ProfileRow): MailingAddress {
  const country = countryName(text(row, COLUMNS.country));
  const state = text(row, COLUMNS.state);
  const [intlDialCode, intlPhone] = splitIntlDigits(digits(row, COLUMNS.addressPhone));

  return {
    ...EMPTY_MAILING_ADDRESS,
    country,
    state: country === UNITED_STATES ? state.toUpperCase() : state,
    city: text(row, COLUMNS.city),
    postalCode: country === UNITED_STATES ? digits(row, COLUMNS.zip) : text(row, COLUMNS.zip),
    buildingNumber: text(row, COLUMNS.buildingNumber),
    streetName: text(row, COLUMNS.streetName),
    crossStreet: text(row, COLUMNS.crossStreet1),
    // Apt # / Mail stop is saved in the second cross-street slot; see mailingAddressParams.
    unit: text(row, COLUMNS.crossStreet2),
    phone: formatUsPhone(digits(row, COLUMNS.addressPhoneUs)),
    intlDialCode,
    intlPhone,
    addressType: toAddressType(text(row, COLUMNS.addressType)),
  };
}

/** `P_COUNTRY` holds an ISO code ("US"); the form shows the name. Unknown values pass through. */
function countryName(value: string): string {
  if (!value) return UNITED_STATES;
  const byCode = COUNTRIES.find((country) => country.code === value.toUpperCase());
  if (byCode) return byCode.name;
  return REGION_COUNTRIES.find((name) => name.toLowerCase() === value.toLowerCase()) ?? value;
}

/** The `P_COUNTRY` code for a country name from the address form. */
function countryCode(name: string): string {
  return COUNTRIES.find((country) => country.name === name)?.code ?? name.trim();
}

/**
 * `address_phone` is saved as one run of digits — calling code, city code and
 * number together. The longest calling code it starts with becomes the
 * form's code field; the rest is the number. With no match it is all number.
 */
function splitIntlDigits(value: string): [string, string] {
  if (!value) return ['', ''];
  const dial = COUNTRIES.map((country) => country.dial)
    .filter((code) => value.startsWith(code) && value.length > code.length)
    .sort((a, b) => b.length - a.length)[0];
  return dial ? [`+${dial}`, value.slice(dial.length)] : ['', value];
}

function toAddressType(value: string): AddressType {
  return value.toUpperCase() === ADDRESS_TYPE_CODES.home ? 'home' : 'office';
}

/**
 * The 11 `P_COUNTRY … P_ADDRESS_TYPE` parameters for a mailing address,
 * shared by `PROF.I.PROFILE` (registration) and `PROF.U.PROFILE`.
 */
export function mailingAddressParams(address: MailingAddress): GatewayJData {
  return {
    P_COUNTRY: countryCode(address.country),
    P_STATE: address.state.trim(),
    P_CITY: address.city.trim(),
    P_ZIP: address.postalCode.trim(),
    P_BUILDING_NUM: address.buildingNumber.trim(),
    P_STREET_NAME: address.streetName.trim(),
    P_CROSS_STREET1: address.crossStreet.trim(),
    // Apt # / Mail stop has no parameter of its own, so it uses the second
    // cross-street slot, which the form does not otherwise fill.
    P_CROSS_STREET2: address.unit.trim(),
    P_ADDRESS_PHONE: digitsOnly(`${address.intlDialCode}${address.intlPhone}`),
    P_ADDRESS_PHONE_US: digitsOnly(address.phone),
    P_ADDRESS_TYPE: ADDRESS_TYPE_CODES[address.addressType],
  };
}

/** Anything other than a phone value (EMAIL, NONE, '') means no call-back. */
function isPhoneConfirmation(value: string): boolean {
  return /phone/i.test(value) || value.toUpperCase() === 'P';
}

/**
 * `PROF.U.PROFILE` parameters copied straight from the `PROF.S.LOAD_PROFILE`
 * column named like them without the `P_` prefix (`P_CC_YEAR` → `cc_year`),
 * in contract order.
 */
const PASSTHROUGH_PARAMS = [
  'P_PASSWORD',
  'P_COUNTRY',
  'P_STATE',
  'P_CITY',
  'P_ZIP',
  'P_BUILDING_NUM',
  'P_STREET_NAME',
  'P_CROSS_STREET1',
  'P_CROSS_STREET2',
  'P_ADDRESS_PHONE',
  'P_ADDRESS_PHONE_US',
  'P_ADDRESS_TYPE',
  'P_PAYMENT_TYPE',
  'P_CC_TYPE',
  'P_CARD_HOLDER_NAME',
  'P_CARD_NUMBER',
  'P_VERIFY_CODE',
  'P_CC_MONTH',
  'P_CC_YEAR',
  'P_ACCOUNT_REQ1',
  'P_ACCOUNT_REQ2',
  'P_ACCOUNT_REQ3',
  'P_ACCOUNT_REQ4',
  'P_CONFIRMATION_METHOD',
  'P_PREFERRED_FLEET',
  'P_CAR_YEAR',
  'P_CAR_PHONE',
  'P_SPECIAL_OFFER',
  'P_SMOKING_CAR',
  'P_IVR_PIN',
] as const;

/**
 * Every parameter the loaded row can vouch for, with the value it holds.
 *
 * `PROF.U.PROFILE` replaces the whole profile, so an untouched field must go
 * back exactly as it came. A parameter whose column the row does not carry is
 * left out rather than sent blank — the update never clears data the app was
 * never shown.
 */
function loadedProfileParams(row: ProfileRow): GatewayJData {
  const has = (column: string) => column in row;
  const params: GatewayJData = {};

  if (has(COLUMNS.firstName)) params.P_FIRST_NAME = text(row, COLUMNS.firstName);
  if (has(COLUMNS.lastName)) params.P_LAST_NAME = text(row, COLUMNS.lastName);
  if (has(COLUMNS.intlDial) || has(COLUMNS.intlNumber)) {
    params.P_PHONE_NUMBER = joinedDigits(row, COLUMNS.intlDial, COLUMNS.intlNumber);
  }
  if (has(COLUMNS.intlExt)) params.P_PHONE_EXT = digits(row, COLUMNS.intlExt);
  if (has(COLUMNS.usNumber)) params.P_PHONE_NUMBER_US = digits(row, COLUMNS.usNumber);
  if (has(COLUMNS.usExt)) params.P_PHONE_EXT_US = digits(row, COLUMNS.usExt);
  // The contract has no fax extension parameter.
  if (has(COLUMNS.faxDial) || has(COLUMNS.faxNumber)) {
    params.P_FAX = joinedDigits(row, COLUMNS.faxDial, COLUMNS.faxNumber);
  }

  for (const param of PASSTHROUGH_PARAMS) {
    const column = param.slice('P_'.length).toLowerCase();
    if (has(column)) params[param] = text(row, column);
  }
  return params;
}

/** Calling code + number as one run of digits, or '' when there is no number. */
function joinedDigits(row: ProfileRow, dialColumn: string, numberColumn: string): string {
  const number = digits(row, numberColumn);
  return number ? `${digits(row, dialColumn)}${number}` : '';
}

/** The parameters the Personal Info panel edits. */
function personalInfoParams(personal: PersonalInfoValue): GatewayJData {
  return {
    P_FIRST_NAME: personal.firstName.trim(),
    P_LAST_NAME: personal.lastName.trim(),
    P_PHONE_NUMBER: toIntlDigits(personal.intlPhone),
    P_PHONE_EXT: personal.intlPhone.number ? personal.intlPhone.ext : '',
    P_PHONE_NUMBER_US: personal.usPhone.number,
    P_PHONE_EXT_US: personal.usPhone.number ? personal.usPhone.ext : '',
    P_FAX: toIntlDigits(personal.fax),
  };
}

/** The parameters the Preferences screen edits. */
function preferencesParams(preferences: PreferencesValue): GatewayJData {
  return {
    P_CONFIRMATION_METHOD: preferences.confirmByPhone ? CONFIRMATION_CODES.phone : CONFIRMATION_CODES.email,
    P_SPECIAL_OFFER: preferences.subscribeSpecialOffers ? SPECIAL_OFFER_CODES.yes : SPECIAL_OFFER_CODES.no,
  };
}

/** The parameters in `edited` whose value differs from the form's starting point. */
function changedParams(edited: GatewayJData, before: GatewayJData): GatewayJData {
  return Object.fromEntries(Object.entries(edited).filter(([param, value]) => value !== before[param]));
}

function loadedProfile(row: ProfileRow): CustomerProfile {
  const loaded = toCustomerProfile([row]);
  if (!loaded) throw new Error('The profile has not loaded yet.');
  return loaded;
}

/**
 * `JData` for {@link ACTION_CODES.UPDATE_PROFILE} from the Personal Info
 * panel: the loaded profile, with only the fields the customer changed
 * replaced. The session holds no password; `P_PASSWORD` goes back as loaded.
 */
export function updateProfileJData(
  loginId: string,
  row: ProfileRow,
  personal: PersonalInfoValue,
): GatewayJData {
  const loaded = loadedProfile(row);
  return {
    P_LOGIN_ID: loginId,
    ...loadedProfileParams(row),
    ...changedParams(personalInfoParams(personal), personalInfoParams(loaded.personalInfo)),
  };
}

/**
 * `JData` for {@link ACTION_CODES.UPDATE_PROFILE} from the Preferences
 * screen: the loaded profile, with only the settings the customer changed
 * replaced. An untouched setting goes back as the server sent it, so a value
 * the app does not model (e.g. "NONE") survives.
 */
export function updatePreferencesJData(
  loginId: string,
  row: ProfileRow,
  preferences: PreferencesValue,
): GatewayJData {
  const loaded = loadedProfile(row);
  return {
    P_LOGIN_ID: loginId,
    ...loadedProfileParams(row),
    ...changedParams(preferencesParams(preferences), preferencesParams(loaded.preferences)),
  };
}

/**
 * `JData` for {@link ACTION_CODES.UPDATE_PROFILE} from the Update Mailing
 * Address screen: the loaded profile, with the address replaced only when the
 * customer changed it. An address is saved whole — country, state and ZIP
 * have to agree — so one changed field sends all 11 address parameters.
 */
export function updateMailingAddressJData(
  loginId: string,
  row: ProfileRow,
  address: MailingAddress,
): GatewayJData {
  const loaded = loadedProfile(row);
  const edited = mailingAddressParams(address);
  const changed = Object.keys(changedParams(edited, mailingAddressParams(loaded.mailingAddress))).length > 0;
  return {
    P_LOGIN_ID: loginId,
    ...loadedProfileParams(row),
    ...(changed ? edited : {}),
  };
}

/**
 * Throws unless the update's first row carries `o_code` "0". A missing code
 * fails closed; `rejected` is shown when the server refuses without a message.
 */
export function assertProfileUpdated(
  response: GatewayResponse,
  rejected: string = PROFILE_MESSAGES.UPDATE_REJECTED,
): void {
  const result = mapRows(response)[0];
  if (!result || !('o_code' in result)) {
    throw new GatewayError('parsing', 'The profile update response has no result code.');
  }
  if (result.o_code !== DB_SUCCESS_CODE) {
    throw new ProfileError(result.o_message || rejected);
  }
}

function text(row: ProfileRow, column: string): string {
  return row[column]?.trim() ?? '';
}

function digits(row: ProfileRow, column: string): string {
  return text(row, column).replace(/\D/g, '');
}

/** A calling code with no number is noise, so the country is kept only alongside one. */
function intlPhone(row: ProfileRow, dialColumn: string, numberColumn: string, extColumn: string): PhoneValue {
  const number = digits(row, numberColumn);
  if (!number) return { country: null, number: '', ext: '' };
  return {
    country: findCountryByDial(text(row, dialColumn))?.code ?? null,
    number,
    ext: digits(row, extColumn),
  };
}

/** "10/11/2026 09:20 AM" (MM/DD/YYYY hh:mm AM|PM, local time) → Date. */
const DATE_TIME = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

function parseGatewayDateTime(value: string | undefined): Date | null {
  const match = value?.trim().match(DATE_TIME);
  if (!match) return null;

  const [, month, day, year, hour, minute, meridiem] = match;
  const hours = (Number(hour) % 12) + (meridiem.toUpperCase() === 'PM' ? 12 : 0);
  const date = new Date(Number(year), Number(month) - 1, Number(day), hours, Number(minute));
  return Number.isNaN(date.getTime()) ? null : date;
}
