/**
 * API gateway action codes and the fixed parts of the gateway protocol.
 *
 * Every action code the app sends lives here — services import the constant
 * rather than spelling the string. Source of truth: docs/XYZ Action Codes.md.
 */

export const ACTION_CODES = {
  /** P_LOGIN_ID, P_PASSWORD → o_code / o_message. */
  CHECK_LOGIN_CREDENTIALS: 'PROF.S.CHECK_LOGIN_CREDENTIALS',
  /** P_LOGIN_ID → one row: login_id, first_name, last_name, …, last_login. */
  LOAD_PROFILE: 'PROF.S.LOAD_PROFILE',
  /** P_LOGIN_ID → sends the password-recovery email; o_code / o_message when returned. */
  PASSWORD_RECOVERY: 'PROF.S.PASSWORD',
  /** P_LOGIN_ID, P_OLD_PASSWORD, P_NEW_PASSWORD → changes the password; o_code / o_message when returned. */
  CHANGE_PASSWORD: 'PROF.U.PASSWORD',
  /** P_LOGIN_ID → o_code / o_message; o_code "0" when no profile uses that login yet. */
  IS_UNIQUE_EMAIL: 'PROF.S.IS_UNIQUE_EMAIL',
  /** P_ACCOUNT_NUM, P_COMPANY_NAME → o_code / o_message; "0" when the name matches the account. */
  IS_VALID_COMPANY_NAME: 'PROF.S.IS_VALID_COMPANY_NAME',
  /** P_ACCOUNT_NUM, P_VIP_NUM → o_code / o_message; "0" when the VIP number belongs to the account. */
  IS_VALID_VIP: 'PROF.S.IS_VALID_VIP',
  /** P_ACCOUNT_NUM → o_code / o_message (+ undocumented columns): does the account need requirement fields? */
  ACCOUNT_REQUIREMENTS: 'PROF.S.ACCOUNT_REQUIREMENTS',
  /** P_ACCOUNT_NUM → one row per requirement field (columns undocumented), o_code / o_message when returned. */
  ACCOUNT_REQUIREMENTS_RS: 'PROF.S.ACCOUNT_REQUIREMENTS_RS',
  /** The whole new profile (41 P_* parameters) → o_code / o_message. */
  CREATE_PROFILE: 'PROF.I.PROFILE',
} as const;

export type ActionCode = (typeof ACTION_CODES)[keyof typeof ACTION_CODES];

/** The gateway routes on ActionCode; every code is sent under this view. */
export const GATEWAY_VIEW_NAME = 'LOGIN';

/** Fixed `Notes` value the gateway contract expects on every envelope. */
export const GATEWAY_NOTES = 'Test Notes ...';

/** `JHeader.ActionCode` on a response the gateway parsed and executed. */
export const GATEWAY_SUCCESS_CODE = 0;

/** `o_code` a DB procedure returns when the operation itself succeeded. */
export const DB_SUCCESS_CODE = '0';

/**
 * JData coordinate pairs the JHeader GPS fields are taken from, in priority
 * order, when the request itself carries a location (docs/XYZ_INTEGRATION_GUIDE.md §3).
 */
export const JDATA_GPS_KEYS: readonly { latitude: string; longitude: string }[] = [
  { latitude: 'P_PICKUP_LAT', longitude: 'P_PICKUP_LON' },
  { latitude: 'P_LAT', longitude: 'P_LON' },
];

/** JData keys copied into JHeader.GPSSpeed / GPSBearing when present. */
export const JDATA_GPS_SPEED_KEY = 'P_GPS_SPEED';
export const JDATA_GPS_BEARING_KEY = 'P_GPS_BEARING';

