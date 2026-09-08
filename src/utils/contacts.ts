/**
 * Contact model: the phone numbers and email addresses a reservation can be
 * confirmed on.
 *
 * Numbers are stored as bare digits and only formatted for display, so the
 * same contact reads the same whether it was typed as `5551234567` or
 * `(555) 123-4567`.
 */

export type ContactKind = 'phone' | 'email';

export type ContactTypeId = 'home' | 'mobile' | 'work' | 'fax' | 'email';

export type ContactType = {
  id: ContactTypeId;
  label: string;
  kind: ContactKind;
  placeholder: string;
};

/** Selectable contact types, in picker order. */
export const CONTACT_TYPES: readonly ContactType[] = [
  {
    id: 'home',
    label: 'Home Phone',
    kind: 'phone',
    placeholder: '(555) 123-4567',
  },
  {
    id: 'mobile',
    label: 'Mobile Phone',
    kind: 'phone',
    placeholder: '(555) 123-4567',
  },
  {
    id: 'work',
    label: 'Work Phone',
    kind: 'phone',
    placeholder: '(555) 123-4567',
  },
  {
    id: 'fax',
    label: 'Fax',
    kind: 'phone',
    placeholder: '(555) 123-4567',
  },
  {
    id: 'email',
    label: 'Email',
    kind: 'email',
    placeholder: 'name@example.com',
  },
];

export const DEFAULT_CONTACT_TYPE: ContactTypeId = 'home';

export function contactType(id: ContactTypeId): ContactType {
  // The id is a union of the table's own keys, so a miss is impossible —
  // the fallback only satisfies the compiler.
  return CONTACT_TYPES.find((type) => type.id === id) ?? CONTACT_TYPES[0];
}

export type Contact = {
  id: string;
  type: ContactTypeId;
  /** Digits for a phone/fax, the trimmed address for an email. */
  value: string;
};

let sequence = 0;

/** Monotonic ids — stable list keys without pulling in a uuid dependency. */
export function nextContactId(): string {
  sequence += 1;
  return `contact-${sequence}`;
}

/** Everything that is not a digit, dropped. */
export function phoneDigits(input: string): string {
  return input.replace(/\D/g, '');
}

const PHONE_LENGTH = 10;

/**
 * `(555) 123-4567`, filled in progressively as the digits arrive so the field
 * can format while the user is still typing.
 */
export function formatPhone(input: string): string {
  const digits = phoneDigits(input).slice(0, PHONE_LENGTH);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Display form for a stored contact value. */
export function formatContactValue(contact: Contact): string {
  return contactType(contact.type).kind === 'phone' ? formatPhone(contact.value) : contact.value;
}

/** Deliberately loose: `a@b.c` shaped, no attempt to police real mailboxes. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Null when the value is usable, otherwise the message to show under it. */
export function validateContactValue(type: ContactTypeId, value: string): string | null {
  const { kind, label } = contactType(type);
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return kind === 'phone' ? 'Enter a contact number.' : 'Enter an email address.';
  }

  if (kind === 'phone') {
    const digits = phoneDigits(trimmed);
    if (digits.length !== PHONE_LENGTH) {
      return `A ${label.toLowerCase()} needs ${PHONE_LENGTH} digits, including the area code.`;
    }
    return null;
  }

  return EMAIL_PATTERN.test(trimmed) ? null : 'Enter an email address like name@example.com.';
}

/** Storage form: digits for a phone, trimmed text for an email. */
export function normalizeContactValue(type: ContactTypeId, value: string): string {
  return contactType(type).kind === 'phone' ? phoneDigits(value) : value.trim();
}

/** Same type and same value — used to stop a contact being saved twice. */
export function isDuplicateContact(
  contacts: readonly Contact[],
  candidate: Pick<Contact, 'type' | 'value'>,
  ignoreId?: string,
): boolean {
  return contacts.some(
    (contact) =>
      contact.id !== ignoreId &&
      contact.type === candidate.type &&
      contact.value.toLowerCase() === candidate.value.toLowerCase(),
  );
}
