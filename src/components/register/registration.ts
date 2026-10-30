import { EMPTY_MAILING_ADDRESS, type MailingAddress } from '@/components/account/mailingAddress';
import type { CardFieldsErrors, CardFieldsValue } from '@/components/payment/CardDetailsFields';
import { EMPTY_PREFERENCES, type PreferencesValue } from '@/components/preferences/preferences';
import {
  EMPTY_PERSONAL_INFO,
  type PersonalInfoErrors,
  type PersonalInfoValue,
  validatePersonalInfo,
} from '@/components/profile/PersonalInfoSection';
import type { PhoneValue } from '@/components/ui/PhoneField';
import { REGISTER_MESSAGES } from '@/constants/messages';
import {
  detectBrand,
  digitsOnly,
  isCompleteCardNumber,
  isCompleteCvv,
  isValidExpiry,
} from '@/utils/payment';
import { isCompleteUsPhone } from '@/utils/phone';
import { isValidEmail } from '@/utils/validation';

/** The wizard's steps, in the order they are filled in. */
export const REGISTRATION_STEPS = [
  { title: REGISTER_MESSAGES.STEP_ACCOUNT_TITLE, short: REGISTER_MESSAGES.STEP_ACCOUNT_SHORT },
  { title: REGISTER_MESSAGES.STEP_ADDRESS_TITLE, short: REGISTER_MESSAGES.STEP_ADDRESS_SHORT },
  { title: REGISTER_MESSAGES.STEP_BILLING_TITLE, short: REGISTER_MESSAGES.STEP_BILLING_SHORT },
] as const;

/** Login passwords: 4–10 characters, no `'` or `"` (reverse-engineer-guide/26 §5). */
export const PASSWORD_MIN_LENGTH = 4;
export const PASSWORD_MAX_LENGTH = 10;

/** A VIP number as the old site took it: digits only, at most 10. */
export function isVipNumber(value: string): boolean {
  return /^\d+$/.test(value) && value.length <= BILLING_LIMITS.vipNumber;
}

/** True when `password` has an allowed length and no quotation mark. */
export function isAllowedPassword(password: string): boolean {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= PASSWORD_MAX_LENGTH &&
    !/['"]/.test(password)
  );
}

/** `PROF.I.PROFILE` carries at most four account requirement values. */
export const MAX_ACCOUNT_REQUIREMENTS = 4;

/** Billing field limits (reverse-engineer-implemented/guide/04 §4.1). */
export const BILLING_LIMITS = { accountNumber: 10, companyName: 50, vipNumber: 10, cardHolder: 30 } as const;

export const IVR_PIN_LENGTH = 4;

/** Oldest car year accepted; anything earlier is a typo. */
const OLDEST_CAR_YEAR = 1980;

export type AccountValue = {
  email: string;
  confirmEmail: string;
  password: string;
  confirmPassword: string;
};

export type AccountErrors = Partial<Record<keyof AccountValue, string>>;

export type BillingChoice = 'corporate' | 'card';

export type RegistrationBilling = {
  method: BillingChoice;
  accountNumber: string;
  /** Only used to check the account; the profile itself does not store it. */
  companyName: string;
  vipNumber: string;
  /** Answers to the account's requirement fields, in the order the account lists them. */
  requirements: readonly string[];
  card: CardFieldsValue;
};

export type BillingErrors = {
  accountNumber?: string;
  companyName?: string;
  vipNumber?: string;
  requirements?: (string | undefined)[];
  card?: CardFieldsErrors;
};

/** Optional car preferences saved on the profile. */
export type CarPreferences = {
  preferredFleet: string;
  /** Four digits. */
  carYear: string;
  carPhone: PhoneValue;
  smokingCar: boolean;
  /** Digits only. */
  ivrPin: string;
};

export type CarPreferencesErrors = Partial<Record<'carYear' | 'carPhone' | 'ivrPin', string>>;

/** Everything the wizard collects before `PROF.I.PROFILE`. */
export type RegistrationDraft = {
  account: AccountValue;
  personal: PersonalInfoValue;
  address: MailingAddress;
  billing: RegistrationBilling;
  preferences: PreferencesValue;
  car: CarPreferences;
};

export const EMPTY_REQUIREMENTS: readonly string[] = Array.from(
  { length: MAX_ACCOUNT_REQUIREMENTS },
  () => '',
);

export const EMPTY_REGISTRATION: RegistrationDraft = {
  account: { email: '', confirmEmail: '', password: '', confirmPassword: '' },
  personal: EMPTY_PERSONAL_INFO,
  address: EMPTY_MAILING_ADDRESS,
  billing: {
    method: 'corporate',
    accountNumber: '',
    companyName: '',
    vipNumber: '',
    requirements: EMPTY_REQUIREMENTS,
    card: { holder: '', number: '', expiry: '', cvv: '' },
  },
  preferences: EMPTY_PREFERENCES,
  car: {
    preferredFleet: '',
    carYear: '',
    carPhone: { country: null, number: '', ext: '' },
    smokingCar: false,
    ivrPin: '',
  },
};

