import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ContactForm, type ContactDraft } from '@/components/contacts/ContactForm';
import { ContactList } from '@/components/contacts/ContactList';
import { ContactPanel } from '@/components/contacts/ContactPanel';
import { Screen } from '@/components/layout/Screen';
import { Badge } from '@/components/ui/Badge';
import { Reveal } from '@/components/ui/Reveal';
import { Sheet } from '@/components/ui/Sheet';
import { colors, radii, space } from '@/theme';
import {
  contactType,
  formatContactValue,
  isDuplicateContact,
  nextContactId,
  normalizeContactValue,
  type Contact,
} from '@/utils/contacts';

/** How long a confirmation line stays on screen. */
const NOTICE_MS = 4000;

/** The id makes a repeated message a new notice, so its timer restarts. */
type Notice = { id: number; text: string };

let noticeSequence = 0;
const noticeId = () => (noticeSequence += 1);

/** Stand-in for the saved contacts a signed-in customer would load. */
const SEED_CONTACTS: readonly Contact[] = [
  { id: nextContactId(), type: 'mobile', value: '5550142187' },
  { id: nextContactId(), type: 'email', value: 'a.okafor@example.com' },
];

export default function ContactManagementScreen() {
  const [contacts, setContacts] = useState<readonly Contact[]>(SEED_CONTACTS);
  const [primaryId, setPrimaryId] = useState<string | null>(SEED_CONTACTS[0]?.id ?? null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<Contact | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  // The notice acknowledges the last change and then gets out of the way, so a
  // stale "added" can never sit above a fresh error in the form.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const announce = (text: string) => setNotice({ id: noticeId(), text });

  const editing = contacts.find((contact) => contact.id === editingId) ?? null;

  /** Returns a message when the draft is refused, `null` when it is saved. */
  const submit = (draft: ContactDraft): string | null => {
    const value = normalizeContactValue(draft.type, draft.value);
    const { label } = contactType(draft.type);

    if (isDuplicateContact(contacts, { type: draft.type, value }, editingId ?? undefined)) {
      return `That ${label.toLowerCase()} is already saved.`;
    }

    if (editing) {
      setContacts((current) =>
        current.map((contact) =>
          contact.id === editing.id ? { ...contact, type: draft.type, value } : contact,
        ),
      );
      setEditingId(null);
      announce(`${label} updated.`);
      return null;
    }

    const contact: Contact = { id: nextContactId(), type: draft.type, value };
    setContacts((current) => [...current, contact]);
    // First contact saved becomes the one we confirm reservations on.
    setPrimaryId((current) => current ?? contact.id);
    announce(`${label} added.`);
    return null;
  };

  const cancel = () => {
    setEditingId(null);
    setNotice(null);
  };

  const remove = (contact: Contact) => {
    const rest = contacts.filter((item) => item.id !== contact.id);
    setContacts(rest);
    if (primaryId === contact.id) setPrimaryId(rest[0]?.id ?? null);
    if (editingId === contact.id) setEditingId(null);
    setPendingRemoval(null);
    announce(`${contactType(contact.type).label} removed.`);
  };

  return (
    <Screen
      title="Contact Management"
      subtitle="The numbers and addresses we use to confirm a ride."
    >
      <Stack.Screen options={{ title: 'Contact Management' }} />

      <ContactPanel
        title={editing ? 'Edit your contact' : 'Enter your contact'}
        trailing={editing ? <Badge label="EDITING" tone="primary" /> : null}
      >
        <ContactForm
          // Restarts the draft whenever the row being edited changes.
          key={editing?.id ?? 'new'}
          mode={editing ? 'edit' : 'add'}
          initial={editing ? { type: editing.type, value: editing.value } : undefined}
          onSubmit={submit}
          onCancel={cancel}
        />
      </ContactPanel>

      {notice ? (
        <Reveal key={notice.id}>
          <View style={styles.notice}>
            <Text style={styles.noticeText} role="status">
              {notice.text}
            </Text>
          </View>
        </Reveal>
      ) : null}

      <ContactPanel
        title="My Contacts"
        trailing={
          <Badge
            label={contacts.length === 1 ? '1 SAVED' : `${contacts.length} SAVED`}
            tone="info"
          />
        }
      >
        <ContactList
          contacts={contacts}
          primaryId={primaryId}
          editingId={editingId}
          onEdit={(contact) => {
            setEditingId(contact.id);
            setNotice(null);
          }}
          onRemove={setPendingRemoval}
          onMakePrimary={(contact) => {
            setPrimaryId(contact.id);
            announce(`${contactType(contact.type).label} is now your primary contact.`);
          }}
        />

        {contacts.length > 0 ? (
          <Text style={styles.footnote}>
            Your primary contact is called first when a driver is on the way.
          </Text>
        ) : null}
      </ContactPanel>

      <Sheet
        visible={pendingRemoval !== null}
        title="Remove this contact?"
        subtitle="It will no longer be used for pickup confirmations."
        confirmLabel="Remove"
        onClose={() => setPendingRemoval(null)}
        onConfirm={() => {
          if (pendingRemoval) remove(pendingRemoval);
        }}
      >
        {pendingRemoval ? (
          <View style={styles.confirm}>
            <Text style={styles.confirmType}>{contactType(pendingRemoval.type).label}</Text>
            <Text style={styles.confirmValue}>{formatContactValue(pendingRemoval)}</Text>
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: {
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: radii.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
  },
  noticeText: { color: colors.success, fontSize: 13, fontWeight: '600' },

  footnote: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },

  confirm: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSunken,
    padding: space.md,
    gap: 2,
  },
  confirmType: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  confirmValue: { color: colors.textStrong, fontSize: 16, fontWeight: '600' },
});
