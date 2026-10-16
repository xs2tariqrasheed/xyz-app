import {
  type BillingErrors,
  type BillingMethodId,
  type BillingMethodValue,
  needsAccount,
  needsCard,
} from '@/components/reservation/BillingMethodSection';
import type {
  PassengerRideInfoErrors,
  PassengerRideInfoValue,
} from '@/components/reservation/PassengerRideInfoSection';
import {
  CC_EMAILS_MAX_LENGTH,
  type PreferencesErrors,
  type PreferencesValue,
} from '@/components/reservation/PreferencesSection';
import type {
  LegDetails,
  RideAddressInfoErrors,
  RideAddressInfoValue,
} from '@/components/reservation/RideAddressInfoSection';
import { CARD_MESSAGES, RESERVATION_MESSAGES } from '@/constants/messages';
import type { RequirementField } from '@/services/billing';
import { ccEmailList, latestBookableDay } from '@/services/reservation';
import { findVehicleType, type VehicleType } from '@/services/vehicleTypes';
import { startOfDay } from '@/utils/datetime';
import {
  cardNumberLength,
  cvvLength,
  detectBrand,
  digitsOnly,
  isValidExpiry,
  passesLuhn,
} from '@/utils/payment';
import { isValidEmail } from '@/utils/phone';

/**
 * Client-side checks for each booking step, from the old site's rules
 * (reverse-engineer-implemented/guide/14–17, reverse-engineer-guide/26). They catch typos before a round trip;
 * the server still validates everything itself.
 */