export function validateAccount(value: AccountValue): AccountErrors {
  const errors: AccountErrors = {};

  if (!value.email.trim()) errors.email = REGISTER_MESSAGES.EMAIL_REQUIRED;
  else if (!isValidEmail(value.email)) errors.email = REGISTER_MESSAGES.EMAIL_INVALID;

  if (value.confirmEmail.trim().toLowerCase() !== value.email.trim().toLowerCase()) {
    errors.confirmEmail = REGISTER_MESSAGES.CONFIRM_EMAIL_MISMATCH;
  }

  if (!value.password) errors.password = REGISTER_MESSAGES.PASSWORD_REQUIRED;
  else if (value.password.length < PASSWORD_MIN_LENGTH || value.password.length > PASSWORD_MAX_LENGTH) {
    errors.password = REGISTER_MESSAGES.PASSWORD_LENGTH;
  } else if (!isAllowedPassword(value.password)) {
    errors.password = REGISTER_MESSAGES.PASSWORD_INVALID;
  }

  if (value.confirmPassword !== value.password) {
    errors.confirmPassword = REGISTER_MESSAGES.CONFIRM_PASSWORD_MISMATCH;
  }

  return errors;
}

/** Step 1 is the account block plus the personal info panel. */
export function validateAccountStep(draft: RegistrationDraft): {
  account: AccountErrors;
  personal: PersonalInfoErrors;
} {
  return { account: validateAccount(draft.account), personal: validatePersonalInfo(draft.personal) };
}

/**
 * `requirementLabels` are the fields the account asks for (empty when it asks
 * for none); each one shown must be answered.
 */
export function validateBilling(
  value: RegistrationBilling,
  today: Date,
  requirementLabels: readonly string[],
): BillingErrors {
  if (value.method === 'corporate') {
    const errors: BillingErrors = {};
    const accountNumber = value.accountNumber.trim();
    if (!accountNumber) errors.accountNumber = REGISTER_MESSAGES.ACCOUNT_NUMBER_REQUIRED;
    else if (accountNumber.length > BILLING_LIMITS.accountNumber || !/^[A-Za-z0-9 ]+$/.test(accountNumber)) {
      errors.accountNumber = REGISTER_MESSAGES.ACCOUNT_NUMBER_INVALID;
    }

    const companyName = value.companyName.trim();
    if (!companyName) errors.companyName = REGISTER_MESSAGES.COMPANY_NAME_REQUIRED;
    else if (companyName.length > BILLING_LIMITS.companyName || companyName.includes('"')) {
      errors.companyName = REGISTER_MESSAGES.COMPANY_NAME_INVALID;
    }

    const vipNumber = value.vipNumber.trim();
    if (vipNumber && !isVipNumber(vipNumber)) errors.vipNumber = REGISTER_MESSAGES.VIP_NUMBER_FORMAT;

    const requirements = requirementLabels.map((_, index) =>
      value.requirements[index]?.trim() ? undefined : REGISTER_MESSAGES.REQUIREMENT_REQUIRED,
    );
    if (requirements.some(Boolean)) errors.requirements = requirements;
    return errors;
  }

  const { card } = value;
  const brand = detectBrand(card.number);
  const cardErrors: CardFieldsErrors = {};

  const holder = card.holder.trim();
  if (!holder) cardErrors.holder = REGISTER_MESSAGES.CARD_HOLDER_REQUIRED;
  else if (holder.length < 2 || holder.length > BILLING_LIMITS.cardHolder || !/^[A-Za-z .']+$/.test(holder)) {
    cardErrors.holder = REGISTER_MESSAGES.CARD_HOLDER_INVALID;
  }

  if (digitsOnly(card.number).length === 0) cardErrors.number = REGISTER_MESSAGES.CARD_NUMBER_REQUIRED;
  else if (brand === 'unknown') cardErrors.number = REGISTER_MESSAGES.CARD_BRAND_UNSUPPORTED;
  else if (!isCompleteCardNumber(card.number)) cardErrors.number = REGISTER_MESSAGES.CARD_NUMBER_INVALID;

  if (!isValidExpiry(card.expiry, today)) cardErrors.expiry = REGISTER_MESSAGES.CARD_EXPIRY_INVALID;
  if (!isCompleteCvv(card.cvv, brand)) cardErrors.cvv = REGISTER_MESSAGES.CARD_CVV_INVALID;

  return Object.keys(cardErrors).length > 0 ? { card: cardErrors } : {};
}

/** Every car preference is optional, but one that is filled in must be whole. */
export function validateCarPreferences(value: CarPreferences, today: Date): CarPreferencesErrors {
  const errors: CarPreferencesErrors = {};

  if (value.carYear) {
    const year = Number(value.carYear);
    const newest = today.getFullYear() + 1;
    if (!/^\d{4}$/.test(value.carYear) || year < OLDEST_CAR_YEAR || year > newest) {
      errors.carYear = REGISTER_MESSAGES.CAR_YEAR_INVALID;
    }
  }

  if (value.carPhone.number && !isCompleteUsPhone(value.carPhone.number)) {
    errors.carPhone = REGISTER_MESSAGES.CAR_PHONE_INVALID;
  }

  if (value.ivrPin && value.ivrPin.length !== IVR_PIN_LENGTH) {
    errors.ivrPin = REGISTER_MESSAGES.IVR_PIN_INVALID;
  }

  return errors;
}

/** True when an errors object (nested objects and arrays included) holds any message. */
export function hasErrors(errors: object): boolean {
  return Object.values(errors).some((entry) =>
    typeof entry === 'object' && entry !== null ? hasErrors(entry) : Boolean(entry),
  );
}
