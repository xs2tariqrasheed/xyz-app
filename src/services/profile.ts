import { type AddressType, EMPTY_MAILING_ADDRESS, type MailingAddress } from '@/components/account/mailingAddress';
import type { PreferencesValue } from '@/components/preferences/preferences';
import type { PersonalInfoValue } from '@/components/profile/PersonalInfoSection';
import type { PhoneValue } from '@/components/ui/PhoneField';
import { DB_INTERNAL_ERROR_CODE, DB_SUCCESS_CODE } from '@/constants/actionCodes';
import { PROFILE_MESSAGES } from '@/constants/messages';
import { GatewayError, type GatewayJData, type GatewayResponse, mapRowsByHeadings } from '@/services/gateway';
import { UNITED_STATES } from '@/data/regions';
import { digitsOnly, formatUsPhone } from '@/utils/contact';
import { MONTHS_SHORT } from '@/utils/datetime';
import { COUNTRIES, findCountryByDial, toIntlDigits } from '@/utils/phone';

/**
 * The signed-in customer's profile, mapped from a `PROF.S.LOAD_PROFILE` row.
 * Each field is read by the one heading the code sends (`mapRowsByHeadings`),
 * and a heading that stops coming fails the load (docs/XYZ_INTEGRATION_GUIDE.md
 * §10). `opassword`, `ocardnumber` and `overifycode` are only passed back
 * untouched by an update (`loadedProfileParams`), never shown.
 * Field names are renamed here so screens never read raw gateway columns.
 */

