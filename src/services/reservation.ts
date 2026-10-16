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
import { CHARGE_LABELS, RESERVATION_MESSAGES, RIDES_MESSAGES } from '@/constants/messages';
import { cardTypeCode, contractExpiry, requirementParams } from '@/services/billing';
import { type GatewayJData, type GatewayResponse, mapRows } from '@/services/gateway';
import {
  assertResultCode,
  type GatewayRow,
  hasColumn,
  isYes,
  parseGatewayDate,
  pick,
  recordSet,
  toInt,
} from '@/services/gatewayRows';
import {
  EMPTY_PLACE,
  type AddressSuggestion,
  type PlaceKind,
  type StructuredPlace,
  toCountryCode,
  toSuggestion,
} from '@/services/places';
import { type PaymentMethod, type RideStatus, toPaymentMethod, toRideStatus } from '@/services/rides';
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

// ── Codes the contract leaves open ─────────────────────────────────────────
// Each is set here only; confirm with the backend before real data arrives.

/** `P_PU_TYPE` / `P_DO_TYPE`. The sample "A" sits beside airport values; "S" and "L" mirror it. */
export const PLACE_TYPE_CODES: Record<PlaceKind, string> = { address: 'S', airport: 'A', landmark: 'L' };

/**
 * `P_PAYMENT_METHOD`. "CC" is the documented sample and "CA" matches
 * registration's corporate code; "AC" (account + card) is an assumption.
 */
export const PAYMENT_METHOD_CODES: Record<BillingMethodId, string> = {
  corporate: 'CA',
  'corporate-card': 'AC',
  card: 'CC',
};

/** `P_RESERVATION_MAKE_FOR`: "SELF" is the sample; "OTHER" marks a booking for someone who granted access. */
export const MAKE_FOR_CODES = { self: 'SELF', other: 'OTHER' } as const;

/** `P_CONFIRMATION_METHOD`: "EMAIL" is the sample; "PHONE" mirrors it. */
export const CONFIRMATION_CODES = { email: 'EMAIL', phone: 'PHONE' } as const;

/** `P_CALL_SOURCE` — the sample value; the app books through the same web channel. */
export const CALL_SOURCE = 'WEB';

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

/** `P_RESERVATION_TIME`: 24-hour `HH:mm`, as in the contract's "14:30". */
export function contractTime(time: TimeValue): string {
  const hours = (time.hour % 12) + (time.meridiem === 'PM' ? 12 : 0);
  return `${pad2(hours)}:${pad2(time.minute)}`;
}

