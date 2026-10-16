import { CONTACTS_MESSAGES } from '@/constants/messages';
import type { GatewayJData, GatewayResponse } from '@/services/gateway';
import { assertResultCode, pick, recordSet, toInt } from '@/services/gatewayRows';
import { type Contact, contactType, contactTypeByColumn, fromStoredValue } from '@/utils/contacts';

/**
 * My Contacts (reverse-engineer-guide/12) over the gateway. Contacts are
 * profile "column values": `PROF.S.LOAD_PROFILE_COLUMN_VALUES` lists them, and
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

/**
 * The load's outputs are undocumented. Column names per field: the contract's
 * own parameter names first, then the old site's (`GetPhoneList` /
 * `GetEmailList`, guide 05 §3.3).
 */
const COLUMNS = {
  columnId: ['column_id', 'contact_type_id', 'contacttypeid', 'type_id', 'contact_type'],
  value: ['column_value', 'contact_number', 'completecontactnumber', 'contactnumber', 'value', 'o_columnvalue'],
} as const;

/**
 * Rows → contacts. The same column space holds non-contact values (the
 * contract's sample stores a ride reason), so only the five contact types are
 * kept. A refusal (`o_code` ≠ "0") throws {@link ContactsError}.
 */
export function toContacts(response: GatewayResponse): Contact[] {
  const rows = recordSet(response, (message) => new ContactsError(message), CONTACTS_MESSAGES.LOAD_REJECTED);
  return rows.flatMap((row) => {
    const type = contactTypeByColumn(toInt(pick(row, COLUMNS.columnId), -1));
    const stored = pick(row, COLUMNS.value);
    if (!type || !stored) return [];
    return [{ id: `${type.columnId}:${stored}`, type: type.id, stored, ...fromStoredValue(type.id, stored) }];
  });
}

/** `JData` for {@link ACTION_CODES.LOAD_PROFILE_COLUMN_VALUES}. */
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
