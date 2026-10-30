import { CONTACTS_MESSAGES } from '@/constants/messages';
import { type GatewayJData, type GatewayResponse, mapRowsByHeadings } from '@/services/gateway';
import { assertResultCode, toInt } from '@/services/gatewayRows';
import { type Contact, contactType, contactTypeByColumn, fromStoredValue } from '@/utils/contacts';

/**
 * My Contacts (reverse-engineer-implemented/guide/12) over the gateway. Contacts are
 * profile "column values": `PROF.S.PROFILE_COLUMN_VALUES` lists them, and
 * `PROF.I` / `PROF.U` / `PROF.D.PROFILE_COLUMN_VALUE` add, change and remove
 * one, identified by its column id and value.
 */

/** A request the gateway refused; the message is its `o_message`. */
export class ContactsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContactsError';
  }
}

/** The `PROF.S.PROFILE_COLUMN_VALUES` headings (docs/XYZ_INTEGRATION_GUIDE.md §10). */
const CONTACT_HEADINGS = ['oColumnId', 'oColumnValue'] as const;

/**
 * Rows → contacts, each field read by its heading. The same column space holds
 * non-contact values (the contract's sample stores a ride reason), so only the
 * five contact types are kept.
 */
export function toContacts(response: GatewayResponse): Contact[] {
  return mapRowsByHeadings(response, CONTACT_HEADINGS).flatMap((row) => {
    const type = contactTypeByColumn(toInt(row.oColumnId, -1));
    const stored = row.oColumnValue.trim();
    if (!type || !stored) return [];
    return [{ id: `${type.columnId}:${stored}`, type: type.id, stored, ...fromStoredValue(type.id, stored) }];
  });
}

/** `JData` for {@link ACTION_CODES.PROFILE_COLUMN_VALUES}. */
export function contactsJData(loginId: string): GatewayJData {
  return { P_LOGIN_ID: loginId };
}

/** `JData` for {@link ACTION_CODES.ADD_PROFILE_COLUMN_VALUE}. */
export function addContactJData(loginId: string, type: Contact['type'], stored: string): GatewayJData {
  return { P_LOGIN_ID: loginId, P_COLUMN_ID: contactType(type).columnId, P_COLUMN_VALUE: stored };
}

/** `JData` for {@link ACTION_CODES.UPDATE_PROFILE_COLUMN_VALUE}: same type, new value. */
export function updateContactJData(loginId: string, contact: Contact, stored: string): GatewayJData {
  return {
    P_LOGIN_ID: loginId,
    P_COLUMN_ID: contactType(contact.type).columnId,
    P_COLUMN_VALUE_OLD: contact.stored,
    P_COLUMN_VALUE_NEW: stored,
  };
}

/** `JData` for {@link ACTION_CODES.DELETE_PROFILE_COLUMN_VALUE}. */
export function deleteContactJData(loginId: string, contact: Contact): GatewayJData {
  return { P_LOGIN_ID: loginId, P_COLUMN_ID: contactType(contact.type).columnId, P_COLUMN_VALUE: contact.stored };
}

/** Throws unless the write's row 0 carries `o_code` "0"; a missing code fails closed. */
export function assertContactSaved(response: GatewayResponse): void {
  assertResultCode(response, (message) => new ContactsError(message), CONTACTS_MESSAGES.SAVE_REJECTED);
}

export function assertContactRemoved(response: GatewayResponse): void {
  assertResultCode(response, (message) => new ContactsError(message), CONTACTS_MESSAGES.REMOVE_REJECTED);
}
