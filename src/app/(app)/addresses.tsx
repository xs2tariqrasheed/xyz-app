import { Stack } from 'expo-router';
import { useRef, useState } from 'react';
import {
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
  nextAddressId,
  toDraft,
  validateDraft,
  type AddressDraft,
  type AddressErrors,
  type SavedAddress,
  SEED_ADDRESSES,
} from '@/components/addresses/savedAddress';
import { AppHeader } from '@/components/nav/AppHeader';
import { Sheet } from '@/components/ui/Sheet';
import { breakpoints, colors, contentMaxWidth, formMaxWidth, radii, space } from '@/theme';

export default function AddressesScreen() {
  const { width } = useWindowDimensions();
  // Wide enough to keep the form and the saved list side by side.
  const wide = width >= breakpoints.lg;
  const scrollRef = useRef<ScrollView>(null);

  const [addresses, setAddresses] = useState<readonly SavedAddress[]>(SEED_ADDRESSES);
  const [draft, setDraft] = useState<AddressDraft>(emptyDraft);
  const [errors, setErrors] = useState<AddressErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SavedAddress | null>(null);

  const resetForm = () => {
    setDraft(emptyDraft());
    setErrors({});
    setEditingId(null);
  };

  const changeDraft = (next: AddressDraft) => {
    setDraft(next);
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

  const submit = () => {
    const found = validateDraft(draft);
    setErrors(found);
    if (hasErrors(found)) return;

    setAddresses((current) =>
      editingId
        ? current.map((address) => (address.id === editingId ? { ...draft, id: editingId } : address))
        : [...current, { ...draft, id: nextAddressId() }],
    );
    resetForm();
  };

  const edit = (address: SavedAddress) => {
    setDraft(toDraft(address));
    setErrors({});
    setEditingId(address.id);
    // On a narrow screen the form is above the list, so bring it back into view.
    if (!wide) scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;

    setAddresses((current) => current.filter((address) => address.id !== pendingDelete.id));
    if (editingId === pendingDelete.id) resetForm();
    setPendingDelete(null);
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: 'Addresses' }} />

      <AppHeader title="Addresses" />

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
              <AddressForm
                draft={draft}
                errors={errors}
                editing={editingId !== null}
                onChange={changeDraft}
                onSubmit={submit}
                onCancel={resetForm}
              />
            </View>

            <View style={wide ? styles.listColumnWide : null}>
              <SavedAddressList
                addresses={addresses}
                editingId={editingId}
                onEdit={edit}
                onDelete={setPendingDelete}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Sheet
        visible={pendingDelete !== null}
        title="Delete this location?"
        subtitle="It will no longer be offered when you book a ride."
        confirmLabel="Delete"
        confirmVariant="danger"
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      >
        {pendingDelete ? (
          <View style={styles.confirm}>
            <Text style={styles.confirmAddress}>{formatAddressLine(pendingDelete)}</Text>
            {pendingDelete.pickupPoint.trim() ? (
              <Text style={styles.confirmDetail}>{pendingDelete.pickupPoint.trim()}</Text>
            ) : null}
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
  formColumn: { maxWidth: formMaxWidth },
  formColumnWide: { flex: 1.4 },
  listColumnWide: { flex: 1 },

  confirm: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.md,
    padding: space.md,
    gap: 2,
  },
  confirmAddress: { color: colors.textStrong, fontSize: 14, fontWeight: '700' },
  confirmDetail: { color: colors.textMuted, fontSize: 13 },
});
