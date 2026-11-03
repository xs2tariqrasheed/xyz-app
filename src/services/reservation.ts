import type { BillingMethodId, BillingMethodValue } from '@/components/reservation/BillingMethodSection';
import type { PassengerRideInfoValue } from '@/components/reservation/PassengerRideInfoSection';
import type { PreferencesValue } from '@/components/reservation/PreferencesSection';
import {
  type AirportDetails,
  type AirportPickupOption,
  emptyLeg,
  type LegDetails,
  type RideAddressInfoValue,
} from '@/components/reservation/RideAddressInfoSection';
import type { PhoneValue } from '@/components/ui/PhoneField';
import { DB_SUCCESS_CODE } from '@/constants/actionCodes';
import { CHARGE_LABELS, COMMON_MESSAGES, RESERVATION_MESSAGES, RIDES_MESSAGES } from '@/constants/messages';
import { cardTypeCode, contractExpiry, requirementParams } from '@/services/billing';
import { type GatewayJData, type GatewayResponse, mapRowsByHeadings } from '@/services/gateway';
import {
  assertResultCode,
  parseDayMonthYear,
  parseGatewayDate,
  readRecords,
  readResult,
} from '@/services/gatewayRows';
import {
  EMPTY_PLACE,
  type AddressSuggestion,
  type PlaceKind,
  type StructuredPlace,
  toCountryCode,
  toSuggestion,
} from '@/services/places';
import { ORDER_HEADINGS, PAYMENT_METHOD_LABELS, type PaymentMethod, type RideStatus, toPaymentMethod, toRideStatus } from '@/services/rides';
import { IDLE_ZONE } from '@/services/zones';
import { addDays, nextSlot, pad2, startOfDay, type TimeValue } from '@/utils/datetime';
import { digitsOnly } from '@/utils/payment';
import { findCountryByDial, toIntlDigits } from '@/utils/phone';

/**
 * A reservation in both directions (reverse-engineer-implemented/guide/13–20):
 *
 * - the wizard's draft → `RES.I.RESERVATION` / `RES.U.RESERVATION` JData;
 * - a `RES.S.LOAD_RESERVATION` row → {@link ReservationRecord} for the details,
 *   voucher, edit, return-trip and repeat screens.
 *
 * Every contract parameter is always sent, '' where the booking has no value,
 * so the procedure never sees a partial envelope.
 */

/** Thrown when the server refuses a booking, an update or a cancel. */
export class ReservationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReservationError';
  }
}

/**
 * `RES.I.RESERVATION` answered `"5"`: a booking with the same details already
 * exists, and nothing new was created (guide §10, the old site's
 * `isduplicate`). Carries that booking's number, or `null` when none came back.
 */
export class DuplicateReservationError extends ReservationError {
  constructor(
    message: string,
    readonly reservationNumber: string | null,
  ) {
    super(message);
    this.name = 'DuplicateReservationError';
  }
}

/** The four answers the wizard collects; the preview and receipt read them back. */
export type ReservationDraft = {
  info: PassengerRideInfoValue;
  addresses: RideAddressInfoValue;
  billing: BillingMethodValue;
  preferences: PreferencesValue;
};

/**
 * - `new` — a fresh booking (also express checkout);
 * - `edit` — changes to an open reservation, saved with `RES.U.RESERVATION`;
 * - `return` / `repeat` — a new booking copied from a past ride, legs swapped
 *   for a return (guide 22); booked with `RES.I.RESERVATION` like any other.
 */
export type DraftMode = 'new' | 'edit' | 'return' | 'repeat';

// ── Value codes ────────────────────────────────────────────────────────────
// Each is set here only. Read from the rides the gateway stores
// (`RES.S.ALL_ORDERS` / `LOAD_RESERVATION`, guide §10) and the backend test
// client's samples; the contract's own samples (`A`, `CC`, `EMAIL`, `WEB`) are
// not what the gateway takes.

/**
 * `P_PU_TYPE` / `P_DO_TYPE` (and `oputype` / `odotype`): stored rides use `1`
 * for a street address, `2` with an airport name and `3` with a landmark name.
 */
export const PLACE_TYPE_CODES: Record<PlaceKind, string> = { address: '1', airport: '2', landmark: '3' };

/**
 * `P_PAYMENT_METHOD`, numbered as `RES.S.BILLING_METHOD`'s account types:
 * `1` Corporate Account (the test client's sample), `2` Credit Card With
 * Corporate Account.
 * TODO(schema-unverified): assumed card only is `3`; stored rides also carry `3` on an account. Confirm against guide §10
 */
export const PAYMENT_METHOD_CODES: Record<BillingMethodId, string> = {
  corporate: '1',
  'corporate-card': '2',
  card: '3',
};

/**
 * `P_RESERVATION_MAKE_FOR`: stored rides booked by the customer for themself carry `1`.
 * TODO(schema-unverified): assumed a booking for someone who granted access is `2`; confirm against guide §10
 */
export const MAKE_FOR_CODES = { self: '1', other: '2' } as const;

/**
 * `P_CONFIRMATION_METHOD`: `ML` (e-mail) as the test client sends it; stored
 * rides with a phone callback (`oneedphone` `Y`) carry `SND`.
 * TODO(schema-unverified): assumed SND is "confirm by phone"; confirm against guide §10
 */
export const RESERVATION_CONFIRMATION_CODES = { email: 'ML', phone: 'SND' } as const;

/** `P_CALL_SOURCE`, as the backend test client sends it. */
export const CALL_SOURCE = 'W';

/**
 * `P_PU_ADDRESS_ADD` / `P_DO_ADDRESS_ADD`: every stored ride and the test
 * client carry `N`, a flag rather than the contract's "Suite 200".
 * TODO(schema-unverified): assumed N leaves the address book alone; confirm against guide §10
 */
export const ADDRESS_ADD_CODE = 'N';

/**
 * `P_COLUMN_ID`s of the extra values stored on a reservation. They follow the
 * profile's contact types (guide 01: 8 = Email); the Email CC list is kept
 * here, one value per address, because `P_CC_EMAIL` holds a single string.
 */
export const RESERVATION_COLUMN_IDS = { emailCc: 8 } as const;

