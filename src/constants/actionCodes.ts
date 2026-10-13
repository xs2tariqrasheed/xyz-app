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
 * order, when the request itself carries a location (docs/DM.md §4).
 */
export const JDATA_GPS_KEYS: readonly { latitude: string; longitude: string }[] = [
  { latitude: 'P_PICKUP_LAT', longitude: 'P_PICKUP_LON' },
  { latitude: 'P_LAT', longitude: 'P_LON' },
];

/** JData keys copied into JHeader.GPSSpeed / GPSBearing when present. */
export const JDATA_GPS_SPEED_KEY = 'P_GPS_SPEED';
export const JDATA_GPS_BEARING_KEY = 'P_GPS_BEARING';

