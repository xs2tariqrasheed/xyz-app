import { Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ContactForm, type ContactDraft } from '@/components/contacts/ContactForm';
import { ContactList } from '@/components/contacts/ContactList';
import { ContactPanel } from '@/components/contacts/ContactPanel';
import { Screen } from '@/components/layout/Screen';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Reveal } from '@/components/ui/Reveal';
import { Sheet } from '@/components/ui/Sheet';
import { ACTION_CODES, GATEWAY_VIEW_NAME } from '@/constants/actionCodes';
import { CONTACTS_MESSAGES as M } from '@/constants/messages';
import { useAuth } from '@/context/AuthContext';
import { useFetchData } from '@/hooks/useFetchData';
import { usePostData } from '@/hooks/usePostData';
import {
  addContactJData,
  assertContactRemoved,
  assertContactSaved,
  ContactsError,
  contactsJData,
  deleteContactJData,
  toContacts,
  updateContactJData,
} from '@/services/contacts';
import { getErrorDisplay } from '@/services/gateway';
import { colors, radii, space } from '@/theme';
import {
  type Contact,
  contactType,
  formatContactValue,
  isDuplicateContact,
  toStoredValue,
} from '@/utils/contacts';

/** How long a confirmation line stays on screen. */
const NOTICE_MS = 4000;

/** The id makes a repeated message a new notice, so its timer restarts. */
type Flash = { id: number; text: string };

let noticeSequence = 0;
const noticeId = () => (noticeSequence += 1);

/** The gateway's own refusal, or friendly copy for anything else. */
function describeError(error: unknown): string {
  if (error instanceof ContactsError) return error.message;
  return getErrorDisplay(error).customDescription;
}

/**
 * My Contacts (reverse-engineer-implemented/guide/12): the profile's extra phones and
 * e-mails from `PROF.S.PROFILE_COLUMN_VALUES`, changed through the
 * `PROF.I/U/D.PROFILE_COLUMN_VALUE` codes. Booking offers them as callback and
 * e-mail choices.
 */