/** Airport pickup options (guide 01): C outside, D inside / meet & greet, B on demand, A standby. */
export const AIRPORT_PICKUP_OPTIONS: readonly { value: AirportPickupOption; label: string }[] = [
  { value: 'C', label: RESERVATION_MESSAGES.PICKUP_OPTION_OUTSIDE },
  { value: 'D', label: RESERVATION_MESSAGES.PICKUP_OPTION_INSIDE },
  { value: 'B', label: RESERVATION_MESSAGES.PICKUP_OPTION_ON_DEMAND },
  { value: 'A', label: RESERVATION_MESSAGES.PICKUP_OPTION_STANDBY },
];

/** How soon express checkout promises a car (guide 06, `hfNextReservation`). */
export const EXPRESS_DISPATCH_MINUTES = 15;

/** Longest a cancel reason may be (guide 19). */
export const CANCEL_REASON_MAX = 50;

// ── Date and time ──────────────────────────────────────────────────────────

/** `P_RESERVATION_DATE`: `MM/DD/YYYY`. */
export function contractDate(date: Date): string {
  return `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}/${date.getFullYear()}`;
}

/**
 * `P_RESERVATION_TIME`: 12-hour `hh:mm AM|PM`, as the test client's update
 * sends it ("11:35 AM"). A 24-hour "14:30" is refused with
 * `ORA-01849: hour must be between 1 and 12` (guide §10).
 */
export function contractTime(time: TimeValue): string {
  const hour = time.hour % 12 === 0 ? 12 : time.hour % 12;
  return `${pad2(hour)}:${pad2(time.minute)} ${time.meridiem}`;
}

/** When the ride is wanted: the chosen slot, or right now for a live call. */
export function pickupMoment(info: PassengerRideInfoValue, now: Date): { date: string; time: string } {
  if (info.isLive) {
    const hours = now.getHours();
    return {
      date: contractDate(now),
      time: contractTime({ hour: hours % 12 || 12, minute: now.getMinutes(), meridiem: hours < 12 ? 'AM' : 'PM' }),
    };
  }
  return { date: contractDate(info.date), time: contractTime(info.time) };
}

// ── Draft → JData ──────────────────────────────────────────────────────────

/** Comma-separated CC list → trimmed addresses, blanks dropped. */
export function ccEmailList(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((email) => email.trim())
    .filter(Boolean);
}

function phoneParams(us: PhoneValue, intl: PhoneValue): GatewayJData {
  return {
    P_PHONE_NUMBER: toIntlDigits(intl),
    P_PHONE_EXT: intl.number ? intl.ext : '',
    P_PHONE_NUMBER_US: us.number,
    P_PHONE_EXT_US: us.number ? us.ext : '',
  };
}

/** The P_PU_* parameters of a leg. */
function pickupParams(place: StructuredPlace | null, leg: LegDetails, notes: string): GatewayJData {
  const p = place ?? EMPTY_PLACE;
  const airport = p.kind === 'airport';
  return {
    P_PU_TYPE: place ? PLACE_TYPE_CODES[p.kind] : '',
    P_PU_COUNTRY: p.country,
    P_PU_STATE: p.state,
    P_PU_CITY: p.city,
    P_PU_ZIP_CODE: p.zip,
    P_PU_STREET_NUMBER: p.streetNumber,
    P_PU_STREET_NAME: p.streetName,
    P_PU_CROSS_STREET: p.crossStreet,
    P_PU_CROSS_STREET2: '',
    P_PU_POINT: p.pickupPoint,
    P_PU_DIRECTIONS: notes.trim(),
    P_PU_ADDRESS_ADD: place ? ADDRESS_ADD_CODE : '',
    P_PU_AIRPORT_NAME: airport ? p.airportName : '',
    P_PU_AIRLINE_NAME: airport ? leg.airport.airline.trim() : '',
    P_PU_FLIGHT_NUMBER: airport ? leg.airport.flightNumber.trim() : '',
    P_PU_FLIGHT_ARRIVING_FROM: airport ? leg.airport.arrivingFrom.trim() : '',
    P_PU_AIRPORT_OPTION: airport ? leg.airport.pickupOption : '',
    P_PU_LANDMARK_NAME: p.kind === 'landmark' ? p.landmarkName : '',
  };
}

/** The P_DO_* parameters of a leg. */
function dropoffParams(place: StructuredPlace | null, leg: LegDetails, notes: string): GatewayJData {
  const p = place ?? EMPTY_PLACE;
  const airport = p.kind === 'airport';
  return {
    P_DO_TYPE: place ? PLACE_TYPE_CODES[p.kind] : '',
    P_DO_COUNTRY: p.country,
    P_DO_STATE: p.state,
    P_DO_CITY: p.city,
    P_DO_ZIP_CODE: p.zip,
    P_DO_STREET_NUMBER: p.streetNumber,
    P_DO_STREET_NAME: p.streetName,
    P_DO_CROSS_STREET: p.crossStreet,
    P_DO_CROSS_STREET2: '',
    P_DO_DIRECTIONS: notes.trim(),
    P_DO_ADDRESS_ADD: place ? ADDRESS_ADD_CODE : '',
    P_DO_AIRPORT_NAME: airport ? p.airportName : '',
    P_DO_AIRLINE_NAME: airport ? leg.airport.airline.trim() : '',
    P_DO_FLIGHT_NUMBER: airport ? leg.airport.flightNumber.trim() : '',
    P_DO_TERMINAL_NUMBER: airport ? leg.airport.terminal.trim() : '',
    P_DO_FLIGHT_DESTINATION_CITY: airport ? leg.airport.flyingTo.trim() : '',
    P_DO_LANDMARK_NAME: p.kind === 'landmark' ? p.landmarkName : '',
  };
}

const paysByAccount = (method: BillingMethodId) => method !== 'card';
const paysByCard = (method: BillingMethodId) => method !== 'corporate';

/**
 * `P_CARD_NUMBER`. A card typed in this session goes out as digits; an edit
 * that leaves the card on file untouched sends the masked number the record
 * came with, which the old site read as "unchanged" (guide 16).
 */
function cardNumberParam(billing: BillingMethodValue): string {
  const typed = digitsOnly(billing.card.number);
  return typed.length > 0 ? typed : billing.cardOnFile;
}

