/**
 * Field length limits, from the legacy forms' `maxlength` attributes and
 * scripts (reverse-engineer-guide/26 §5, §6, §11). Validators and inputs both
 * read them here, so a limit changes in one place.
 *
 * `*_MIN` values are validation minimums; everything else is a maximum.
 */
export const FIELD_LIMITS = {
  EMAIL: 50,
  PASSWORD_MIN: 4,
  PASSWORD: 10,
  FIRST_NAME: 15,
  LAST_NAME_MIN: 2,
  LAST_NAME: 20,

  /** US phone, area code included — exactly this many digits. */
  US_PHONE: 10,
  EXTENSION: 5,
  /** Shortest local part of an international number. */
  INTL_NUMBER_MIN: 4,
  /** Shortest country + city code and number together. */
  INTL_TOTAL_MIN: 7,

  ZIP: 5,
  BUILDING_NO: 6,
  STREET_MIN: 4,
  STREET: 30,
  /** `StreetName2` on the mailing address. */
  MAILING_CROSS_STREET: 20,
  CITY: 30,
  UNIT: 30,
  PICKUP_POINT: 20,
  LANDMARK: 60,
  DIRECTIONS: 500,

  CARD_HOLDER_MIN: 2,
  CARD_HOLDER: 30,
  COMPANY_NAME: 50,
  VIP_NUMBER: 10,
  /** Account number at registration (`CompanyAccountNo`). */
  REGISTRATION_ACCOUNT_NO: 10,
  /** Account number when booking. */
  BOOKING_ACCOUNT_NO: 16,
  REQUIREMENT_ANSWER: 30,

  CC_EMAILS: 500,
  RIDE_PURPOSE: 50,
  FLIGHT_NUMBER: 20,
  CANCEL_REASON: 50,
  QUESTION_MESSAGE: 200,
} as const;

/** How far ahead a ride can be booked (guide 26 §4, §11). */
export const BOOKING_HORIZON_DAYS = 90;
