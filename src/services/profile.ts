import type { AddressType, MailingAddress } from '@/components/account/mailingAddress';
import type { PreferencesValue } from '@/components/preferences/preferences';
import type { PersonalInfoValue } from '@/components/profile/PersonalInfoSection';
import type { PhoneValue } from '@/components/ui/PhoneField';
import { DB_SUCCESS_CODE } from '@/constants/actionCodes';
import { PROFILE_MESSAGES } from '@/constants/messages';
import { GatewayError, type GatewayJData, type GatewayResponse, mapRowsByHeadings } from '@/services/gateway';
import { digitsOnly } from '@/utils/contact';
import { COUNTRIES, findCountryByDial, toIntlDigits } from '@/utils/phone';

/**
 * The signed-in customer's profile, mapped from a `PROF.S.LOAD_PROFILE` row.
 * Only the columns its `JMetaData.Headings` name are read, each value paired
 * with the heading at the same position (`mapRowsByHeadings`); values past the
 * last heading are ignored, and a heading that stops coming fails the load
 * (docs/XYZ_INTEGRATION_GUIDE.md §10). Today's pairing is shifted (`first_name`
 * carries the password); it is shown as paired until the gateway is fixed.
 * Field names are renamed here so screens never read raw gateway columns.
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
  /**
   * What the Preferences screen edits. `null`: the app doesn't read the
   * preference headings `LOAD_PROFILE` sends since 2026-11-03 yet
   * (docs/XYZ_INTEGRATION_GUIDE.md §10), so a new booking starts from the
   * form's own default.
   */
  preferences: PreferencesValue | null;
  /**
   * What the Update Mailing Address screen edits. `null`: the app doesn't read
   * the address headings `LOAD_PROFILE` sends since 2026-11-03 yet (guide §10).
   */
  mailingAddress: MailingAddress | null;
};

/**
 * `P_CONFIRMATION_METHOD`. "ML" (e-mail) is the backend test client's value
 * for `PROF.I.PROFILE`, `RES.I.RESERVATION` and `RES.U.RESERVATION`
 * (docs/XYZ_INTEGRATION_GUIDE.md §10). Its `PROF.U.PROFILE` sample sends ''.
 * Guide 09 calls an unticked "Phone" confirmation by "None"; no code for None
 * is known, so unticked sends e-mail.
 */
export const CONFIRMATION_CODES = {
  email: 'ML',
  // TODO(schema-unverified): the phone code is not in any backend sample;
  // confirm it with the backend and remove this comment.
  phone: 'PHONE',
} as const;

/** `P_SPECIAL_OFFER`: "N" is the backend test client's value. */
export const SPECIAL_OFFER_CODES = {
  // TODO(schema-unverified): "Y" is not in any backend sample; confirm the
  // opt-in code with the backend and remove this comment.
  yes: 'Y',
  no: 'N',
} as const;

/** `P_ADDRESS_TYPE`. "HOME" is the backend test client's value (`PROF.I.PROFILE`, `PROF.U.PROFILE`). */
export const ADDRESS_TYPE_CODES: Record<AddressType, string> = {
  home: 'HOME',
  // TODO(schema-unverified): the office code is not in any backend sample;
  // confirm it with the backend and remove this comment.
  office: 'O',
};

/** `P_COUNTRY` for the United States: "01", as the backend test client sends and the records return. */
const US_COUNTRY_CODE = '01';

/** Thrown when the server refuses a profile update, as opposed to failing. */
export class ProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfileError';
  }
}

/** The `PROF.S.LOAD_PROFILE` headings the app reads, one per field. */
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
} as const;

/** Every `LOAD_PROFILE` heading the app reads; the load fails closed without one. */
const PROFILE_HEADINGS = Object.values(COLUMNS);

export type ProfileRow = Record<(typeof COLUMNS)[keyof typeof COLUMNS], string>;

/** The `PROF.S.LOAD_PROFILE` row, by heading. Throws `GatewayError('parsing')` when a heading is missing. */
export function toProfileRow(response: GatewayResponse): ProfileRow | undefined {
  return mapRowsByHeadings(response, PROFILE_HEADINGS)[0];
}

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
    accountNumber: text(row, COLUMNS.accountNumber),
    preferences: null,
    mailingAddress: null,
  };
}

/** The `P_COUNTRY` code for a country name from the address form. */
function countryCode(name: string): string {
  const code = COUNTRIES.find((country) => country.name === name)?.code;
  if (code === 'US') return US_COUNTRY_CODE;
  // TODO(schema-unverified): only the US code ("01") is in a backend sample;
  // confirm the other countries' codes with the backend and remove this comment.
  return code ?? name.trim();
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
    // TODO(schema-unverified): the backend test client sends a second cross
    // street here (`8TH AVE`); confirm which parameter takes the apartment.
    P_CROSS_STREET2: address.unit.trim(),
    P_ADDRESS_PHONE: digitsOnly(`${address.intlDialCode}${address.intlPhone}`),
    P_ADDRESS_PHONE_US: digitsOnly(address.phone),
    P_ADDRESS_TYPE: ADDRESS_TYPE_CODES[address.addressType],
  };
}