/** The payment parameters, identical in the create and update calls. */
function paymentParams(billing: BillingMethodValue): GatewayJData {
  const account = paysByAccount(billing.method);
  const card = paysByCard(billing.method);
  const typedCard = digitsOnly(billing.card.number).length > 0;
  return {
    P_PAYMENT_METHOD: PAYMENT_METHOD_CODES[billing.method],
    P_ACCOUNT_NUMBER: account ? billing.accountNumber.trim() : '',
    ...(account
      ? requirementParams(billing, 'P_ACCOUNT_REQUIREMENT')
      : { P_ACCOUNT_REQUIREMENT1: '', P_ACCOUNT_REQUIREMENT2: '', P_ACCOUNT_REQUIREMENT3: '', P_ACCOUNT_REQUIREMENT4: '' }),
    P_CARD_TYPE: card ? (typedCard ? cardTypeCode(billing.card.number) : billing.cardTypeOnFile) : '',
    P_CARD_HOLDER_NAME: card ? billing.card.holder.trim() : '',
    P_CARD_NUMBER: card ? cardNumberParam(billing) : '',
    P_VERIFY_CODE: card ? digitsOnly(billing.card.cvv) : '',
    P_EXPIRATION_DATE: card ? contractExpiry(billing.card.expiry) : '',
    P_APPROVAL_NUM: card ? billing.approvalNumber : '',
  };
}

type BookingContext = {
  loginId: string;
  /** When the booking is sent; a live call is booked for this moment. */
  now: Date;
  /** The profile's car preferences (`P_FLEET_NAME`, `P_CAR_YEAR`, `P_SMOKING_ALLOWED`). */
  carPreferences?: { fleetName: string; carYear: string; smokingAllowed: string };
};

/**
 * Parameters shared, in contract order, by the create and update calls —
 * everything except the reservation number, the call source and the *_OLD values.
 */
function bookingParams(draft: ReservationDraft, { loginId, now, carPreferences }: BookingContext) {
  const { info, addresses, billing, preferences } = draft;
  const when = pickupMoment(info, now);
  const pickup = addresses.pickupLeg;
  const destination = addresses.destinationLeg;
  const bookingFor = info.bookingFor.trim();

  return {
    head: {
      P_LOGIN_ID: loginId,
      P_FIRST_NAME: info.firstName.trim(),
      P_LAST_NAME: info.lastName.trim(),
      P_RESERVATION_DATE: when.date,
      P_RESERVATION_TIME: when.time,
      ...pickupParams(pickup.place, pickup, addresses.pickupNotes),
      ...dropoffParams(destination.place, destination, addresses.destinationNotes),
      ...paymentParams(billing),
      P_FLEET_NAME: carPreferences?.fleetName ?? '',
      P_CONFIRMATION_METHOD: preferences.confirmByPhone ? RESERVATION_CONFIRMATION_CODES.phone : RESERVATION_CONFIRMATION_CODES.email,
      ...phoneParams(preferences.callbackUs, preferences.callbackIntl),
      P_EMAIL: preferences.email.trim(),
      P_NEED_PHONE: preferences.confirmByPhone ? 'Y' : 'N',
      P_CAR_TYPE: preferences.carType,
      P_CAR_YEAR: carPreferences?.carYear ?? '',
      P_NUMBER_OF_PASSENGERS: String(preferences.passengers),
      P_NUMBER_OF_STOPS: String(preferences.stops),
      P_SMOKING_ALLOWED: carPreferences?.smokingAllowed === 'Y' ? 'Y' : 'N',
    },
    makeFor: bookingFor ? MAKE_FOR_CODES.other : MAKE_FOR_CODES.self,
    ridePurpose: preferences.ridePurpose.trim(),
    ccEmail: ccEmailList(preferences.ccEmails).join(','),
    loginIdMakeFor: bookingFor || loginId,
    tail: {
      P_BILLING_ZIP_CODE: paysByCard(billing.method) ? billing.card.postalCode.trim() : '',
      P_PICKUP_LAT: pickup.place?.latitude ?? '',
      P_PICKUP_LON: pickup.place?.longitude ?? '',
      P_DROPOFF_LAT: destination.place?.latitude ?? '',
      P_DROPOFF_LON: destination.place?.longitude ?? '',
      P_PICKUP_ZONE_NUM: pickup.zone.zoneNum,
      P_DROPOFF_ZONE_NUM: destination.zone.zoneNum,
    },
  };
}

/** `JData` for {@link ACTION_CODES.CREATE_RESERVATION} — all 80 contract parameters. */
export function createReservationJData(draft: ReservationDraft, context: BookingContext): GatewayJData {
  const params = bookingParams(draft, context);
  return {
    ...params.head,
    P_CALL_SOURCE: CALL_SOURCE,
    P_RESERVATION_MAKE_FOR: params.makeFor,
    P_RIDE_PURPOSE: params.ridePurpose,
    P_CC_EMAIL: params.ccEmail,
    P_LOGIN_ID_RESERVATION_MAKE_FOR: params.loginIdMakeFor,
    ...params.tail,
  };
}

/**
 * `JData` for {@link ACTION_CODES.UPDATE_RESERVATION}: the edited booking plus
 * the *_OLD values the record was loaded with.
 */
export function updateReservationJData(
  draft: ReservationDraft,
  record: ReservationRecord,
  context: BookingContext,
): GatewayJData {
  const params = bookingParams(draft, context);
  const { P_LOGIN_ID, ...rest } = params.head;
  return {
    P_LOGIN_ID,
    P_RESERVATION_NUM: record.reservationNumber,
    ...rest,
    P_FLEET_NAME: record.preferences.fleetName,
    P_CAR_YEAR: record.preferences.carYear,
    P_SMOKING_ALLOWED: record.preferences.smokingAllowed || rest.P_SMOKING_ALLOWED,
    P_RESERVATION_MAKE_FOR: params.makeFor,
    P_RESERVATION_MAKE_FOR_OLD: record.preferences.makeFor,
    P_RIDE_PURPOSE: params.ridePurpose,
    P_RIDE_PURPOSE_OLD: record.preferences.ridePurpose,
    P_CC_EMAIL: params.ccEmail,
    P_CC_EMAIL_OLD: record.preferences.ccEmail,
    P_LOGIN_ID_RESERVATION_MAKE_FOR: params.loginIdMakeFor,
    P_LOGIN_ID_RESERVATION_MAKE_FOR_OLD: record.preferences.loginIdMakeFor,
    ...params.tail,
  };
}

