import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AddressForm } from '@/components/addresses/AddressForm';
import { SavedAddressList } from '@/components/addresses/SavedAddressList';
import {
  emptyDraft,
  formatAddressLine,
  hasErrors,
  toDraft,
  validateDraft,
  type AddressDraft,
  type AddressErrors,
  type SavedAddress,
} from '@/components/addresses/savedAddress';
import { AppHeader } from '@/components/nav/AppHeader';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Sheet } from '@/components/ui/Sheet';
import { ADDRESS_BOOK_MESSAGES as M } from '@/constants/messages';
import { useSavedPlaces } from '@/context/SavedPlacesContext';
import { AddressBookError } from '@/services/addressBook';
import { getErrorDisplay } from '@/services/gateway';
import { breakpoints, colors, contentMaxWidth, formMaxWidth, radii, space } from '@/theme';

/** How long a confirmation line stays on screen. */
const NOTICE_MS = 4000;

/** The gateway's own refusal, or friendly copy for anything else. */
function describeError(error: unknown): string {
  if (error instanceof AddressBookError) return error.message;
  return getErrorDisplay(error).customDescription;
}

/**
 * My Addresses (reverse-engineer-implemented/guide/11): the saved locations from
 * `PROF.S.USER_ADDRESSES`, added, changed and deleted through the
 * `PROF.I/U/D.USER_ADDRESS` codes. The list is the one Home and the booking
 * form use, so a change here shows up there too.
 */
export default function AddressesScreen() {
  const { width } = useWindowDimensions();
  // Wide enough to keep the form and the saved list side by side.
  const wide = width >= breakpoints.lg;
  const scrollRef = useRef<ScrollView>(null);

  const { addresses, isLoading, errorDisplay, refetch, saveAddress, deleteAddress } = useSavedPlaces();

  const [draft, setDraft] = useState<AddressDraft>(emptyDraft);
  const [errors, setErrors] = useState<AddressErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SavedAddress | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // The confirmation acknowledges the last change, then gets out of the way.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const resetForm = () => {
    setDraft(emptyDraft());
    setErrors({});
    setFormError(null);
    setEditingId(null);
  };

  const changeDraft = (next: AddressDraft) => {
    setDraft(next);
    setFormError(null);
    // Clear a field's error the moment it is edited, so the form stops
    // scolding the customer while they are fixing it.
    setErrors((current) => {
      const remaining = { ...current };
      let cleared = false;

      for (const key of Object.keys(remaining) as (keyof AddressDraft)[]) {
        if (next[key] !== draft[key]) {
          delete remaining[key];
          cleared = true;
        }
      }

      return cleared ? remaining : current;
    });
  };

  const submit = async () => {
    if (saving) return;
    const found = validateDraft(draft);
    setErrors(found);
    setFormError(null);
    if (hasErrors(found)) return;

    setSaving(true);
    try {
      await saveAddress(draft, editingId ?? undefined);
      setNotice(editingId ? M.UPDATED : M.ADDED);
      resetForm();
    } catch (error) {
      setFormError(describeError(error));
    } finally {
      setSaving(false);
    }
  };

  const edit = (address: SavedAddress) => {
    setDraft(toDraft(address));
    setErrors({});
    setFormError(null);
    setEditingId(address.id);
    // On a narrow screen the form is above the list, so bring it back into view.
    if (!wide) scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const askDelete = (address: SavedAddress) => {
    setDeleteError(null);
    setPendingDelete(address);
  };

  const confirmDelete = async () => {
    if (!pendingDelete || deleting) return;

    setDeleting(true);
    try {
      await deleteAddress(pendingDelete.id);
      if (editingId === pendingDelete.id) resetForm();
      setPendingDelete(null);
      setNotice(M.DELETED);
    } catch (error) {
      setDeleteError(describeError(error));
    } finally {
      setDeleting(false);
    }
  };

  // The previous list stays on screen while a reload is in flight; only a
  // first load (or a failed one) replaces it.
  const firstLoad = isLoading && addresses.length === 0;
  const loadFailed = !isLoading && errorDisplay !== undefined && addresses.length === 0;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: M.SCREEN_TITLE }} />

      <AppHeader title={M.SCREEN_TITLE} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={[styles.page, wide ? styles.pageWide : null]}>
            <View style={[styles.formColumn, wide ? styles.formColumnWide : null]}>
              {notice ? <Notice tone="success" title={notice} /> : null}
              <AddressForm
                draft={draft}
                errors={errors}
                editing={editingId !== null}
                saving={saving}
                formError={formError}
                onChange={changeDraft}
                onSubmit={submit}
                onCancel={resetForm}
              />
            </View>

            <View style={wide ? styles.listColumnWide : null}>
              {firstLoad ? (
                <View style={styles.status}>
                  <ActivityIndicator color={colors.primary[600]} />
                </View>
              ) : loadFailed ? (
                <View style={styles.status}>
                  <Notice
                    tone="danger"
                    title={M.LOAD_FAILED_TITLE}
                    message={errorDisplay?.customDescription ?? M.LOAD_REJECTED}
                  />
                  <Button label={M.RETRY} variant="outline" onPress={refetch} />
                </View>
              ) : (
                <SavedAddressList
                  addresses={addresses}
                  editingId={editingId}
                  onEdit={edit}
                  onDelete={askDelete}
                />
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Sheet
        visible={pendingDelete !== null}
        title={M.DELETE_TITLE}
        subtitle={M.DELETE_SUBTITLE}
        confirmLabel={deleting ? M.DELETING : M.DELETE_CONFIRM}
        confirmVariant="danger"
        confirmDisabled={deleting}
        onClose={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={confirmDelete}
      >
        {pendingDelete ? (
          <View style={styles.confirmBody}>
            <View style={styles.confirm}>
              <Text style={styles.confirmAddress}>{formatAddressLine(pendingDelete)}</Text>
              {pendingDelete.pickupPoint.trim() ? (
                <Text style={styles.confirmDetail}>{pendingDelete.pickupPoint.trim()}</Text>
              ) : null}
            </View>
            {deleteError ? <Alert tone="danger" title={M.DELETE_FAILED_TITLE} message={deleteError} /> : null}
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },

  scrollContent: { paddingHorizontal: space.lg, paddingTop: space.xl, paddingBottom: space.xxl },
  page: { width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center', gap: space.lg },
  pageWide: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xl },
  // `flex` only once the page is a row — in the stacked layout the columns
  // take their height from their content.
  formColumn: { maxWidth: formMaxWidth, gap: space.lg },
  formColumnWide: { flex: 1.4 },
  listColumnWide: { flex: 1 },

  status: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: space.lg,
    gap: space.md,
    minHeight: 96,
    justifyContent: 'center',
  },

  confirmBody: { gap: space.md },
  confirm: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.md,
    padding: space.md,
    gap: 2,
  },
  confirmAddress: { color: colors.textStrong, fontSize: 14, fontWeight: '700' },
  confirmDetail: { color: colors.textMuted, fontSize: 13 },
});