/** When the ride is wanted: the chosen slot, or right now for a live call. */
export function pickupMoment(info: PassengerRideInfoValue, now: Date): { date: string; time: string } {
  if (info.isLive) {
    return { date: contractDate(now), time: `${pad2(now.getHours())}:${pad2(now.getMinutes())}` };
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
    P_PU_ADDRESS_ADD: p.addressAdd,
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
    P_DO_ADDRESS_ADD: p.addressAdd,
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
      P_CONFIRMATION_METHOD: preferences.confirmByPhone ? CONFIRMATION_CODES.phone : CONFIRMATION_CODES.email,
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

/** Columns a new reservation's number may come back under (undocumented). */
const BOOKED_NUMBER_COLUMNS = ['o_reservation_num', 'reservation_num', 'o_res_num', 'o_ride_no', 'rideno', 'o_reservation_number'];

/**
 * Throws unless the booking or update was accepted. Returns the reservation
 * number when the server sends one — `null` otherwise; it is never made up.
 */
export function assertReservationSaved(response: GatewayResponse): { reservationNumber: string | null } {
  const row = assertResultCode(
    response,
    (message) => new ReservationError(message),
    RESERVATION_MESSAGES.BOOK_REJECTED,
  );
  return { reservationNumber: pick(row, BOOKED_NUMBER_COLUMNS) || null };
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
  /** The status word as the server spelled it, for display. */
  statusLabel: string;
  firstName: string;
  lastName: string;
  rideAt: Date | null;
  originateAt: Date | null;
  operatorName: string;
  pickup: RecordStop;
  /** `null` for an "as directed" ride with no destination. */
  destination: RecordStop | null;
  billing: {
    method: BillingMethodId;
    paymentMethod: PaymentMethod;
    paymentLabel: string;
    accountNumber: string;
    vipNumber: string;
    cardType: string;
    /** As the server sent it — already masked; never a full number. */
    cardMasked: string;
    cardHolder: string;
    cardExpiry: string;
    voucherNumber: string;
    invoiceNumber: string;
    approvalDate: string;
    transactionDate: string;
    transactionAmount: string;
  };
  driver: { carNumber: string; carColor: string; carModel: string; driverName: string; driverNumber: string };
  preferences: {
    carType: string;
    confirmByPhone: boolean;
    phoneUs: string;
    phoneUsExt: string;
    phoneIntl: string;
    phoneIntlExt: string;
    email: string;
    ccEmail: string;
    passengers: number;
    stops: number;
    ridePurpose: string;
    makeFor: string;
    loginIdMakeFor: string;
    /** Not edited in the app; an update sends them back as loaded. */
    fleetName: string;
    carYear: string;
    smokingAllowed: string;
  };
  charges: ChargeLine[];
  cancelReason: string;
};

/**
 * Column candidates per field. The contract's parameter name without `P_`
 * (lower case) comes first — today's gateway follows it — then the old
 * site's labels (guide 20).
 */
const C = {
  reservationNumber: ['reservation_num', 'reservationid', 'ride_no', 'rideno'],
  voucherNumber: ['voucher_num', 'voucher_number', 'voucherno'],
  status: ['status', 'call_status', 'callstatus'],
  firstName: ['first_name', 'firstname'],
  lastName: ['last_name', 'lastname'],
  date: ['reservation_date', 'ride_date', 'pickup_date', 'ridedate'],
  time: ['reservation_time', 'ride_time', 'pickup_time', 'ridetime'],
  originateDate: ['originate_date', 'booked_date', 'created_date'],
  originateTime: ['originate_time', 'booked_time', 'created_time'],
  operator: ['operator_name', 'operator'],
  paymentMethod: ['payment_method', 'payment_type'],
  accountNumber: ['account_number', 'account_num'],
  vipNumber: ['vip_number', 'vip_num'],
  cardType: ['card_type', 'cc_type'],
  cardNumber: ['card_number', 'cardno', 'cc_number'],
  cardHolder: ['card_holder_name', 'cc_persons_name'],
  cardExpiry: ['expiration_date', 'cc_expiration'],
  invoiceNumber: ['invoice_num', 'invoice_number'],
  approvalDate: ['approval_date'],
  transactionDate: ['transaction_date'],
  transactionAmount: ['transaction_amount', 'transaction_amt'],
  carNumber: ['car_num', 'car_number'],
  carColor: ['car_color'],
  carModel: ['car_model'],
  driverName: ['driver_name'],
  driverNumber: ['driver_num', 'driver_number'],
  carType: ['car_type'],
  confirmation: ['confirmation_method', 'confirmation_by'],
  needPhone: ['need_phone'],
  phoneUs: ['phone_number_us'],
  phoneUsExt: ['phone_ext_us'],
  phoneIntl: ['phone_number', 'phone_number_intl'],
  phoneIntlExt: ['phone_ext', 'phone_ext_intl'],
  email: ['email'],
  ccEmail: ['cc_email', 'email_cc'],
  passengers: ['number_of_passengers', 'no_of_passengers'],
  stops: ['number_of_stops', 'no_of_stops'],
  ridePurpose: ['ride_purpose'],
  makeFor: ['reservation_make_for'],
  loginIdMakeFor: ['login_id_reservation_make_for'],
  fleetName: ['fleet_name'],
  carYear: ['car_year'],
  smokingAllowed: ['smoking_allowed'],
  cancelReason: ['cancel_reason', 'reason'],
} as const;

const CHARGE_COLUMNS: readonly { label: string; columns: readonly string[] }[] = [
  { label: CHARGE_LABELS.fare, columns: ['fare'] },
  { label: CHARGE_LABELS.tolls, columns: ['tolls_parking', 'tolls'] },
  { label: CHARGE_LABELS.tips, columns: ['tips'] },
  { label: CHARGE_LABELS.waitingTime, columns: ['waiting_time'] },
  { label: CHARGE_LABELS.stops, columns: ['stops_charge', 'stops_amount'] },
  { label: CHARGE_LABELS.stopWaitingTime, columns: ['stop_waiting_time'] },
  { label: CHARGE_LABELS.serviceCharge, columns: ['service_charge'] },
  { label: CHARGE_LABELS.phoneUsage, columns: ['phone_usage'] },
  { label: CHARGE_LABELS.package, columns: ['package'] },
  { label: CHARGE_LABELS.additionalPassenger, columns: ['additional_passenger'] },
  { label: CHARGE_LABELS.misc, columns: ['misc'] },
  { label: CHARGE_LABELS.taxes, columns: ['taxes'] },
  { label: CHARGE_LABELS.stateSalesTax, columns: ['state_sales_tax'] },
  { label: CHARGE_LABELS.nysSurcharge, columns: ['nys_surcharge'] },
  { label: CHARGE_LABELS.total, columns: ['total_call_charges', 'total_charges'] },
];

/** `pu_*` / `do_*` columns of one end of the ride. */
function toStop(row: GatewayRow, prefix: 'pu' | 'do'): RecordStop | null {
  const col = (name: string) => [`${prefix}_${name}`];
  const typeText = pick(row, col('type'));
  const airportName = pick(row, col('airport_name'));
  const landmarkName = pick(row, col('landmark_name'));
  const kind: PlaceKind = /^a(irport)?$/i.test(typeText) || (!typeText && airportName)
    ? 'airport'
    : /^l(andmark)?$/i.test(typeText) || (!typeText && landmarkName)
      ? 'landmark'
      : 'address';

  const place: StructuredPlace = {
    ...EMPTY_PLACE,
    kind,
    country: toCountryCode(pick(row, col('country'))),
    state: pick(row, col('state')),
    city: pick(row, col('city')),
    zip: pick(row, col('zip_code')),
    streetNumber: pick(row, col('street_number')),
    streetName: pick(row, col('street_name')),
    crossStreet: pick(row, col('cross_street')),
    addressAdd: pick(row, col('address_add')),
    pickupPoint: pick(row, col('point')),
    airportName,
    landmarkName,
    latitude: pick(row, prefix === 'pu' ? ['pickup_lat'] : ['dropoff_lat']),
    longitude: pick(row, prefix === 'pu' ? ['pickup_lon'] : ['dropoff_lon']),
  };

  const empty = !place.city && !place.streetName && !airportName && !landmarkName;
  if (empty) return null;

  return {
    place,
    directions: pick(row, col('directions')),
    crossStreet2: pick(row, col('cross_street2')),
    airport: {
      airline: pick(row, col('airline_name')),
      flightNumber: pick(row, col('flight_number')),
      arrivingFrom: pick(row, col('flight_arriving_from')),
      pickupOption: toPickupOption(pick(row, col('airport_option'))),
      terminal: pick(row, col('terminal_number')),
      flyingTo: pick(row, col('flight_destination_city')),
    },
  };
}

function toPickupOption(value: string): AirportPickupOption | '' {
  const code = value.trim().toUpperCase();
  return code === 'A' || code === 'B' || code === 'C' || code === 'D' ? code : '';
}

/** Which wizard method a stored payment reads as. */
function toBillingMethod(paymentText: string): BillingMethodId {
  const code = paymentText.trim().toUpperCase();
  if (code === PAYMENT_METHOD_CODES['corporate-card']) return 'corporate-card';
  const method = toPaymentMethod(paymentText);
  return method === 'credit-card' ? 'card' : 'corporate';
}

const EMPTY_STOP: RecordStop = {
  place: EMPTY_PLACE,
  directions: '',
  crossStreet2: '',
  airport: { airline: '', flightNumber: '', arrivingFrom: '', pickupOption: '', terminal: '', flyingTo: '' },
};

/** Maps the first row; `null` when the response carries no reservation. */
export function toReservationRecord(response: GatewayResponse): ReservationRecord | null {
  const rows = recordSet(response, (message) => new ReservationError(message), RIDES_MESSAGES.LOAD_RESERVATION_FAILED);
  const row = rows[0];
  if (!row || !hasColumn(row, C.reservationNumber)) return null;

  const paymentLabel = pick(row, C.paymentMethod);
  const confirmation = pick(row, C.confirmation);

  return {
    reservationNumber: pick(row, C.reservationNumber),
    voucherNumber: pick(row, C.voucherNumber),
    status: toRideStatus(pick(row, C.status)),
    statusLabel: pick(row, C.status),
    firstName: pick(row, C.firstName),
    lastName: pick(row, C.lastName),
    rideAt: parseGatewayDate(pick(row, C.date), pick(row, C.time)),
    originateAt: parseGatewayDate(pick(row, C.originateDate), pick(row, C.originateTime)),
    operatorName: pick(row, C.operator),
    pickup: toStop(row, 'pu') ?? EMPTY_STOP,
    destination: toStop(row, 'do'),
    billing: {
      method: toBillingMethod(paymentLabel),
      paymentMethod: toPaymentMethod(paymentLabel),
      paymentLabel,
      accountNumber: pick(row, C.accountNumber),
      vipNumber: pick(row, C.vipNumber),
      cardType: pick(row, C.cardType),
      cardMasked: maskStoredCard(pick(row, C.cardNumber)),
      cardHolder: pick(row, C.cardHolder),
      cardExpiry: pick(row, C.cardExpiry),
      voucherNumber: pick(row, C.voucherNumber),
      invoiceNumber: pick(row, C.invoiceNumber),
      approvalDate: pick(row, C.approvalDate),
      transactionDate: pick(row, C.transactionDate),
      transactionAmount: pick(row, C.transactionAmount),
    },
    driver: {
      carNumber: pick(row, C.carNumber),
      carColor: pick(row, C.carColor),
      carModel: pick(row, C.carModel),
      driverName: pick(row, C.driverName),
      driverNumber: pick(row, C.driverNumber),
    },
    preferences: {
      carType: pick(row, C.carType),
      confirmByPhone: /phone/i.test(confirmation) || isYes(pick(row, C.needPhone)),
      phoneUs: digitsOnly(pick(row, C.phoneUs)),
      phoneUsExt: digitsOnly(pick(row, C.phoneUsExt)),
      phoneIntl: digitsOnly(pick(row, C.phoneIntl)),
      phoneIntlExt: digitsOnly(pick(row, C.phoneIntlExt)),
      email: pick(row, C.email),
      ccEmail: pick(row, C.ccEmail),
      passengers: toInt(pick(row, C.passengers), 1),
      stops: toInt(pick(row, C.stops), 0),
      ridePurpose: pick(row, C.ridePurpose),
      makeFor: pick(row, C.makeFor) || MAKE_FOR_CODES.self,
      loginIdMakeFor: pick(row, C.loginIdMakeFor),
      fleetName: pick(row, C.fleetName),
      carYear: pick(row, C.carYear),
      smokingAllowed: pick(row, C.smokingAllowed),
    },
    charges: CHARGE_COLUMNS.flatMap(({ label, columns }) => {
      const amount = pick(row, columns);
      return amount ? [{ label, amount }] : [];
    }),
    cancelReason: pick(row, C.cancelReason),
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

function stopToSuggestion(stop: RecordStop, id: string): AddressSuggestion {
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
        record.preferences.makeFor !== MAKE_FOR_CODES.self ? record.preferences.loginIdMakeFor : '',
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
      method: record.billing.method,
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
      passengers: Math.max(1, record.preferences.passengers),
      stops: Math.max(0, record.preferences.stops),
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
    P_RESERVATION_CONFIRMATION1: preferences.confirmByPhone ? CONFIRMATION_CODES.phone : CONFIRMATION_CODES.email,
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

const COLUMN_VALUE_COLUMNS = ['o_columnvalue', 'column_value', 'o_column_value', 'value', 'contact_number'];

/** Values of `LOAD_RESERVATION_COLUMN_VALUES_BY_TYPE`, placeholders dropped. */
export function toColumnValues(response: GatewayResponse): string[] {
  const rows = recordSet(response, (message) => new ReservationError(message), RESERVATION_MESSAGES.BOOK_REJECTED);
  return [...new Set(rows.map((row) => pick(row, COLUMN_VALUE_COLUMNS)).filter(Boolean))];
}

/** `o_ColumnValue` of `LOAD_RESERVATION_COLUMN_SINGLE_VALUE`; '' when there is none. */
export function toSingleColumnValue(response: GatewayResponse): string {
  const row = mapRows(response)[0];
  if (row && hasColumn(row, ['o_code']) && pick(row, ['o_code']) !== DB_SUCCESS_CODE) return '';
  return pick(row, COLUMN_VALUE_COLUMNS);
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

const LOG_COLUMNS = {
  id: ['log_id', 'message_id', 'id'],
  date: ['sent_date', 'log_date', 'date'],
  time: ['sent_time', 'log_time', 'time'],
  channel: ['channel', 'method', 'type', 'message_type'],
  text: ['message_text', 'message', 'description', 'log_text', 'subject'],
} as const;

/** Messages and confirmations sent for a ride (columns undocumented; stub filler dropped). */
export function toCommunicationLog(response: GatewayResponse): CommunicationEntry[] {
  const rows = recordSet(response, (message) => new ReservationError(message), RIDES_MESSAGES.LOAD_RESERVATION_FAILED);
  return rows.flatMap((row, index) => {
    const text = pick(row, LOG_COLUMNS.text);
    if (!text) return [];
    return [
      {
        id: pick(row, LOG_COLUMNS.id) || String(index),
        at: parseGatewayDate(pick(row, LOG_COLUMNS.date), pick(row, LOG_COLUMNS.time)),
        channel: pick(row, LOG_COLUMNS.channel),
        text,
      },
    ];
  });
}