/** `RES.I.RESERVATION`'s `o_code` when a booking with the same details already exists (guide §10). */
const DUPLICATE_CODE = '5';

/**
 * Throws unless the booking or update was accepted (`o_code` "0"). A new
 * booking answers its reservation number in `o_message` (`W6110231278`,
 * guide §10); `null` when it is empty — a number is never made up. `"5"`
 * throws a {@link DuplicateReservationError} with the existing booking's number.
 * TODO(schema-unverified): assumed RES.U.RESERVATION answers the same; confirm against guide §10
 */
export function assertReservationSaved(response: GatewayResponse): { reservationNumber: string | null } {
  const answer = readResult(response);
  if (answer.code === DUPLICATE_CODE) {
    const existing = answer.message || null;
    throw new DuplicateReservationError(
      existing ? RESERVATION_MESSAGES.BOOK_DUPLICATE(existing) : RESERVATION_MESSAGES.BOOK_DUPLICATE_NO_NUMBER,
      existing,
    );
  }
  const result = assertResultCode(
    response,
    (message) => new ReservationError(message),
    RESERVATION_MESSAGES.BOOK_REJECTED,
  );
  return { reservationNumber: result.message || null };
}

// ── Cancel ─────────────────────────────────────────────────────────────────

/** `JData` for {@link ACTION_CODES.CANCEL_RESERVATION}. */
export function cancelReservationJData(loginId: string, reservationNumber: string, reason: string): GatewayJData {
  return { P_LOGIN_ID: loginId, P_RESERVATION_NUM: reservationNumber, P_CANCEL_REASON: reason.trim() };
}

export function assertCancelled(response: GatewayResponse): void {
  assertResultCode(response, (message) => new ReservationError(message), RIDES_MESSAGES.CANCEL_REJECTED);
}

