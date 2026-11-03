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
import type { PreferencesErrors, PreferencesValue } from '@/components/reservation/PreferencesSection';
import type {
  LegDetails,
  RideAddressInfoErrors,
  RideAddressInfoValue,
} from '@/components/reservation/RideAddressInfoSection';
import { FIELD_LIMITS } from '@/constants/fieldLimits';
import { CARD_MESSAGES, RESERVATION_MESSAGES, VALIDATION_MESSAGES as V } from '@/constants/messages';
import type { RequirementField } from '@/services/billing';
import { ccEmailList, latestBookableDay } from '@/services/reservation';
import { findVehicleType, type VehicleType } from '@/services/vehicleTypes';
import { startOfDay } from '@/utils/datetime';
import {
  cardNumberLength,
  cvvLength,
  detectBrand,
  isValidExpiry,
  passesLuhn,
} from '@/utils/payment';
import { digitsOnly, findCountry } from '@/utils/phone';
import {
  hasErrors,
  hasNoDoubleQuote,
  intlPhoneProblem,
  isAlphanumericWithSpaces,
  isValidCardHolderName,
  isValidEmail,
  isValidNameChars,
  isValidRequirementAnswer,
  isValidUsPhone,
  isValidVipNumber,
  isValidZip,
} from '@/utils/validation';

/**
 * Client-side checks for each booking step, from the old site's rules
 * (reverse-engineer-implemented/guide/14–17, reverse-engineer-guide/26). They catch typos before a round trip;
 * the server still validates everything itself.
 */

/**
 * Account numbers: letters, digits and spaces, plus the hyphen account numbers
 * on file are stored with — a number the server issued must never fail the
 * client check.
 */
const ACCOUNT = /^[A-Za-z0-9 -]+$/;

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

  if (first.length > FIELD_LIMITS.FIRST_NAME) errors.firstName = V.FIRST_NAME_TOO_LONG;
  else if (!isValidNameChars(first)) errors.firstName = V.NAME_INVALID;

  if (!last) errors.lastName = RESERVATION_MESSAGES.LAST_NAME_REQUIRED;
  else if (last.length < FIELD_LIMITS.LAST_NAME_MIN || last.length > FIELD_LIMITS.LAST_NAME) {
    errors.lastName = V.LAST_NAME_LENGTH;
  } else if (!isValidNameChars(last)) errors.lastName = V.NAME_INVALID;

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
    else if (!isAlphanumericWithSpaces(flightNumber)) errors.pickupFlight = RESERVATION_MESSAGES.FLIGHT_INVALID;
    if (!pickupOption) errors.pickupOption = RESERVATION_MESSAGES.PICKUP_OPTION_REQUIRED;
  }
  const dropFlight = destinationLeg.airport.flightNumber.trim();
  if (destinationLeg.place?.kind === 'airport' && dropFlight && !isAlphanumericWithSpaces(dropFlight)) {
    errors.destinationFlight = RESERVATION_MESSAGES.FLIGHT_INVALID;
  }

  if (!hasNoDoubleQuote(addresses.pickupNotes)) errors.pickupNotes = V.DIRECTIONS_INVALID;
  if (!hasNoDoubleQuote(addresses.destinationNotes)) errors.destinationNotes = V.DIRECTIONS_INVALID;

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
    else if (account.length > FIELD_LIMITS.BOOKING_ACCOUNT_NO || !ACCOUNT.test(account)) {
      errors.account = RESERVATION_MESSAGES.ACCOUNT_INVALID;
    }

    if (billing.vipNumber && !isValidVipNumber(billing.vipNumber)) errors.vip = V.VIP_INVALID;

    for (const field of requirementFields) {
      const answer = billing.requirements[field.index]?.trim() ?? '';
      const key = `requirement${field.index}` as keyof BillingErrors;
      if (!answer) errors[key] = RESERVATION_MESSAGES.REQUIREMENT_REQUIRED;
      else if (!isValidRequirementAnswer(answer)) errors[key] = V.REQUIREMENT_INVALID;
    }
  }

  // An edit that keeps the card on file resends it as stored, holder included.
  if (needsCard(billing.method) && !usesCardOnFile(billing)) {
    const { card } = billing;
    const holder = card.holder.trim();
    if (!holder) errors.holder = RESERVATION_MESSAGES.HOLDER_REQUIRED;
    else if (!isValidCardHolderName(holder)) errors.holder = V.CARD_HOLDER_INVALID;

    // Brand regex + Luhn, as at registration (reverse-engineer-guide/26 §3).
    const brand = detectBrand(card.number);
    const digits = digitsOnly(card.number);
    if (digits.length > 0 && brand === 'unknown') errors.number = CARD_MESSAGES.BRAND_UNSUPPORTED;
    else if (digits.length !== cardNumberLength(brand)) errors.number = RESERVATION_MESSAGES.CARD_REQUIRED;
    else if (!passesLuhn(digits)) errors.number = CARD_MESSAGES.NUMBER_CHECKSUM;

    if (!card.expiry) errors.expiry = RESERVATION_MESSAGES.EXPIRY_REQUIRED;
    else if (!isValidExpiry(card.expiry, now)) errors.expiry = CARD_MESSAGES.EXPIRY_PAST;

    if (digitsOnly(card.cvv).length !== cvvLength(brand)) errors.cvv = RESERVATION_MESSAGES.CVV_REQUIRED;
    const postalCode = card.postalCode.trim();
    if (!postalCode) errors.postalCode = RESERVATION_MESSAGES.ZIP_REQUIRED;
    else if (!isValidZip(postalCode)) errors.postalCode = V.ZIP_INVALID;
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

  const email = preferences.email.trim();
  if (!email) errors.email = RESERVATION_MESSAGES.EMAIL_REQUIRED;
  else if (!isValidEmail(email)) errors.email = V.EMAIL_INVALID;

  if (preferences.ccEmails.length > FIELD_LIMITS.CC_EMAILS) errors.ccEmails = RESERVATION_MESSAGES.CC_EMAIL_TOO_LONG;
  else if (ccEmailList(preferences.ccEmails).some((address) => !isValidEmail(address))) {
    errors.ccEmails = RESERVATION_MESSAGES.CC_EMAIL_INVALID;
  }

  // `RES.I.RESERVATION` fails (`ORA-01400`) without a ride purpose (guide §10).
  const ridePurpose = preferences.ridePurpose.trim();
  if (!ridePurpose) errors.ridePurpose = RESERVATION_MESSAGES.RIDE_PURPOSE_REQUIRED;
  else if (ridePurpose.length > FIELD_LIMITS.RIDE_PURPOSE) {
    errors.ridePurpose = RESERVATION_MESSAGES.RIDE_PURPOSE_TOO_LONG;
  }

  const us = preferences.callbackUs.number;
  const intl = preferences.callbackIntl.number;
  if (us && !isValidUsPhone(us)) errors.callbackUs = V.US_PHONE_INVALID;
  const intlDial = findCountry(preferences.callbackIntl.country)?.dial ?? '';
  if (intl && intlPhoneProblem(intlDial, intl)) errors.callbackIntl = V.INTL_NUMBER_INCOMPLETE;
  if (preferences.confirmByPhone && !us && !intl) errors.callbackUs = RESERVATION_MESSAGES.CALLBACK_REQUIRED;

  return result(errors);
}
