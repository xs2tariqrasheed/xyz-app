import { formatIntlPhone, formatUsPhone, isCompleteUsPhone, withExtension } from '@/utils/phone';

/**
 * A saved pickup location, as the address form collects it.
 *
 * Every field is a string — including the ones that hold digits — because the
 * form owns the raw text and formatting happens on the way out.
 */
export type AddressDraft = {
  country: string;
  state: string;
  city: string;
  zip: string;
  /** House or building number, e.g. "666". */
  building: string;
  street: string;
  /** Nearest intersection, for drivers working from landmarks. */
  crossStreet: string;
  /** Where exactly to wait, e.g. "North entrance". */
  pickupPoint: string;
  phoneUs: string;
  phoneUsExt: string;
  /** Dial code without the leading plus, e.g. "44". */
  phoneIntlCode: string;
  phoneIntl: string;
  phoneIntlExt: string;
  directions: string;
};

export type SavedAddress = AddressDraft & { id: string };

export type AddressErrors = Partial<Record<keyof AddressDraft, string>>;

export const DEFAULT_COUNTRY = 'United States';

/** A blank form, pre-filled with the country most customers will pick. */
export function emptyDraft(): AddressDraft {
  return {
    country: DEFAULT_COUNTRY,
    state: '',
    city: '',
    zip: '',
    building: '',
    street: '',
    crossStreet: '',
    pickupPoint: '',
    phoneUs: '',
    phoneUsExt: '',
    phoneIntlCode: '',
    phoneIntl: '',
    phoneIntlExt: '',
    directions: '',
  };
}

/** Loads a saved location back into the form. */
export function toDraft({ id: _id, ...draft }: SavedAddress): AddressDraft {
  return draft;
}

/**
 * Only the parts a driver cannot arrive without are required. Everything else
 * — cross street, pickup point, callbacks, directions — is help, not gating.
 */
export function validateDraft(draft: AddressDraft): AddressErrors {
  const errors: AddressErrors = {};

  if (!draft.country.trim()) errors.country = 'Country is required.';
  if (!draft.state.trim()) errors.state = 'State is required.';
  if (!draft.city.trim()) errors.city = 'City is required.';
  if (!draft.street.trim()) errors.street = 'Street name is required.';

  const zip = draft.zip.trim();
  if (zip && !/^\d{5}(-\d{4})?$/.test(zip)) errors.zip = 'Use a 5-digit ZIP, e.g. 10019.';

  if (draft.phoneUs.trim() && !isCompleteUsPhone(draft.phoneUs)) {
    errors.phoneUs = 'A US number needs 10 digits.';
  }

  if (draft.phoneIntl.trim() && !draft.phoneIntlCode.trim()) {
    errors.phoneIntlCode = 'Add the country dial code.';
  }

  return errors;
}

export function hasErrors(errors: AddressErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** "666 5 Ave" */
export function formatStreet(address: AddressDraft): string {
  return [address.building.trim(), address.street.trim()].filter(Boolean).join(' ');
}

/** "Manhattan, NY 10019" */
export function formatLocality(address: AddressDraft): string {
  const cityState = [address.city.trim(), address.state.trim()].filter(Boolean).join(', ');
  return [cityState, address.zip.trim()].filter(Boolean).join(' ');
}

/** One line, for the delete confirmation and accessibility labels. */
export function formatAddressLine(address: AddressDraft): string {
  return [formatStreet(address), formatLocality(address)].filter(Boolean).join(', ');
}

/** `null` when the customer left the number blank, so callers can skip the row. */
export function formatUsCallback(address: AddressDraft): string | null {
  const number = formatUsPhone(address.phoneUs);
  return number ? withExtension(number, address.phoneUsExt) : null;
}

export function formatIntlCallback(address: AddressDraft): string | null {
  const number = formatIntlPhone(address.phoneIntlCode, address.phoneIntl);
  return number ? withExtension(number, address.phoneIntlExt) : null;
}

/**
 * Locations the account starts with. Stands in for the customer's stored
 * addresses until the reservation API is wired up.
 */
export const SEED_ADDRESSES: readonly SavedAddress[] = [
  {
    id: 'addr-1',
    country: DEFAULT_COUNTRY,
    state: 'NY',
    city: 'Manhattan',
    zip: '10019',
    building: '666',
    street: '5 Ave',
    crossStreet: 'W 53 St',
    pickupPoint: 'North entrance, under the awning',
    phoneUs: '2125550134',
    phoneUsExt: '12',
    phoneIntlCode: '',
    phoneIntl: '',
    phoneIntlExt: '',
    directions: 'The doorman will call up on arrival — please wait in the lobby.',
  },
  {
    id: 'addr-2',
    country: DEFAULT_COUNTRY,
    state: 'NY',
    city: 'Manhattan',
    zip: '10036',
    building: '',
    street: 'W 41 St',
    crossStreet: '8 Ave',
    pickupPoint: 'Loading bay',
    phoneUs: '2125550188',
    phoneUsExt: '',
    phoneIntlCode: '44',
    phoneIntl: '20 7946 0018',
    phoneIntlExt: '',
    directions: '',
  },
  {
    id: 'addr-3',
    country: DEFAULT_COUNTRY,
    state: 'NY',
    city: 'Queens',
    zip: '11430',
    building: '',
    street: 'JFK International Airport',
    crossStreet: '',
    pickupPoint: 'Terminal 4, arrivals door 3',
    phoneUs: '7185550142',
    phoneUsExt: '',
    phoneIntlCode: '',
    phoneIntl: '',
    phoneIntlExt: '',
    directions: 'Meet at the kerbside pickup lane, not the parking garage.',
  },
];

// Ids only have to be unique within the session; the API will own them once
// saving is real.
let sequence = SEED_ADDRESSES.length;

export function nextAddressId(): string {
  sequence += 1;
  return `addr-${sequence}`;
}