/** No digits or quotation marks (`isValidAlpha`). */
const NAME = /^[^\d"]*$/;
/** Letters, digits and spaces (`isValidAlphaNumericWithoutDashes`) — flight numbers. */
const ALPHANUMERIC = /^[A-Za-z0-9 ]+$/;
/**
 * Account numbers: the same, plus the hyphen account numbers on file are
 * stored with — a number the server issued must never fail the client check.
 */
const ACCOUNT = /^[A-Za-z0-9 -]+$/;
/** Requirement answers: letters, digits and `- _ space . , / &` (guide 16). */
const REQUIREMENT = /^[A-Za-z0-9\-_ .,/&]+$/;
/** Card holder: letters, spaces, full stops, apostrophes (`isValidCardHolderName`). */
const CARD_HOLDER = /^[\p{L} .']+$/u;
/** US numbers never start with 0 or 1 (guide 26). */
const US_PHONE = /^[2-9]\d{9}$/;
const ZIP = /^\d{5}$/;

function hasErrors(errors: object): boolean {
  return Object.values(errors).some(Boolean);
}

/** Two-way result: the errors, and whether the step may be left. */
export type StepCheck<E> = { errors: E; ok: boolean };

function result<E extends object>(errors: E): StepCheck<E> {
  return { errors, ok: !hasErrors(errors) };
}

// ── Step 1 ─────────────────────────────────────────────────────────────────

/** Combines the picked day and slot into one moment. */
function pickupAt(info: PassengerRideInfoValue): Date {
  const hours = (info.time.hour % 12) + (info.time.meridiem === 'PM' ? 12 : 0);
  return new Date(info.date.getFullYear(), info.date.getMonth(), info.date.getDate(), hours, info.time.minute);
}

export function checkPassenger(info: PassengerRideInfoValue, now: Date): StepCheck<PassengerRideInfoErrors> {
  const errors: PassengerRideInfoErrors = {};
  const first = info.firstName.trim();
  const last = info.lastName.trim();

  if (first.length > 15) errors.firstName = RESERVATION_MESSAGES.FIRST_NAME_TOO_LONG;
  else if (!NAME.test(first)) errors.firstName = RESERVATION_MESSAGES.NAME_INVALID;

  if (!last) errors.lastName = RESERVATION_MESSAGES.LAST_NAME_REQUIRED;
  else if (last.length < 2 || last.length > 20) errors.lastName = RESERVATION_MESSAGES.LAST_NAME_LENGTH;
  else if (!NAME.test(last)) errors.lastName = RESERVATION_MESSAGES.NAME_INVALID;

  if (!info.isLive) {
    if (startOfDay(info.date) > latestBookableDay(now)) errors.date = RESERVATION_MESSAGES.DATE_TOO_FAR;
    else if (pickupAt(info).getTime() <= now.getTime()) errors.time = RESERVATION_MESSAGES.TIME_PAST;
  }

  return result(errors);
}

// ── Step 2 ─────────────────────────────────────────────────────────────────

function legError(leg: LegDetails): string | undefined {
  if (leg.lookup === 'failed') return RESERVATION_MESSAGES.PLACE_LOOKUP_FAILED;
  if (leg.lookup === 'resolving' || leg.zone.status === 'checking') return RESERVATION_MESSAGES.ZONE_CHECKING;
  return undefined;
}

export function checkAddresses(addresses: RideAddressInfoValue): StepCheck<RideAddressInfoErrors> {
  const errors: RideAddressInfoErrors = {};
  const { pickup, destination, pickupLeg, destinationLeg } = addresses;

  if (!pickup) errors.pickup = RESERVATION_MESSAGES.PICKUP_REQUIRED;
  else errors.pickup = legError(pickupLeg);

  if (!destination) errors.destination = RESERVATION_MESSAGES.DESTINATION_REQUIRED;
  else if (pickup && pickup.placeId === destination.placeId) errors.destination = RESERVATION_MESSAGES.SAME_ENDS;
  else errors.destination = legError(destinationLeg);

  if (pickup && pickupLeg.zone.status === 'unmatched' && !pickupLeg.acknowledged) {
    errors.pickupZone = RESERVATION_MESSAGES.ZONE_ACK_REQUIRED;
  }
  if (destination && destinationLeg.zone.status === 'unmatched' && !destinationLeg.acknowledged) {
    errors.destinationZone = RESERVATION_MESSAGES.ZONE_ACK_REQUIRED;
  }

  if (pickupLeg.place?.kind === 'airport') {
    const { airline, flightNumber, pickupOption } = pickupLeg.airport;
    if (!airline.trim()) errors.pickupAirline = RESERVATION_MESSAGES.AIRLINE_REQUIRED;
    if (!flightNumber.trim()) errors.pickupFlight = RESERVATION_MESSAGES.FLIGHT_REQUIRED;
    else if (!ALPHANUMERIC.test(flightNumber.trim())) errors.pickupFlight = RESERVATION_MESSAGES.FLIGHT_INVALID;
    if (!pickupOption) errors.pickupOption = RESERVATION_MESSAGES.PICKUP_OPTION_REQUIRED;
  }
  const dropFlight = destinationLeg.airport.flightNumber.trim();
  if (destinationLeg.place?.kind === 'airport' && dropFlight && !ALPHANUMERIC.test(dropFlight)) {
    errors.destinationFlight = RESERVATION_MESSAGES.FLIGHT_INVALID;
  }

  if (addresses.pickupNotes.includes('"')) errors.pickupNotes = RESERVATION_MESSAGES.DIRECTIONS_INVALID;
  if (addresses.destinationNotes.includes('"')) errors.destinationNotes = RESERVATION_MESSAGES.DIRECTIONS_INVALID;

  return result(errors);
}

// ── Step 3 ─────────────────────────────────────────────────────────────────

/** True when an edit keeps the card on file rather than typing a new one. */
export function usesCardOnFile(billing: BillingMethodValue): boolean {
  return billing.cardOnFile.length > 0 && digitsOnly(billing.card.number).length === 0;
}

export function checkBilling(
  billing: BillingMethodValue,
  now: Date,
  allowed: readonly BillingMethodId[],
  requirementFields: readonly RequirementField[],
): StepCheck<BillingErrors> {
  const errors: BillingErrors = {};

  if (!allowed.includes(billing.method)) errors.method = RESERVATION_MESSAGES.METHOD_NOT_ALLOWED;

  if (needsAccount(billing.method)) {
    const account = billing.accountNumber.trim();
    if (!account) errors.account = RESERVATION_MESSAGES.ACCOUNT_REQUIRED;
    else if (account.length > 16 || !ACCOUNT.test(account)) errors.account = RESERVATION_MESSAGES.ACCOUNT_INVALID;

    if (billing.vipNumber && !/^\d{1,10}$/.test(billing.vipNumber)) errors.vip = RESERVATION_MESSAGES.VIP_INVALID;

    for (const field of requirementFields) {
      const answer = billing.requirements[field.index]?.trim() ?? '';
      const key = `requirement${field.index}` as keyof BillingErrors;
      if (!answer) errors[key] = RESERVATION_MESSAGES.REQUIREMENT_REQUIRED;
      else if (!REQUIREMENT.test(answer)) errors[key] = RESERVATION_MESSAGES.REQUIREMENT_INVALID;
    }
  }

  // An edit that keeps the card on file resends it as stored, holder included.
  if (needsCard(billing.method) && !usesCardOnFile(billing)) {
    const { card } = billing;
    const holder = card.holder.trim();
    if (holder.length < 2 || holder.length > 30) errors.holder = RESERVATION_MESSAGES.HOLDER_REQUIRED;
    else if (!CARD_HOLDER.test(holder)) errors.holder = RESERVATION_MESSAGES.HOLDER_INVALID;

    const brand = detectBrand(card.number);
    const digits = digitsOnly(card.number);
    if (digits.length !== cardNumberLength(brand)) errors.number = RESERVATION_MESSAGES.CARD_REQUIRED;
    else if (!passesLuhn(digits)) errors.number = CARD_MESSAGES.NUMBER_CHECKSUM;

    if (!card.expiry) errors.expiry = RESERVATION_MESSAGES.EXPIRY_REQUIRED;
    else if (!isValidExpiry(card.expiry, now)) errors.expiry = CARD_MESSAGES.EXPIRY_PAST;

    if (digitsOnly(card.cvv).length !== cvvLength(brand)) errors.cvv = RESERVATION_MESSAGES.CVV_REQUIRED;
    if (!ZIP.test(card.postalCode.trim())) errors.postalCode = RESERVATION_MESSAGES.ZIP_REQUIRED;
  }

  return result(errors);
}

// ── Step 4 ─────────────────────────────────────────────────────────────────

export function checkPreferences(
  preferences: PreferencesValue,
  vehicleTypes: readonly VehicleType[],
): StepCheck<PreferencesErrors> {
  const errors: PreferencesErrors = {};

  const car = findVehicleType(vehicleTypes, preferences.carType);
  if (!car) errors.carType = RESERVATION_MESSAGES.CAR_TYPE_REQUIRED;
  else if (car.callToBook) errors.carType = RESERVATION_MESSAGES.PREMIUM_WHEELCHAIR;
  else if (car.seats !== null && preferences.passengers > car.seats) {
    errors.passengers = RESERVATION_MESSAGES.OVER_CAPACITY;
  }

  const email = preferences.email.trim();
  if (!email) errors.email = RESERVATION_MESSAGES.EMAIL_REQUIRED;
  else if (!isValidEmail(email)) errors.email = RESERVATION_MESSAGES.EMAIL_INVALID;

  if (preferences.ccEmails.length > CC_EMAILS_MAX_LENGTH) errors.ccEmails = RESERVATION_MESSAGES.CC_EMAIL_TOO_LONG;
  else if (ccEmailList(preferences.ccEmails).some((address) => !isValidEmail(address))) {
    errors.ccEmails = RESERVATION_MESSAGES.CC_EMAIL_INVALID;
  }

  const us = preferences.callbackUs.number;
  const intl = preferences.callbackIntl.number;
  if (us && !US_PHONE.test(us)) errors.callbackUs = RESERVATION_MESSAGES.US_PHONE_INVALID;
  if (preferences.confirmByPhone && !us && !intl) errors.callbackUs = RESERVATION_MESSAGES.CALLBACK_REQUIRED;

  return result(errors);
}