export type CustomerProfile = {
  firstName: string;
  lastName: string;
  /** Day of the login before this one, when the server knows it (no time is sent). */
  lastLoginOn: Date | null;
  /** What the Profile screen's Personal Info panel edits. */
  personalInfo: PersonalInfoValue;
  /** Contact e-mail on file; '' when the profile has none. */
  email: string;
  /** Corporate account the customer books against; '' for card-only profiles. */
  accountNumber: string;
  /**
   * What the Preferences screen edits. `null` when both preference values are
   * empty, so the screen shows "not available" and a new booking starts from
   * the form's own default.
   */
  preferences: PreferencesValue | null;
  /**
   * What the Update Mailing Address screen edits. `null` when every address
   * value is empty, so the screen shows "not available".
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

/** The `PROF.S.LOAD_PROFILE` headings the app reads, one per field (guide §10). */
const COLUMNS = {
  firstName: 'ofirstname',
  lastName: 'olastname',
  usNumber: 'ophonenumberus',
  usExt: 'ophoneextus',
  intlNumber: 'ophonenumber',
  intlExt: 'ophoneext',
  fax: 'ofax',
  lastLogin: 'oelastlogindate',
  email: 'oeemailaddress',
  accountNumber: 'oaccountnum',
  country: 'ocountry',
  state: 'ostate',
  city: 'ocity',
  zip: 'ozip',
  buildingNumber: 'obuildingnum',
  streetName: 'ostreetname',
  crossStreet: 'ocrossstreet1',
  unit: 'ocrossstreet2',
  addressPhoneUs: 'oaddressphoneus',
  addressPhone: 'oaddressphone',
  addressType: 'oaddresstype',
  confirmationMethod: 'oconfirmationmethod',
  specialOffer: 'ospecialoffer',
} as const;

/**
 * Every `PROF.U.PROFILE` parameter with the `LOAD_PROFILE` heading holding its
 * stored value. The procedure needs all of them on every save — leaving any
 * out fails (`"9"`, ORA-01843; guide §10) — so untouched values go back
 * exactly as loaded. Password and card values are only passed through here:
 * never shown, logged or kept anywhere else.
 */
const UPDATE_PARAMETER_HEADINGS = {
  P_PASSWORD: 'opassword',
  P_FIRST_NAME: COLUMNS.firstName,
  P_LAST_NAME: COLUMNS.lastName,
  P_PHONE_NUMBER: COLUMNS.intlNumber,
  P_PHONE_EXT: COLUMNS.intlExt,
  P_PHONE_NUMBER_US: COLUMNS.usNumber,
  P_PHONE_EXT_US: COLUMNS.usExt,
  P_FAX: COLUMNS.fax,
  P_COUNTRY: COLUMNS.country,
  P_STATE: COLUMNS.state,
  P_CITY: COLUMNS.city,
  P_ZIP: COLUMNS.zip,
  P_BUILDING_NUM: COLUMNS.buildingNumber,
  P_STREET_NAME: COLUMNS.streetName,
  P_CROSS_STREET1: COLUMNS.crossStreet,
  P_CROSS_STREET2: COLUMNS.unit,
  P_ADDRESS_PHONE: COLUMNS.addressPhone,
  P_ADDRESS_PHONE_US: COLUMNS.addressPhoneUs,
  P_ADDRESS_TYPE: COLUMNS.addressType,
  P_PAYMENT_TYPE: 'opaymenttype',
  P_CC_TYPE: 'occtype',
  P_CARD_HOLDER_NAME: 'ocardholdername',
  P_CARD_NUMBER: 'ocardnumber',
  P_VERIFY_CODE: 'overifycode',
  P_CC_MONTH: 'occmonth',
  P_CC_YEAR: 'occyear',
  P_ACCOUNT_REQ1: 'oaccountreq1',
  P_ACCOUNT_REQ2: 'oaccountreq2',
  P_ACCOUNT_REQ3: 'oaccountreq3',
  P_ACCOUNT_REQ4: 'oaccountreq4',
  P_CONFIRMATION_METHOD: COLUMNS.confirmationMethod,
  P_PREFERRED_FLEET: 'opreferredfleet',
  P_CAR_YEAR: 'ocaryear',
  P_CAR_PHONE: 'ocarphone',
  P_SPECIAL_OFFER: COLUMNS.specialOffer,
  P_SMOKING_CAR: 'osmokingcar',
  P_IVR_PIN: 'oivrpin',
} as const;

/** Every `LOAD_PROFILE` heading the app reads; the load fails closed without one. */
const PROFILE_HEADINGS = [...new Set([...Object.values(COLUMNS), ...Object.values(UPDATE_PARAMETER_HEADINGS)])];

export type ProfileRow = Record<(typeof PROFILE_HEADINGS)[number], string>;

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
    lastLoginOn: parseDayMonthYear(text(row, COLUMNS.lastLogin)),
    personalInfo: {
      firstName,
      lastName,
      usPhone: { country: null, number: digits(row, COLUMNS.usNumber), ext: digits(row, COLUMNS.usExt) },
      intlPhone: intlPhone(text(row, COLUMNS.intlNumber), digits(row, COLUMNS.intlExt)),
      fax: intlPhone(text(row, COLUMNS.fax), ''),
    },
    email: text(row, COLUMNS.email),
    accountNumber: text(row, COLUMNS.accountNumber),
    preferences: toPreferences(row),
    mailingAddress: toMailingAddress(row),
  };
}

function toPreferences(row: ProfileRow): PreferencesValue | null {
  const confirmation = text(row, COLUMNS.confirmationMethod);
  const specialOffer = text(row, COLUMNS.specialOffer);
  if (!confirmation && !specialOffer) return null;
  return {
    confirmByPhone: confirmation === CONFIRMATION_CODES.phone,
    subscribeSpecialOffers: specialOffer === SPECIAL_OFFER_CODES.yes,
  };
}

/** Address columns; when every one is empty the profile carries no address. */
const ADDRESS_COLUMNS = [
  COLUMNS.state,
  COLUMNS.city,
  COLUMNS.zip,
  COLUMNS.buildingNumber,
  COLUMNS.streetName,
  COLUMNS.crossStreet,
  COLUMNS.unit,
  COLUMNS.addressPhoneUs,
  COLUMNS.addressPhone,
] as const;