/**
 * Every parameter a `LOAD_PROFILE` heading vouches for, with the value it holds.
 *
 * `PROF.U.PROFILE` replaces the whole profile, so an untouched field must go
 * back exactly as it came. A parameter with no heading is left out rather
 * than sent blank — the update never clears data the app was never shown.
 */
function loadedProfileParams(row: ProfileRow): GatewayJData {
  return {
    P_FIRST_NAME: text(row, COLUMNS.firstName),
    P_LAST_NAME: text(row, COLUMNS.lastName),
    P_PHONE_NUMBER: joinedDigits(row, COLUMNS.intlDial, COLUMNS.intlNumber),
    P_PHONE_EXT: digits(row, COLUMNS.intlExt),
    P_PHONE_NUMBER_US: digits(row, COLUMNS.usNumber),
    P_PHONE_EXT_US: digits(row, COLUMNS.usExt),
    // The contract has no fax extension parameter.
    P_FAX: joinedDigits(row, COLUMNS.faxDial, COLUMNS.faxNumber),
  };
}

/** Calling code + number as one run of digits, or '' when there is no number. */
function joinedDigits(row: ProfileRow, dialColumn: ProfileColumn, numberColumn: ProfileColumn): string {
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
  const loaded = loadedProfile(row).preferences;
  if (!loaded) throw new Error('The profile has no preferences to update.');
  return {
    P_LOGIN_ID: loginId,
    ...loadedProfileParams(row),
    ...changedParams(preferencesParams(preferences), preferencesParams(loaded)),
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
  const loaded = loadedProfile(row).mailingAddress;
  if (!loaded) throw new Error('The profile has no mailing address to update.');
  const edited = mailingAddressParams(address);
  const changed = Object.keys(changedParams(edited, mailingAddressParams(loaded))).length > 0;
  return {
    P_LOGIN_ID: loginId,
    ...loadedProfileParams(row),
    ...(changed ? edited : {}),
  };
}

/**
 * Throws unless the update's first row carries `o_code` "0". A missing
 * `o_code` heading or row fails closed; `rejected` is shown when the server
 * refuses without a message.
 */
export function assertProfileUpdated(
  response: GatewayResponse,
  rejected: string = PROFILE_MESSAGES.UPDATE_REJECTED,
): void {
  const result = mapRowsByHeadings(response, ['o_code', 'o_message'])[0];
  if (!result) throw new GatewayError('parsing', 'The profile update response has no result row.');
  // TODO(schema-unverified): `PROF.U.PROFILE` has never been sent (guide §10),
  // so "0" = saved is assumed; confirm its answers against guide §10.
  if (result.o_code !== DB_SUCCESS_CODE) {
    throw new ProfileError(result.o_message.trim() || rejected);
  }
}

type ProfileColumn = keyof ProfileRow;

function text(row: ProfileRow, column: ProfileColumn): string {
  return row[column].trim();
}

function digits(row: ProfileRow, column: ProfileColumn): string {
  return text(row, column).replace(/\D/g, '');
}

/** A calling code with no number is noise, so the country is kept only alongside one. */
function intlPhone(
  row: ProfileRow,
  dialColumn: ProfileColumn,
  numberColumn: ProfileColumn,
  extColumn: ProfileColumn,
): PhoneValue {
  const number = digits(row, numberColumn);
  if (!number) return { country: null, number: '', ext: '' };
  return {
    country: findCountryByDial(text(row, dialColumn))?.code ?? null,
    number,
    ext: digits(row, extColumn),
  };
}

/**
 * "10/15/2026 6:45:35 AM" or "10/11/2026 09:20 AM" (MM/DD/YYYY hh:mm[:ss]
 * AM|PM, local time; guide 06) → Date. `last_login` has never carried a value
 * yet (guide §10), so the format is the old site's.
 */
const DATE_TIME = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i;

function parseGatewayDateTime(value: string): Date | null {
  const match = value.trim().match(DATE_TIME);
  if (!match) return null;

  const [, month, day, year, hour, minute, second, meridiem] = match;
  const hours = (Number(hour) % 12) + (meridiem.toUpperCase() === 'PM' ? 12 : 0);
  const date = new Date(Number(year), Number(month) - 1, Number(day), hours, Number(minute), Number(second ?? 0));
  return Number.isNaN(date.getTime()) ? null : date;
}
