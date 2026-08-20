import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { PinGlyph, TrashGlyph } from '@/components/ui/Glyph';
import { colors, radii, shadowValues, space } from '@/theme';

import {
  formatAddressLine,
  formatIntlCallback,
  formatLocality,
  formatStreet,
  formatUsCallback,
  type SavedAddress,
} from './savedAddress';

export type SavedAddressListProps = {
  addresses: readonly SavedAddress[];
  /** The row currently loaded into the form, if any. */
  editingId: string | null;
  onEdit: (address: SavedAddress) => void;
  onDelete: (address: SavedAddress) => void;
};

/**
 * The customer's saved locations. Tapping a card loads it into the form —
 * the same "click on for update" affordance as the table it replaces, but one
 * that survives a phone-width screen.
 */
export function SavedAddressList({ addresses, editingId, onEdit, onDelete }: SavedAddressListProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Saved locations</Text>
          <Text style={styles.subtitle}>Tap a location to update it.</Text>
        </View>
        <Badge label={`${addresses.length} SAVED`} tone="muted" />
      </View>

      {addresses.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No saved locations yet</Text>
          <Text style={styles.emptyBody}>
            Add the places you travel from most and they will be one tap away next time you book.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {addresses.map((address) => (
            <SavedAddressRow
              key={address.id}
              address={address}
              editing={address.id === editingId}
              onEdit={() => onEdit(address)}
              onDelete={() => onDelete(address)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

type SavedAddressRowProps = {
  address: SavedAddress;
  editing: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

function SavedAddressRow({ address, editing, onEdit, onDelete }: SavedAddressRowProps) {
  const street = formatStreet(address) || address.city.trim() || 'Untitled location';
  const locality = formatLocality(address);
  const usPhone = formatUsCallback(address);
  const intlPhone = formatIntlCallback(address);

  return (
    // The card is a row of two siblings, never a button inside a button: the
    // web build renders each Pressable as a <button>, and nesting them is
    // invalid HTML that breaks hydration.
    <View style={[styles.row, editing ? styles.rowEditing : null]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${formatAddressLine(address)}`}
        accessibilityState={{ selected: editing }}
        onPress={onEdit}
        style={({ pressed }) => [styles.rowMain, pressed ? styles.rowMainPressed : null]}
      >
        <View style={[styles.pin, editing ? styles.pinEditing : null]}>
          <PinGlyph color={editing ? colors.accent : colors.primary[600]} size={16} />
        </View>

        <View style={styles.rowText}>
          <View style={styles.rowHeading}>
            <Text style={styles.street} numberOfLines={1}>
              {street}
            </Text>
            {editing ? <Badge label="EDITING" tone="accent" /> : null}
          </View>

          {locality ? (
            <Text style={styles.locality} numberOfLines={1}>
              {locality}
            </Text>
          ) : null}

          {address.pickupPoint.trim() ? (
            <Text style={styles.detail} numberOfLines={1}>
              Pickup point · {address.pickupPoint.trim()}
            </Text>
          ) : null}

          {usPhone || intlPhone ? (
            <View style={styles.phones}>
              {usPhone ? <Text style={styles.phone}>{usPhone}</Text> : null}
              {intlPhone ? <Text style={styles.phone}>{intlPhone}</Text> : null}
            </View>
          ) : null}

          {address.directions.trim() ? (
            <Text style={styles.directions} numberOfLines={2}>
              “{address.directions.trim()}”
            </Text>
          ) : null}
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete ${formatAddressLine(address)}`}
        onPress={onDelete}
        hitSlop={6}
        style={({ pressed }) => [styles.delete, pressed ? styles.deletePressed : null]}
      >
        <TrashGlyph color={colors.danger} size={15} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: space.lg,
    gap: space.lg,
    boxShadow: shadowValues.sm,
  },

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  headerText: { flex: 1, gap: 3 },
  title: { color: colors.textHeading, fontSize: 17, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },

  list: { gap: space.md },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: space.md,
  },
  rowEditing: { backgroundColor: colors.accentSubtle, borderColor: colors.warningBorder },
  // The edit target fills the card, so everything but the bin opens the form.
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: space.md, borderRadius: radii.md },
  rowMainPressed: { opacity: 0.7 },

  pin: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinEditing: { backgroundColor: colors.surface },

  rowText: { flex: 1, gap: 2 },
  rowHeading: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  street: { color: colors.textStrong, fontSize: 15, fontWeight: '700' },
  locality: { color: colors.textBody, fontSize: 13 },
  detail: { color: colors.textMuted, fontSize: 12 },
  phones: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: 2 },
  phone: { color: colors.textLink, fontSize: 12, fontWeight: '600' },
  directions: { color: colors.textMuted, fontSize: 12, lineHeight: 17, fontStyle: 'italic', marginTop: 2 },

  delete: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletePressed: { backgroundColor: colors.dangerBorder },

  empty: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.lg,
    padding: space.lg,
    gap: space.xs,
  },
  emptyTitle: { color: colors.textStrong, fontSize: 14, fontWeight: '700' },
  emptyBody: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
});