export default function ContactsScreen() {
  const { session } = useAuth();
  const loginId = session?.loginId ?? '';

  const { data, isLoading, errorDisplay, refetch } = useFetchData(
    ACTION_CODES.PROFILE_COLUMN_VALUES,
    GATEWAY_VIEW_NAME,
    contactsJData(loginId),
  );
  const { mutateAsync: send } = usePostData();

  // A refusal inside the record set is a load error too, not an empty list.
  const loaded = useMemo((): { contacts: readonly Contact[]; error?: string } => {
    if (!data) return { contacts: [] };
    try {
      return { contacts: toContacts(data) };
    } catch (error) {
      return { contacts: [], error: describeError(error) };
    }
  }, [data]);
  const { contacts } = loaded;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<Contact | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Flash | null>(null);

  // The notice acknowledges the last change and then gets out of the way, so a
  // stale "added" can never sit above a fresh error in the form.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const announce = (text: string) => setNotice({ id: noticeId(), text });

  const editing = contacts.find((contact) => contact.id === editingId) ?? null;

  /** Resolves with a message when the draft is refused, `null` when it is saved. */
  const submit = async (draft: ContactDraft): Promise<string | null> => {
    const stored = toStoredValue(draft.type, draft.value, draft.extension);
    if (isDuplicateContact(contacts, { type: draft.type, stored }, editing?.id)) return M.DUPLICATE;

    try {
      if (!editing) {
        assertContactSaved(
          await send(ACTION_CODES.ADD_PROFILE_COLUMN_VALUE, GATEWAY_VIEW_NAME, addContactJData(loginId, draft.type, stored), {
            retry: false,
          }),
        );
      } else if (editing.type === draft.type) {
        assertContactSaved(
          await send(
            ACTION_CODES.UPDATE_PROFILE_COLUMN_VALUE,
            GATEWAY_VIEW_NAME,
            updateContactJData(loginId, editing, stored),
            { retry: false },
          ),
        );
      } else {
        // The contract has no "change type" call: the value moves to the new
        // column. Add first, so a failure never leaves the contact deleted.
        assertContactSaved(
          await send(ACTION_CODES.ADD_PROFILE_COLUMN_VALUE, GATEWAY_VIEW_NAME, addContactJData(loginId, draft.type, stored), {
            retry: false,
          }),
        );
        assertContactRemoved(
          await send(ACTION_CODES.DELETE_PROFILE_COLUMN_VALUE, GATEWAY_VIEW_NAME, deleteContactJData(loginId, editing), {
            retry: false,
          }),
        );
      }
    } catch (error) {
      return describeError(error);
    }

    setEditingId(null);
    announce(editing ? M.UPDATED : M.ADDED);
    refetch();
    return null;
  };

  const askRemove = (contact: Contact) => {
    setRemoveError(null);
    setPendingRemoval(contact);
  };

  const remove = async () => {
    if (!pendingRemoval || removing) return;

    setRemoving(true);
    try {
      assertContactRemoved(
        await send(
          ACTION_CODES.DELETE_PROFILE_COLUMN_VALUE,
          GATEWAY_VIEW_NAME,
          deleteContactJData(loginId, pendingRemoval),
          { retry: false },
        ),
      );
      if (editingId === pendingRemoval.id) setEditingId(null);
      setPendingRemoval(null);
      announce(M.REMOVED);
      refetch();
    } catch (error) {
      setRemoveError(describeError(error));
    } finally {
      setRemoving(false);
    }
  };

  // The previous list stays on screen while a reload is in flight.
  const firstLoad = isLoading && !data;
  const loadError = loaded.error ?? (!isLoading && !data ? errorDisplay?.customDescription : undefined);

  return (
    <Screen title={M.SCREEN_TITLE}>
      <Stack.Screen options={{ title: M.SCREEN_TITLE }} />

      <ContactPanel
        title={editing ? M.FORM_TITLE_EDIT : M.FORM_TITLE_ADD}
        trailing={editing ? <Badge label={M.BADGE_EDITING} tone="primary" /> : null}
      >
        <ContactForm
          // Restarts the draft whenever the row being edited changes.
          key={editing?.id ?? 'new'}
          mode={editing ? 'edit' : 'add'}
          initial={editing ? { type: editing.type, value: editing.value, extension: editing.extension } : undefined}
          onSubmit={submit}
          onCancel={() => {
            setEditingId(null);
            setNotice(null);
          }}
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
        title={M.LIST_TITLE}
        trailing={loadError || firstLoad ? null : <Badge label={`${contacts.length} ${M.SAVED_BADGE}`} tone="info" />}
      >
        {firstLoad ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary[600]} />
          </View>
        ) : loadError ? (
          <View style={styles.failed}>
            <Notice tone="danger" title={M.LOAD_FAILED_TITLE} message={loadError} />
            <Button label={M.RETRY} variant="outline" onPress={refetch} />
          </View>
        ) : (
          <ContactList
            contacts={contacts}
            editingId={editingId}
            onEdit={(contact) => {
              setEditingId(contact.id);
              setNotice(null);
            }}
            onRemove={askRemove}
          />
        )}
      </ContactPanel>

      <Sheet
        visible={pendingRemoval !== null}
        title={M.REMOVE_TITLE}
        subtitle={M.REMOVE_SUBTITLE}
        confirmLabel={removing ? M.REMOVING : M.REMOVE_CONFIRM}
        confirmVariant="danger"
        confirmDisabled={removing}
        onClose={() => {
          if (!removing) setPendingRemoval(null);
        }}
        onConfirm={remove}
      >
        {pendingRemoval ? (
          <View style={styles.confirmBody}>
            <View style={styles.confirm}>
              <Text style={styles.confirmType}>{contactType(pendingRemoval.type).label}</Text>
              <Text style={styles.confirmValue}>{formatContactValue(pendingRemoval)}</Text>
            </View>
            {removeError ? <Alert tone="danger" title={M.REMOVE_FAILED_TITLE} message={removeError} /> : null}
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

  loading: { minHeight: 72, alignItems: 'center', justifyContent: 'center' },
  failed: { gap: space.md },

  confirmBody: { gap: space.md },
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
