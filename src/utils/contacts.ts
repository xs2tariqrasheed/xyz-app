/**
 * Contact model: the extra phone numbers and e-mail addresses on a profile
 * (reverse-engineer-implemented/guide/12), offered as callback and e-mail choices when
 * booking.
 *
 * Each type is a profile "column" on the gateway (`P_COLUMN_ID`): 3 home,
 * 4 office, 5 fax, 6 cell, 8 e-mail — the old site's contact-type codes.
 * Numbers are kept as bare digits and only formatted for display.
 */

import { FIELD_LIMITS } from '@/constants/fieldLimits';
import { CONTACTS_MESSAGES, VALIDATION_MESSAGES as V } from '@/constants/messages';
import { digitsOnly, formatUsPhone, US_PHONE_DIGITS } from '@/utils/phone';
import { isValidEmail, isValidExtension, isValidUsPhone } from '@/utils/validation';

export type ContactKind = 'phone' | 'email';

export type ContactTypeId = 'home' | 'office' | 'fax' | 'cell' | 'email';

export type ContactType = {
  id: ContactTypeId;
  /** `P_COLUMN_ID` on the gateway. */
  columnId: number;
  label: string;
  kind: ContactKind;
  /** Only an office phone takes an extension (guide 12 §3). */
  hasExtension: boolean;
};

/** Selectable contact types, in the old site's order. */
export const CONTACT_TYPES: readonly ContactType[] = [
  { id: 'home', columnId: 3, label: CONTACTS_MESSAGES.TYPE_HOME, kind: 'phone', hasExtension: false },
  { id: 'office', columnId: 4, label: CONTACTS_MESSAGES.TYPE_OFFICE, kind: 'phone', hasExtension: true },
  { id: 'fax', columnId: 5, label: CONTACTS_MESSAGES.TYPE_FAX, kind: 'phone', hasExtension: false },
  { id: 'cell', columnId: 6, label: CONTACTS_MESSAGES.TYPE_CELL, kind: 'phone', hasExtension: false },
  { id: 'email', columnId: 8, label: CONTACTS_MESSAGES.TYPE_EMAIL, kind: 'email', hasExtension: false },
];

export const DEFAULT_CONTACT_TYPE: ContactTypeId = 'home';

export function contactType(id: ContactTypeId): ContactType {
  // The id is a union of the table's own keys, so a miss is impossible —
  // the fallback only satisfies the compiler.
  return CONTACT_TYPES.find((type) => type.id === id) ?? CONTACT_TYPES[0];
}

/** The type stored under a gateway column id, or `undefined` for any other column. */
export function contactTypeByColumn(columnId: number): ContactType | undefined {
  return CONTACT_TYPES.find((type) => type.columnId === columnId);
}

export type Contact = {
  /** Stable list key: column id + stored value, which is how the gateway identifies it. */
  id: string;
  type: ContactTypeId;
  /** Digits for a phone or fax, the trimmed address for an e-mail. */
  value: string;
  /** Office phone extension, digits; '' otherwise. */
  extension: string;
  /** The value exactly as the gateway holds it — what update and delete must send back. */
  stored: string;
};

/** Display form for a saved contact: `(212) 555-0134 ext. 101`, or the e-mail. */
export function formatContactValue(contact: Pick<Contact, 'type' | 'value' | 'extension'>): string {
  if (contactType(contact.type).kind !== 'phone') return contact.value;
  const number = formatUsPhone(contact.value);
  return contact.extension ? `${number} ext. ${contact.extension}` : number;
}

/**
 * The value as the gateway stores it. An office extension travels as
 * `<number>-<ext>`, the old site's `CompleteContactNumber` form (guide 05 §3.3)
 * — unconfirmed for the new backend, so it is decided here only.
 */
export function toStoredValue(type: ContactTypeId, value: string, extension: string): string {
  const { kind, hasExtension } = contactType(type);
  if (kind === 'email') return value.trim();
  const digits = digitsOnly(value);
  const ext = hasExtension ? digitsOnly(extension) : '';
  return ext ? `${digits}-${ext}` : digits;
}

/**
 * A stored value back into number + extension. Reading digits rather than
 * splitting on `-` copes with both `2125550134-101` and a formatted
 * `(212) 555-0134`: anything past the 10-digit number is the extension.
 */
export function fromStoredValue(type: ContactTypeId, stored: string): Pick<Contact, 'value' | 'extension'> {
  const { kind, hasExtension } = contactType(type);
  if (kind === 'email') return { value: stored.trim(), extension: '' };
  const digits = digitsOnly(stored);
  return {
    value: digits.slice(0, US_PHONE_DIGITS),
    extension: hasExtension ? digits.slice(US_PHONE_DIGITS, US_PHONE_DIGITS + FIELD_LIMITS.EXTENSION) : '',
  };
}

export type ContactErrors = { value?: string; extension?: string };

/** The old site's rules (guide 12 §3, 26 §11); an empty object when the draft is usable. */
export function validateContact(type: ContactTypeId, value: string, extension: string): ContactErrors {
  const { kind, hasExtension } = contactType(type);
  const trimmed = value.trim();
  const M = CONTACTS_MESSAGES;

  if (kind === 'email') {
    if (!trimmed) return { value: M.EMAIL_REQUIRED };
    return isValidEmail(trimmed) ? {} : { value: V.EMAIL_INVALID };
  }

  const errors: ContactErrors = {};
  const digits = digitsOnly(trimmed);
  if (!digits) errors.value = M.PHONE_REQUIRED;
  else if (!isValidUsPhone(digits)) errors.value = V.US_PHONE_INVALID;

  const ext = extension.trim();
  if (hasExtension && ext && !isValidExtension(ext)) errors.extension = V.EXTENSION_INVALID;
  return errors;
}

/** Same type and same stored value — used to stop a contact being saved twice. */
export function isDuplicateContact(
  contacts: readonly Contact[],
  candidate: Pick<Contact, 'type' | 'stored'>,
  ignoreId?: string,
): boolean {
  return contacts.some(
    (contact) =>
      contact.id !== ignoreId &&
      contact.type === candidate.type &&
      contact.stored.toLowerCase() === candidate.stored.toLowerCase(),
  );
}