/** Guide 19: required, 50 characters at most, no quotation marks. */
export function validateCancelReason(reason: string): string | null {
  const trimmed = reason.trim();
  if (!trimmed) return RIDES_MESSAGES.CANCEL_REASON_REQUIRED;
  if (trimmed.length > CANCEL_REASON_MAX || /["]/.test(trimmed)) return RIDES_MESSAGES.CANCEL_REASON_INVALID;
  return null;
}

// ── Load → record ──────────────────────────────────────────────────────────

/** `JData` for {@link ACTION_CODES.LOAD_RESERVATION}. */
export function loadReservationJData(loginId: string, reservationNumber: string): GatewayJData {
  return { P_LOGIN_ID: loginId, P_RESERVATION_NUM: reservationNumber };
}

export type RecordStop = {
  place: StructuredPlace;
  directions: string;
  airport: AirportDetails;
  crossStreet2: string;
};

export type ChargeLine = { label: string; amount: string };

/** One reservation as `RES.S.LOAD_RESERVATION` describes it, renamed for the screens. */
export type ReservationRecord = {
  reservationNumber: string;
  voucherNumber: string;
  status: RideStatus;
  /** The call status as the server spelled it (`oecallstatusdesc`), for display. */
  statusLabel: string;
  firstName: string;
  lastName: string;
  rideAt: Date | null;
  /** The day the reservation was made; the record carries no time for it. */
  originateOn: Date | null;
  operatorName: string;
  pickup: RecordStop;
  /** `null` for an "as directed" ride with no destination. */
  destination: RecordStop | null;
  billing: {
    /** The wizard method the stored payment code reads as; `null` for a code the app doesn't know. */
    method: BillingMethodId | null;
    /** The payment as shown: the method's label, or "not available". */
    paymentLabel: string;
    accountNumber: string;
    vipNumber: string;
    cardType: string;
    /** As the server sent it — already masked; never a full number. */
    cardMasked: string;
    cardHolder: string;
    voucherNumber: string;
    invoiceNumber: string;
    invoicePosted: boolean;
    approvalDate: string;
    transactionDate: string;
    transactionAmount: string;
  };
  driver: { carNumber: string; carColor: string; carModel: string; driverName: string; driverNumber: string };
  preferences: {
    /** `ocartype`, a `RES.S.VEHICLE_TYPE` code. */
    carType: string;
    confirmByPhone: boolean;
    phoneUs: string;
    phoneUsExt: string;
    phoneIntl: string;
    phoneIntlExt: string;
    email: string;
    ccEmail: string;
    /** `null` when the stored value is not a number. */
    passengers: number | null;
    stops: number | null;
    ridePurpose: string;
    makeFor: string;
    loginIdMakeFor: string;
    /** Not edited in the app; an update sends them back as loaded. */
    fleetName: string;
    carYear: string;
    smokingAllowed: string;
  };
  charges: ChargeLine[];
};

/**
 * Pickup / drop-off headings. `LOAD_RESERVATION` sends the order headings
 * (`ORDER_HEADINGS`, `src/services/rides.ts`) plus these (guide §10).
 */
const STOP_HEADINGS = [
  'oputype', 'opucountry', 'opuzipcode', 'opucrossstreet', 'opucrossstreet2', 'opupoint', 'opudirections',
  'opuairlinename', 'opuflightnumber', 'opuflightarrivingfrom', 'opuairportoption',
  'odotype', 'odocountry', 'odozipcode', 'odocrossstreet', 'odocrossstreet2', 'ododirections',
  'odoairlinename', 'odoflightnumber', 'odoterminalnumber', 'odoflightdestinationcity',
  'oepickuplat', 'oepickuplon', 'oedropofflat', 'oedropofflon',
] as const;

/**
 * Charges. `cc*` are the call's charges; `idd*` the posted invoice's, which
 * alone carries a total, read once `oeinvoiceposted` is `Y`.
 * TODO(schema-unverified): assumed idd* is the invoice and cc* the call; confirm against guide §10
 */
const CALL_CHARGES = [
  { label: CHARGE_LABELS.fare, heading: 'ccfare' },
  { label: CHARGE_LABELS.tolls, heading: 'cctolls' },
  { label: CHARGE_LABELS.tips, heading: 'cctips' },
  { label: CHARGE_LABELS.waitingTime, heading: 'ccwaitingamount' },
  { label: CHARGE_LABELS.stops, heading: 'ccstops' },
  { label: CHARGE_LABELS.stopWaitingTime, heading: 'ccstopwaitingamount' },
  { label: CHARGE_LABELS.serviceCharge, heading: 'ccservicecharge' },
  { label: CHARGE_LABELS.phoneUsage, heading: 'ccphone' },
  { label: CHARGE_LABELS.package, heading: 'ccpackage' },
  { label: CHARGE_LABELS.additionalPassenger, heading: 'ccadditonalpassenger' },
  { label: CHARGE_LABELS.misc, heading: 'ccmisc' },
  { label: CHARGE_LABELS.stateSalesTax, heading: 'ccstatesalestax' },
  { label: CHARGE_LABELS.nysSurcharge, heading: 'ccnyssurcharge' },
] as const;

const INVOICE_CHARGES = [
  { label: CHARGE_LABELS.fare, heading: 'iddfare' },
  { label: CHARGE_LABELS.tolls, heading: 'iddtolls' },
  { label: CHARGE_LABELS.tips, heading: 'iddtips' },
  { label: CHARGE_LABELS.waitingTime, heading: 'iddwaitingamount' },
  { label: CHARGE_LABELS.stops, heading: 'iddstops' },
  { label: CHARGE_LABELS.stopWaitingTime, heading: 'iddstopwaitingamount' },
  { label: CHARGE_LABELS.serviceCharge, heading: 'iddservicecharge' },
  { label: CHARGE_LABELS.phoneUsage, heading: 'iddphone' },
  { label: CHARGE_LABELS.package, heading: 'iddpackage' },
  { label: CHARGE_LABELS.additionalPassenger, heading: 'iddadditonalpassenger' },
  { label: CHARGE_LABELS.misc, heading: 'iddmisc' },
  { label: CHARGE_LABELS.stateSalesTax, heading: 'iddstatesalestax' },
  { label: CHARGE_LABELS.nysSurcharge, heading: 'iddnyssurcharge' },
  { label: CHARGE_LABELS.total, heading: 'iddtotal' },
] as const;

/** Every `LOAD_RESERVATION` heading the app reads (guide §10). */
const RESERVATION_HEADINGS = [
  ...ORDER_HEADINGS,
  ...STOP_HEADINGS,
  'oaccountnumber', 'oevipnumber', 'ocardtype', 'ocardholdername', 'ocardnumber',
  'ofleetname', 'oconfirmationmethod', 'ophonenumber', 'ophoneext', 'ophonenumberus', 'ophoneextus', 'oemail',
  'oneedphone', 'ocartype', 'ocaryear', 'onumberofpassengers', 'onumberofstops', 'osmokingallowed',
  'oeoriginatedatetime', 'oecarnum', 'oereservationmakefor', 'oeridepurpose', 'oeccemail', 'oeloginidreservationmakefor',
  'oeapprovaldate', 'oeoperatorname', 'oevouchernum', 'oecarcolor', 'oecarmodel', 'oedrivernum', 'oedrivername',
  'oetransactiondate', 'oetransactionamount', 'iddinvoicenum',
  ...CALL_CHARGES.map((charge) => charge.heading),
  ...INVOICE_CHARGES.map((charge) => charge.heading),
] as const;

type ReservationRow = Record<(typeof RESERVATION_HEADINGS)[number], string>;

/** The stored place-type code (`oputype` / `odotype`) as a place kind; `null` when unknown. */
function toPlaceKind(code: string): PlaceKind | null {
  const kind = (Object.keys(PLACE_TYPE_CODES) as PlaceKind[]).find((key) => PLACE_TYPE_CODES[key] === code.trim());
  return kind ?? null;
}

/** The pickup end, read from its `opu*` headings. */
function toPickupStop(row: ReservationRow): RecordStop {
  const kind = toPlaceKind(row.oputype) ?? 'address';
  return {
    place: {
      ...EMPTY_PLACE,
      kind,
      country: toCountryCode(row.opucountry),
      state: row.opustate.trim(),
      city: row.opucity.trim(),
      zip: row.opuzipcode.trim(),
      streetNumber: row.opustreetnumber.trim(),
      streetName: row.opustreetname.trim(),
      crossStreet: row.opucrossstreet.trim(),
      pickupPoint: row.opupoint.trim(),
      airportName: kind === 'airport' ? row.opuairportname.trim() : '',
      landmarkName: kind === 'landmark' ? row.opulandmarkname.trim() : '',
      latitude: row.oepickuplat.trim(),
      longitude: row.oepickuplon.trim(),
    },
    directions: row.opudirections.trim(),
    crossStreet2: row.opucrossstreet2.trim(),
    airport:
      kind === 'airport'
        ? {
            airline: row.opuairlinename.trim(),
            flightNumber: row.opuflightnumber.trim(),
            arrivingFrom: row.opuflightarrivingfrom.trim(),
            pickupOption: toPickupOption(row.opuairportoption),
            terminal: '',
            flyingTo: '',
          }
        : EMPTY_AIRPORT_DETAILS,
  };
}

/**
 * The drop-off end, read from its `odo*` headings; `null` when nothing is
 * stored (an "as directed" ride). The airline, flight, terminal and
 * destination-city headings are read only for an airport: on stored street
 * rides they carry address text (a backend issue, guide §10).
 */
function toDropoffStop(row: ReservationRow): RecordStop | null {
  const kind = toPlaceKind(row.odotype);
  if (!kind) return null;
  return {
    place: {
      ...EMPTY_PLACE,
      kind,
      country: toCountryCode(row.odocountry),
      state: row.odostate.trim(),
      city: row.odocity.trim(),
      zip: row.odozipcode.trim(),
      streetNumber: row.odostreetnumber.trim(),
      streetName: row.odostreetname.trim(),
      crossStreet: row.odocrossstreet.trim(),
      airportName: kind === 'airport' ? row.odoairportname.trim() : '',
      landmarkName: kind === 'landmark' ? row.odolandmarkname.trim() : '',
      latitude: row.oedropofflat.trim(),
      longitude: row.oedropofflon.trim(),
    },
    directions: row.ododirections.trim(),
    crossStreet2: row.odocrossstreet2.trim(),
    airport:
      kind === 'airport'
        ? {
            airline: row.odoairlinename.trim(),
            flightNumber: row.odoflightnumber.trim(),
            arrivingFrom: '',
            pickupOption: '',
            terminal: row.odoterminalnumber.trim(),
            flyingTo: row.odoflightdestinationcity.trim(),
          }
        : EMPTY_AIRPORT_DETAILS,
  };
}

const EMPTY_AIRPORT_DETAILS: AirportDetails = {
  airline: '',
  flightNumber: '',
  arrivingFrom: '',
  pickupOption: '',
  terminal: '',
  flyingTo: '',
};

function toPickupOption(value: string): AirportPickupOption | '' {
  const code = value.trim();
  return code === 'A' || code === 'B' || code === 'C' || code === 'D' ? code : '';
}

/** The wizard method a stored `opaymentmethod` code reads as; `null` when unknown. */
function toBillingMethod(code: string): BillingMethodId | null {
  const method = (Object.keys(PAYMENT_METHOD_CODES) as BillingMethodId[]).find(
    (key) => PAYMENT_METHOD_CODES[key] === code.trim(),
  );
  return method ?? null;
}

/** A whole number, or `null` when the stored value isn't one (some rides store letters). */
function wholeNumber(value: string): number | null {
  return /^\d+$/.test(value.trim()) ? Number(value.trim()) : null;
}

/** The charge lines the record carries a value for. */
function toCharges(row: ReservationRow): ChargeLine[] {
  const lines = row.oeinvoiceposted.trim() === 'Y' ? INVOICE_CHARGES : CALL_CHARGES;
  return lines.flatMap(({ label, heading }) => {
    const amount = row[heading].trim();
    return amount ? [{ label, amount }] : [];
  });
}

/**
 * The record, read by its headings (guide §10). `null` when the gateway has
 * none for the number (it answers `dummy` alone).
 */
export function toReservationRecord(response: GatewayResponse): ReservationRecord | null {
  const row = readRecords(response, RESERVATION_HEADINGS)[0];
  if (!row || !row.oreservationnumber.trim()) return null;

  const paymentMethod: PaymentMethod | null = toPaymentMethod(row.opaymentmethod);

  return {
    reservationNumber: row.oreservationnumber.trim(),
    voucherNumber: row.oevouchernum.trim(),
    status: toRideStatus(row.oecallstatusdesc, row.oecurrentstatusdesc),
    statusLabel: row.oecallstatusdesc.trim(),
    firstName: row.ofirstname.trim(),
    lastName: row.olastname.trim(),
    rideAt: parseGatewayDate(row.oreservationdate, row.oreservationtime),
    originateOn: parseDayMonthYear(row.oeoriginatedatetime.trim()),
    operatorName: row.oeoperatorname.trim(),
    pickup: toPickupStop(row),
    destination: toDropoffStop(row),
    billing: {
      method: toBillingMethod(row.opaymentmethod),
      paymentLabel: paymentMethod ? PAYMENT_METHOD_LABELS[paymentMethod] : COMMON_MESSAGES.NOT_AVAILABLE,
      accountNumber: row.oaccountnumber.trim(),
      vipNumber: row.oevipnumber.trim(),
      cardType: row.ocardtype.trim(),
      cardMasked: maskStoredCard(row.ocardnumber),
      cardHolder: row.ocardholdername.trim(),
      voucherNumber: row.oevouchernum.trim(),
      invoiceNumber: row.iddinvoicenum.trim(),
      invoicePosted: row.oeinvoiceposted.trim() === 'Y',
      approvalDate: row.oeapprovaldate.trim(),
      transactionDate: row.oetransactiondate.trim(),
      transactionAmount: row.oetransactionamount.trim(),
    },
    driver: {
      // `oecarnum` is sent twice; `mapRows` keeps the later value (guide §10).
      carNumber: row.oecarnum.trim(),
      carColor: row.oecarcolor.trim(),
      carModel: row.oecarmodel.trim(),
      driverName: row.oedrivername.trim(),
      driverNumber: row.oedrivernum.trim(),
    },
    preferences: {
      carType: row.ocartype.trim(),
      confirmByPhone: row.oneedphone.trim() === 'Y',
      phoneUs: digitsOnly(row.ophonenumberus),
      phoneUsExt: digitsOnly(row.ophoneextus),
      phoneIntl: digitsOnly(row.ophonenumber),
      phoneIntlExt: digitsOnly(row.ophoneext),
      email: row.oemail.trim(),
      ccEmail: row.oeccemail.trim(),
      passengers: wholeNumber(row.onumberofpassengers),
      stops: wholeNumber(row.onumberofstops),
      ridePurpose: row.oeridepurpose.trim(),
      makeFor: row.oereservationmakefor.trim(),
      loginIdMakeFor: row.oeloginidreservationmakefor.trim(),
      fleetName: row.ofleetname.trim(),
      carYear: row.ocaryear.trim(),
      smokingAllowed: row.osmokingallowed.trim(),
    },
    charges: toCharges(row),
  };
}

/**
 * Whatever the server stored, only the last four digits survive — a record
 * that ever carried a full number still never shows or resends one
 * (00-README §5 #1).
 */
function maskStoredCard(value: string): string {
  const digits = digitsOnly(value);
  return digits.length >= 4 ? `************${digits.slice(-4)}` : '';
}

// ── Record → draft (edit, return trip, repeat) ─────────────────────────────

/** One end of a loaded ride as an address the maps and the wizard can use. */
export function stopToSuggestion(stop: RecordStop, id: string): AddressSuggestion {
  return toSuggestion(id, { ...stop.place, directions: stop.directions });
}

function stopToLeg(stop: RecordStop): LegDetails {
  return {
    ...emptyLeg(),
    place: stop.place,
    lookup: 'ready',
    // Already booked against these addresses, so zoning is re-run on change only.
    zone: { ...IDLE_ZONE, status: 'matched' },
    airport: stop.airport,
  };
}

/** A US number reads back into the callback fields; anything longer is international. */
function intlPhoneValue(digits: string, ext: string): PhoneValue {
  if (!digits) return { country: null, number: '', ext: '' };
  for (const length of [3, 2, 1]) {
    const country = findCountryByDial(digits.slice(0, length));
    if (country) return { country: country.code, number: digits.slice(length), ext };
  }
  return { country: null, number: digits, ext };
}

/**
 * The wizard's draft for a loaded reservation.
 *
 * - `edit` keeps everything, including the date and time, and the masked card
 *   on file so an unchanged card is resent as "unchanged".
 * - `return` swaps the two ends and `repeat` keeps them; both start from the
 *   next free slot, since the original time is in the past, and ask for the
 *   card again.
 */
export function recordToDraft(
  record: ReservationRecord,
  mode: Exclude<DraftMode, 'new'>,
  base: ReservationDraft,
  today: Date,
): ReservationDraft {
  const pickupStop = record.pickup;
  const destinationStop = record.destination;
  const swap = mode === 'return' && destinationStop !== null;
  const from = swap ? destinationStop : pickupStop;
  const to = swap ? pickupStop : destinationStop;
  const keepTime = mode === 'edit' && record.rideAt !== null;
  const rideAt = record.rideAt ?? today;

  return {
    info: {
      ...base.info,
      firstName: record.firstName,
      lastName: record.lastName,
      isLive: false,
      date: keepTime ? startOfDay(rideAt) : startOfDay(today),
      time: keepTime ? nextSlot(new Date(rideAt.getTime() - 60_000)) : nextSlot(today),
      bookingFor:
        record.preferences.makeFor === MAKE_FOR_CODES.other ? record.preferences.loginIdMakeFor : '',
    },
    addresses: {
      pickup: stopToSuggestion(from, `record:${record.reservationNumber}:from`),
      pickupNotes: from.directions,
      pickupLeg: stopToLeg(from),
      destination: to ? stopToSuggestion(to, `record:${record.reservationNumber}:to`) : null,
      destinationNotes: to?.directions ?? '',
      destinationLeg: to ? stopToLeg(to) : emptyLeg(),
    },
    billing: {
      ...base.billing,
      method: record.billing.method ?? base.billing.method,
      accountNumber: record.billing.accountNumber || base.billing.accountNumber,
      vipNumber: record.billing.vipNumber,
      card: { ...base.billing.card, holder: record.billing.cardHolder },
      cardOnFile: mode === 'edit' ? record.billing.cardMasked : '',
      cardTypeOnFile: mode === 'edit' ? record.billing.cardType : '',
      approvalNumber: '',
      approvedFor: '',
    },
    preferences: {
      ...base.preferences,
      carType: record.preferences.carType || base.preferences.carType,
      confirmByPhone: record.preferences.confirmByPhone,
      callbackUs: { country: null, number: record.preferences.phoneUs, ext: record.preferences.phoneUsExt },
      callbackIntl: intlPhoneValue(record.preferences.phoneIntl, record.preferences.phoneIntlExt),
      email: record.preferences.email || base.preferences.email,
      ccEmails: record.preferences.ccEmail,
      passengers: Math.max(1, record.preferences.passengers ?? base.preferences.passengers),
      stops: Math.max(0, record.preferences.stops ?? base.preferences.stops),
      ridePurpose: record.preferences.ridePurpose,
    },
  };
}

/** Latest a ride may be booked ahead (guide 14). */
export const MAX_DAYS_AHEAD = 90;

export function latestBookableDay(today: Date): Date {
  return addDays(startOfDay(today), MAX_DAYS_AHEAD);
}

// ── Confirmation e-mail ────────────────────────────────────────────────────

/**
 * `JData` for {@link ACTION_CODES.FORMAT_EMAIL_MESSAGE}. The card goes out
 * masked — the e-mail never needs, and so never gets, the full number.
 */
export function emailMessageJData(
  draft: ReservationDraft,
  reservationNumber: string,
  now: Date,
): GatewayJData {
  const { info, addresses, billing, preferences } = draft;
  const when = pickupMoment(info, now);
  const pu = addresses.pickupLeg.place ?? EMPTY_PLACE;
  const dropoff = addresses.destinationLeg.place ?? EMPTY_PLACE;
  const puAirport = pu.kind === 'airport';
  const doAirport = dropoff.kind === 'airport';
  const account = paysByAccount(billing.method) ? billing.accountNumber.trim() : '';
  const card = paysByCard(billing.method);
  const digits = digitsOnly(billing.card.number) || digitsOnly(billing.cardOnFile);

  return {
    P_RES1: reservationNumber,
    P_PU_DATE_TIME1: `${when.date} ${when.time}`,
    P_PASSENGER_FIRST_NAME1: info.firstName.trim(),
    P_PASSENGER_LAST_NAME1: info.lastName.trim(),
    P_CARRIER_ACCOUNT_NUM1: account,
    P_PICKUP_STREET_ADDRESS1: [pu.streetNumber, pu.streetName].filter(Boolean).join(' '),
    P_PICKUP_STREET_NAME1: pu.streetName,
    P_PICKUP_CROSS_ST_NAME1: pu.crossStreet,
    P_CITY1: pu.city,
    P_STATE1: pu.state,
    P_PICKUP_ZIP_CODE1: pu.zip,
    P_PICKUP_POINT1: pu.pickupPoint,
    P_PICKUP_DIRECTIONS1: puAirport ? '' : addresses.pickupNotes.trim(),
    P_PICKUP_AIRPORT1: puAirport ? pu.airportName : '',
    P_PICKUP_AIRLINE1: puAirport ? addresses.pickupLeg.airport.airline.trim() : '',
    P_PICKUP_FLIGHT1: puAirport ? addresses.pickupLeg.airport.flightNumber.trim() : '',
    P_PICKUP_AIRPORT_CITY1: puAirport ? addresses.pickupLeg.airport.arrivingFrom.trim() : '',
    P_PICKUP_AIRPORT_DIRECTIONS1: puAirport ? addresses.pickupNotes.trim() : '',
    P_DROPOFF_STREET_ADDRESS1: [dropoff.streetNumber, dropoff.streetName].filter(Boolean).join(' '),
    P_DROPOFF_ADD11: '',
    P_DROPOFF_CITY1: dropoff.city,
    P_DROPOFF_STATE1: dropoff.state,
    P_DROPOFF_ZIP_CODE1: dropoff.zip,
    P_TO_LANDMARK1: dropoff.kind === 'landmark' ? dropoff.landmarkName : '',
    P_DROPOFF_AIRPORT1: doAirport ? dropoff.airportName : '',
    P_TO_COUNTY1: dropoff.country,
    P_DROPOFF_DIRECTIONS1: addresses.destinationNotes.trim(),
    P_SCHEDULED_DISPATCH_TIME1: `${when.date} ${when.time}`,
    P_RESERVATION_CONFIRMATION1: preferences.confirmByPhone ? RESERVATION_CONFIRMATION_CODES.phone : RESERVATION_CONFIRMATION_CODES.email,
    P_CALL_TYPE1: addresses.pickupLeg.place ? PLACE_TYPE_CODES[pu.kind] : '',
    P_DO_TYPE1: addresses.destinationLeg.place ? PLACE_TYPE_CODES[dropoff.kind] : '',
    P_CARRIER_CODE1: account,
    P_EMAILADDRESS: [preferences.email.trim(), ...ccEmailList(preferences.ccEmails)].filter(Boolean).join(','),
    P_CALL_CONFIRM: preferences.confirmByPhone ? 'Y' : 'N',
    P_CAR_NUM: '',
    P_ETA: '',
    P_PAYMENT_METHOD1: PAYMENT_METHOD_CODES[billing.method],
    P_CC_PERSONS_NAME1: card ? billing.card.holder.trim() : '',
    P_CC_EXPIRATION1: card ? contractExpiry(billing.card.expiry) : '',
    P_CC_NUMBER1: card && digits.length >= 4 ? `************${digits.slice(-4)}` : '',
    P_CC_TYPE1: card ? (digitsOnly(billing.card.number) ? cardTypeCode(billing.card.number) : billing.cardTypeOnFile) : '',
  };
}

// ── Extra values stored on a reservation (RES.*RESERVATION_COLUMN_VALUE) ───

/** `JData` for the two `LOAD_RESERVATION_COLUMN_*` reads. */
export function columnReadJData(reservationNumber: string, columnId: number): GatewayJData {
  return { P_RESERVATION_NUM: reservationNumber, P_COLUMN_ID: columnId };
}

export function columnAddJData(reservationNumber: string, columnId: number, value: string): GatewayJData {
  return { P_RESERVATION_NUM: reservationNumber, P_COLUMN_ID: columnId, P_COLUMN_VALUE: value };
}

export function columnUpdateJData(
  reservationNumber: string,
  columnId: number,
  oldValue: string,
  newValue: string,
): GatewayJData {
  return {
    P_RESERVATION_NUM: reservationNumber,
    P_COLUMN_ID: columnId,
    P_COLUMN_VALUE_OLD: oldValue,
    P_COLUMN_VALUE_NEW: newValue,
  };
}

/** `LOAD_RESERVATION_COLUMN_VALUES_BY_TYPE` headings (guide §10). */
const COLUMN_VALUE_HEADINGS = ['ocolumnid', 'ocolumnvalue'] as const;

/** Values of `LOAD_RESERVATION_COLUMN_VALUES_BY_TYPE`, read by `ocolumnvalue`. */
export function toColumnValues(response: GatewayResponse): string[] {
  return [...new Set(readRecords(response, COLUMN_VALUE_HEADINGS).map((row) => row.ocolumnvalue.trim()).filter(Boolean))];
}

/**
 * `o_columnvalue` of `LOAD_RESERVATION_COLUMN_SINGLE_VALUE` (`"0"` / `Success`
 * with the value, guide §10); '' for any other answer.
 */
export function toSingleColumnValue(response: GatewayResponse): string {
  if (readResult(response).code !== DB_SUCCESS_CODE) return '';
  return mapRowsByHeadings(response, ['o_columnvalue'] as const)[0]?.o_columnvalue.trim() ?? '';
}

/**
 * The column writes that turn `before` into `after`: one update when exactly
 * one value was replaced, otherwise deletes for the removed and adds for the new.
 */
export function columnChanges(
  before: readonly string[],
  after: readonly string[],
): { add: string[]; remove: string[]; update: { from: string; to: string } | null } {
  const lower = (list: readonly string[]) => new Set(list.map((value) => value.toLowerCase()));
  const beforeSet = lower(before);
  const afterSet = lower(after);
  const add = after.filter((value) => !beforeSet.has(value.toLowerCase()));
  const remove = before.filter((value) => !afterSet.has(value.toLowerCase()));
  if (add.length === 1 && remove.length === 1) {
    return { add: [], remove: [], update: { from: remove[0], to: add[0] } };
  }
  return { add, remove, update: null };
}

// ── Communication log (RES.S.COMMUNICATION_LOG) ────────────────────────────

/** `JData` for {@link ACTION_CODES.COMMUNICATION_LOG}. */
export function communicationLogJData(loginId: string, reservationNumber: string): GatewayJData {
  return { P_LOGIN_ID: loginId, P_RESERVATION_NUM: reservationNumber };
}

export type CommunicationEntry = { id: string; at: Date | null; channel: string; text: string };

/**
 * `RES.S.COMMUNICATION_LOG` headings (guide §10): the questions asked about
 * the ride (`RES.I.ASKED_QUESTIONS`) and their answers.
 */
const LOG_HEADINGS = ['asked_question_id', 'question', 'additional_message', 'asked_question_datetime', 'answer'] as const;

/** The questions asked about a ride, each with the customer's message and any answer. */
export function toCommunicationLog(response: GatewayResponse): CommunicationEntry[] {
  return readRecords(response, LOG_HEADINGS).map((row, index) => ({
    id: row.asked_question_id.trim() || String(index),
    // TODO(schema-unverified): assumed asked_question_datetime is MM/DD/YYYY hh:mm:ss; confirm against guide §10
    at: parseGatewayDate(row.asked_question_datetime),
    channel: row.question.trim(),
    text: [row.additional_message.trim(), row.answer.trim()].filter(Boolean).join('\n') || COMMON_MESSAGES.NOT_AVAILABLE,
  }));
}