function toMailingAddress(row: ProfileRow): MailingAddress | null {
  if (ADDRESS_COLUMNS.every((column) => !text(row, column))) return null;
  const intl = splitDialNumber(text(row, COLUMNS.addressPhone));
  const type = text(row, COLUMNS.addressType).toUpperCase();
  return {
    country: countryName(text(row, COLUMNS.country)),
    state: text(row, COLUMNS.state),
    city: text(row, COLUMNS.city),
    postalCode: text(row, COLUMNS.zip),
    buildingNumber: text(row, COLUMNS.buildingNumber),
    streetName: text(row, COLUMNS.streetName),
    crossStreet: text(row, COLUMNS.crossStreet),
    unit: text(row, COLUMNS.unit),
    phone: formatUsPhone(digits(row, COLUMNS.addressPhoneUs)),
    intlDialCode: intl.number ? intl.dial : '',
    intlPhone: intl.number,
    // An empty `oaddresstype` keeps the form's legacy default.
    addressType:
      type === ADDRESS_TYPE_CODES.home
        ? 'home'
        : type === ADDRESS_TYPE_CODES.office
          ? 'office'
          : EMPTY_MAILING_ADDRESS.addressType,
  };
}

/** The address form's country name for a `ocountry` code ("01" = US). */
function countryName(code: string): string {
  if (!code || code === US_COUNTRY_CODE) return UNITED_STATES;
  // TODO(schema-unverified): only the US code ("01") is in a backend sample;
  // confirm the other countries' codes with the backend and remove this comment.
  return COUNTRIES.find((country) => country.code === code.toUpperCase())?.name ?? code;
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

/** All 37 `PROF.U.PROFILE` parameters after `P_LOGIN_ID`, each exactly as `LOAD_PROFILE` stored it. */
function loadedProfileParams(row: ProfileRow): GatewayJData {
  return Object.fromEntries(
    Object.entries(UPDATE_PARAMETER_HEADINGS).map(([param, heading]) => [param, row[heading]]),
  );
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
 * replaced. `P_PASSWORD` is not sent.
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
 * Throws unless the update's first row carries `o_code` "0" (`Success`). "9"
 * is a database error whose message is raw Oracle text, so `rejected` is shown
 * instead, as it is when the server refuses without a message. A missing
 * `o_code` heading or row fails closed.
 */
export function assertProfileUpdated(
  response: GatewayResponse,
  rejected: string = PROFILE_MESSAGES.UPDATE_REJECTED,
): void {
  const result = mapRowsByHeadings(response, ['o_code', 'o_message'])[0];
  if (!result) throw new GatewayError('parsing', 'The profile update response has no result row.');
  if (result.o_code !== DB_SUCCESS_CODE) {
    throw new ProfileError(result.o_code === DB_INTERNAL_ERROR_CODE ? rejected : result.o_message.trim() || rejected);
  }
}

type ProfileColumn = keyof ProfileRow;

function text(row: ProfileRow, column: ProfileColumn): string {
  return row[column].trim();
}

function digits(row: ProfileRow, column: ProfileColumn): string {
  return text(row, column).replace(/\D/g, '');
}

/**
 * `<calling code>-<number>`, as `ophonenumber`, `ofax` and `oaddressphone`
 * arrive (`212-` when only the code is stored), split into digits.
 * TODO(schema-unverified): the format is read from the values, not a backend
 * definition; confirm it against guide §10.
 */
function splitDialNumber(value: string): { dial: string; number: string } {
  const [dial, ...rest] = value.split('-');
  return { dial: digitsOnly(dial), number: digitsOnly(rest.join('')) };
}

/** A calling code with no number is noise, so the country is kept only alongside one. */
function intlPhone(value: string, ext: string): PhoneValue {
  const { dial, number } = splitDialNumber(value);
  if (!number) return { country: null, number: '', ext: '' };
  return { country: findCountryByDial(dial)?.code ?? null, number, ext };
}

/** "10-SEP-26" (DD-MON-YY, local day; guide §10) → Date, or `null` when unreadable. */
function parseDayMonthYear(value: string): Date | null {
  const match = /^(\d{1,2})-([A-Z]{3})-(\d{2})$/i.exec(value);
  if (!match) return null;
  const month = MONTHS_SHORT.findIndex((name) => name.toUpperCase() === match[2].toUpperCase());
  if (month < 0) return null;
  const date = new Date(2000 + Number(match[3]), month, Number(match[1]));
  return Number.isNaN(date.getTime()) ? null : date;
}
