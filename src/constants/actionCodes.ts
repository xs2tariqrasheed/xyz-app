/**
 * API gateway action codes and the fixed parts of the gateway protocol.
 *
 * Every action code the app sends lives here — services import the constant
 * rather than spelling the string. Source of truth: docs/XYZ Action Codes.md.
 */

export const ACTION_CODES = {
  /** P_LOGIN_ID, P_PASSWORD → o_code / o_message (o_message = the profile's VIP number on success). */
  CHECK_LOGIN_CREDENTIALS: 'PROF.S.CHECK_LOGIN_CREDENTIALS',
  /** P_LOGIN_ID → one row of 44 headings (ologinid, ofirstname, …, oelastlogindate; guide §10). */
  LOAD_PROFILE: 'PROF.S.LOAD_PROFILE',
  /** The whole profile (38 P_* parameters, all required: name, phones, fax, address, card, prefs) → o_code / o_message ("0" Success, "9" DB error). */
  UPDATE_PROFILE: 'PROF.U.PROFILE',
  /** P_LOGIN_ID → sends the password-recovery email; o_code / o_message when returned. */
  PASSWORD_RECOVERY: 'PROF.S.PASSWORD',
  /** P_LOGIN_ID, P_OLD_PASSWORD, P_NEW_PASSWORD → o_code / o_message ("0" Changed, "1" Invalid info). */
  CHANGE_PASSWORD: 'PROF.U.PASSWORD',
  /** P_LOGIN_ID → o_code / o_message; o_code "0" when no profile uses that login yet. */
  IS_UNIQUE_EMAIL: 'PROF.S.IS_UNIQUE_EMAIL',
  /** P_ACCOUNT_NUM, P_COMPANY_NAME → o_code / o_message; "0" when the name matches the account. */
  IS_VALID_COMPANY_NAME: 'PROF.S.IS_VALID_COMPANY_NAME',
  /** P_ACCOUNT_NUM, P_VIP_NUM → o_code / o_message; "0" when the VIP number belongs to the account. */
  IS_VALID_VIP: 'PROF.S.IS_VALID_VIP',
  /** P_ACCOUNT_NUM → o_code / o_message (+ undocumented columns): does the account need requirement fields? */
  ACCOUNT_REQUIREMENTS: 'PROF.S.ACCOUNT_REQUIREMENTS',
  /** P_ACCOUNT_NUM → one row per requirement field; a lone `dummy` heading means none (guide §10). */
  ACCOUNT_REQUIREMENTS_RS: 'PROF.S.ACCOUNT_REQUIREMENTS_RS',
  /** The whole new profile (41 P_* parameters) → o_code / o_message. */
  CREATE_PROFILE: 'PROF.I.PROFILE',

  // ── Reservation flow: lookups (reverse-engineer-implemented/guide/05) ──────────────────
  /** P_LOGIN_ID → saved addresses: 17 headings (ocountry … oelastservicedate), read by heading (guide §10). */
  USER_ADDRESSES: 'PROF.S.USER_ADDRESSES',
  /** P_LOGIN_ID → the profile's frequent pickup places (ocountry … oelastservicedate; guide §10). */
  USER_PROFILE_ADDRESSES: 'PROF.S.USER_PROFILE_ADDRESSES',
  /** P_ACCOUNT_NUM → the company's own locations: the 17-column address record. */
  CORPORATE_ADDRESSES: 'PROF.S.CORPORATE_ADDRESSES',
  /** P_LOGIN_ID, P_COLUMN_ID (contact type) → ocolumnid, ocolumnvalue: the profile's contacts of that type. */
  PROFILE_COLUMN_VALUES_BY_TYPE: 'PROF.S.PROFILE_COLUMN_VALUES_BY_TYPE',

  // ── Address book & contacts (reverse-engineer-implemented/guide/11, 12) ────────────────
  /** P_LOGIN_ID, P_COUNTRY, P_STATE, P_CITY, P_STREET_NUM, P_STREET_NAME, P_CROSS_STREET, P_PICKUP_POINT, P_ZIP, P_DIRECTIONS, P_PHONE_NUM, P_EXT, P_PHONE_NUM_US, P_EXT_US → o_code / o_message. */
  ADD_USER_ADDRESS: 'PROF.I.USER_ADDRESS',
  /** P_LOGIN_ID, P_PICKUP_COUNT + the same fields as ADD_USER_ADDRESS → o_code / o_message. */
  UPDATE_USER_ADDRESS: 'PROF.U.USER_ADDRESS',
  /** P_LOGIN_ID, P_PICKUP_COUNT → o_code / o_message. */
  DELETE_USER_ADDRESS: 'PROF.D.USER_ADDRESS',
  /** P_LOGIN_ID → ocolumnid, ocolumnvalue: every extra value on the profile (contacts and others), one row each. */
  PROFILE_COLUMN_VALUES: 'PROF.S.PROFILE_COLUMN_VALUES',
  /** P_LOGIN_ID, P_COLUMN_ID, P_COLUMN_VALUE → o_code / o_message. */
  ADD_PROFILE_COLUMN_VALUE: 'PROF.I.PROFILE_COLUMN_VALUE',
  /** P_LOGIN_ID, P_COLUMN_ID, P_COLUMN_VALUE_OLD, P_COLUMN_VALUE_NEW → o_code / o_message. */
  UPDATE_PROFILE_COLUMN_VALUE: 'PROF.U.PROFILE_COLUMN_VALUE',
  /** P_LOGIN_ID, P_COLUMN_ID, P_COLUMN_VALUE → o_code / o_message. */
  DELETE_PROFILE_COLUMN_VALUE: 'PROF.D.PROFILE_COLUMN_VALUE',
  /** P_STREET_NUM, P_STREET_NAME, P_CITY_NAME, P_COUNTY_NAME, P_STATE_NAME, P_AIRPORT_NAME, P_LANDMARK_NAME, P_PU_DO_TYPE → zone; o_code / o_message. */
  ZONE_THE_LOCATION: 'RES.S.ZONE_THE_LOCATION',
  /** P_LAT, P_LON, P_ZIP → zone of a Google-searched place; o_code / o_message. */
  GOOGLE_ZONE_NUM: 'RES.S.GOOGLE_ZONE_NUM',
  /** No parameters → car types: car_type, car_type_name, max_passengers, max_luggage, description. */
  VEHICLE_TYPE: 'RES.S.VEHICLE_TYPE',

  // ── Booking wizard (guides 13–17) ──────────────────────────────────────────
  /** P_LOGIN_ID_TO → ologinid, ofirstname, olastname, ophonenumberus, ophoneextus, oaccountnum, ovipnum: profiles that let this login book for them. */
  PROFILE_WHO_GRANTED_ACCESS: 'PROF.S.PROFILE_WHO_GRANTED_ACCESS',
  /** P_ACCOUNT_NUM → which billing methods the account allows; o_code / o_message. */
  BILLING_METHOD: 'RES.S.BILLING_METHOD',
  /** P_LOGIN_ID, P_ACCOUNT_NUM, P_VIP_NUM → paccountnum, pvipnum: the account and VIP number on file. */
  ACCOUNT_VIP_NUM: 'PROF.S.ACCOUNT_VIP_NUM',
  /** P_ACCOUNT_NUM → o_code / o_message: is the account tied to a specific credit card? */
  IS_CREDIT_CARD_SPECIFIC_ACCOUNT: 'RES.S.IS_CREDIT_CARD_SPECIFIC_ACCOUNT',
  /** P_ACCOUNT_NUM, P_REQUIREMENT_NUM (1–4) → that requirement field's definition / values. */
  ACCOUNT_REQUIREMENTS_LIST: 'RES.S.ACCOUNT_REQUIREMENTS_LIST',
  /** P_ACCOUNT_NUMBER, P_VIP_NUMBER, P_IS_RES, P_ACCOUNT_REQUIREMENT1–4 → o_code / o_message. */
  VERIFY_ACCOUNT_REQUIREMENTS: 'RES.S.VERIFY_ACCOUNT_REQUIREMENTS',
  /** P_LOGIN_ID, P_CARD_TYPE, P_CARD_HOLDER_NAME, P_CARD_NUMBER, P_EXPIRATION_DATE, P_VERIFY_CODE → authorisation request; o_code / o_message. */
  START_CREDIT_CARD_APPROVAL: 'RES.I.CREDIT_CARD_APPROVAL',
  /** P_LOGIN_ID, P_REQUEST_NUM → the authorisation's outcome; o_code / o_message. */
  CHECK_CREDIT_CARD_APPROVAL: 'RES.S.CREDIT_CARD_APPROVAL',
  /** The whole booking (80 P_* parameters) → o_code / o_message (+ reservation number when returned). */
  CREATE_RESERVATION: 'RES.I.RESERVATION',
  /** P_RESERVATION_NUM + the whole booking + the *_OLD values → o_code / o_message. */
  UPDATE_RESERVATION: 'RES.U.RESERVATION',
  /** P_RES1, pickup / drop-off / payment fields, P_EMAILADDRESS, … → sends the confirmation e-mail; o_code / o_message. */
  FORMAT_EMAIL_MESSAGE: 'RES.U.FORMAT_EMAIL_MESSAGE',

  // ── Reservation records (guides 18–24) ─────────────────────────────────────
  /** P_LOGIN_ID, P_DATE_FROM, P_DATE_TO (MM-DD-YYYY), P_TOTAL_RECORDS → ride history rows (112 headings; guide §10). */
  ALL_ORDERS: 'RES.S.ALL_ORDERS',
  /** P_LOGIN_ID → open reservations that can still be changed or cancelled. */
  UPDATABLE_ORDERS: 'RES.S.UPDATABLE_ORDERS',
  /** P_LOGIN_ID, P_RESERVATION_NUM → one reservation record. */
  LOAD_RESERVATION: 'RES.S.LOAD_RESERVATION',
  /** P_LOGIN_ID, P_RESERVATION_NUM, P_CANCEL_REASON → o_code / o_message. */
  CANCEL_RESERVATION: 'RES.U.CANCEL_RESERVATION',
  /** P_CAR_NUM → driver_1st, color, make, model, model_year, …: the car and its driver (guide §10). */
  CAR_INFO: 'PROF.S.CAR_INFO',
  /** P_LOGIN_ID, P_RESERVATION_NUM → messages and confirmations sent for the ride. */
  COMMUNICATION_LOG: 'RES.S.COMMUNICATION_LOG',
  /** P_RESERVATION_NUM → the car's logged route: status, date, time, latitude, longitude. */
  VEHICLE_LOG: 'RES.S.VEHICLE_LOG',
  /** P_CAR_NUM → o_Latitude / o_Longitude: where the car is now. */
  CAR_POSITION: 'RES.S.LATITUDE_LONGITUDE_FOR_CAR',
  /** No parameters → the questions a rider can ask about a ride. */
  ALL_PREDEFINED_QUESTIONS: 'RES.S.ALL_PREDEFINED_QUESTIONS',
  /** P_LOGIN_ID, P_RESERVATION_NUM, P_QUESTION_ID, P_ADDITIONAL_MESSAGE → o_code / o_message. */
  ASK_QUESTION: 'RES.I.ASKED_QUESTIONS',
  /** P_RESERVATION_NUM, P_COLUMN_ID → o_ColumnValue: one extra value stored on the reservation. */
  LOAD_RESERVATION_COLUMN_SINGLE_VALUE: 'RES.S.LOAD_RESERVATION_COLUMN_SINGLE_VALUE',
  /** P_RESERVATION_NUM, P_COLUMN_ID → every extra value of that type on the reservation. */
  LOAD_RESERVATION_COLUMN_VALUES_BY_TYPE: 'RES.S.LOAD_RESERVATION_COLUMN_VALUES_BY_TYPE',
  /** P_RESERVATION_NUM, P_COLUMN_ID, P_COLUMN_VALUE → o_code / o_message. */
  ADD_RESERVATION_COLUMN_VALUE: 'RES.I.RESERVATION_COLUMN_VALUE',
  /** P_RESERVATION_NUM, P_COLUMN_ID, P_COLUMN_VALUE_OLD, P_COLUMN_VALUE_NEW → o_code / o_message. */
  UPDATE_RESERVATION_COLUMN_VALUE: 'RES.U.RESERVATION_COLUMN_VALUE',
  /** P_RESERVATION_NUM, P_COLUMN_ID, P_COLUMN_VALUE → o_code / o_message. */
  DELETE_RESERVATION_COLUMN_VALUE: 'RES.D.RESERVATION_COLUMN_VALUE',
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

/** `o_code` a DB procedure returns for an internal database error; its `o_message` is raw Oracle text (guide §10). */
export const DB_INTERNAL_ERROR_CODE = '9';

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

