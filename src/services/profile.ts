import type { PersonalInfoValue } from '@/components/profile/PersonalInfoSection';
import type { PhoneValue } from '@/components/ui/PhoneField';
import { DB_SUCCESS_CODE } from '@/constants/actionCodes';
import { PROFILE_MESSAGES } from '@/constants/messages';
import { GatewayError, type GatewayJData, type GatewayResponse, mapRows } from '@/services/gateway';
import { findCountryByDial, toIntlDigits } from '@/utils/phone';

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
};

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
  };
}

/**
 * `PROF.U.PROFILE` parameters the Personal Info panel does not edit, in
 * contract order. The procedure replaces the whole profile, so each is sent
 * back as `PROF.S.LOAD_PROFILE` returned it — the column named like the
 * parameter without its `P_` prefix (`P_CC_YEAR` → `cc_year`), or '' when
 * the profile does not carry it.
 */
const PASSTHROUGH_PARAMS = [
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

function passthrough(row: ProfileRow, param: string): string {
  return text(row, param.slice('P_'.length).toLowerCase());
}

/**
 * `JData` for {@link ACTION_CODES.UPDATE_PROFILE}: the edited personal info
 * on top of the loaded `row`, so everything else is saved unchanged. The
 * session holds no password; `P_PASSWORD` is passed through like the rest.
 */
export function updateProfileJData(
  loginId: string,
  row: ProfileRow,
  personal: PersonalInfoValue,
): GatewayJData {
  return {
    P_LOGIN_ID: loginId,
    P_PASSWORD: passthrough(row, 'P_PASSWORD'),
    P_FIRST_NAME: personal.firstName.trim(),
    P_LAST_NAME: personal.lastName.trim(),
    P_PHONE_NUMBER: toIntlDigits(personal.intlPhone),
    P_PHONE_EXT: personal.intlPhone.number ? personal.intlPhone.ext : '',
    P_PHONE_NUMBER_US: personal.usPhone.number,
    P_PHONE_EXT_US: personal.usPhone.number ? personal.usPhone.ext : '',
    // The contract has no fax extension parameter.
    P_FAX: toIntlDigits(personal.fax),
    ...Object.fromEntries(PASSTHROUGH_PARAMS.map((param) => [param, passthrough(row, param)])),
  };
}

/** Throws unless the update's first row carries `o_code` "0". A missing code fails closed. */
export function assertProfileUpdated(response: GatewayResponse): void {
  const result = mapRows(response)[0];
  if (!result || !('o_code' in result)) {
    throw new GatewayError('parsing', 'The profile update response has no result code.');
  }
  if (result.o_code !== DB_SUCCESS_CODE) {
    throw new ProfileError(result.o_message || PROFILE_MESSAGES.UPDATE_REJECTED);
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
