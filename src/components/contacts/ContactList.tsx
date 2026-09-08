import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { breakpoints, colors, radii, space } from '@/theme';
import { contactType, formatContactValue, type Contact } from '@/utils/contacts';

import { ContactTypeGlyph } from './ContactTypeGlyph';

export type ContactListProps = {
  contacts: readonly Contact[];
  /** The contact reservation confirmations are sent to. */
  primaryId: string | null;
  /** Row currently loaded into the form, highlighted so the pair reads as one. */
  editingId: string | null;
  onEdit: (contact: Contact) => void;
  onRemove: (contact: Contact) => void;
  onMakePrimary: (contact: Contact) => void;
};

export function ContactList({
  contacts,
  primaryId,
  editingId,
  onEdit,
  onRemove,
  onMakePrimary,
}: ContactListProps) {
  const { width } = useWindowDimensions();
  const wide = width >= breakpoints.sm;

  if (contacts.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No contacts saved yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {contacts.map((contact) => (
        <ContactRow
          key={contact.id}
          contact={contact}
          wide={wide}
          isPrimary={contact.id === primaryId}
          isEditing={contact.id === editingId}
          onEdit={() => onEdit(contact)}
          onRemove={() => onRemove(contact)}
          onMakePrimary={() => onMakePrimary(contact)}
        />
      ))}
    </View>
  );
}

type ContactRowProps = {
  contact: Contact;
  wide: boolean;
  isPrimary: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onMakePrimary: () => void;
};

function ContactRow({
  contact,
  wide,
  isPrimary,
  isEditing,
  onEdit,
  onRemove,
  onMakePrimary,
}: ContactRowProps) {
  const { label } = contactType(contact.type);
  // Rows repeat, so each action names the contact it belongs to.
  const describe = `${label} ${formatContactValue(contact)}`;

  return (
    <View style={[styles.row, wide ? styles.rowWide : null, isEditing ? styles.rowEditing : null]}>
      <View style={styles.identity}>
        <View style={[styles.iconWell, isPrimary ? styles.iconWellPrimary : null]}>
          <ContactTypeGlyph
            type={contact.type}
            color={isPrimary ? colors.success : colors.primary[600]}
          />
        </View>

        <View style={styles.text}>
          <View style={styles.labelRow}>
            <Text style={styles.type}>{label}</Text>
            {isPrimary ? <Badge label="PRIMARY" tone="success" /> : null}
            {isEditing ? <Badge label="EDITING" tone="primary" /> : null}
          </View>
          <Text style={styles.value} numberOfLines={1}>
            {formatContactValue(contact)}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        {isPrimary ? null : (
          <RowAction
            label="Make primary"
            a11yLabel={`Make ${describe} your primary contact`}
            onPress={onMakePrimary}
          />
        )}
        <RowAction label="Edit" a11yLabel={`Edit ${describe}`} onPress={onEdit} />
        <RowAction
          label="Remove"
          a11yLabel={`Remove ${describe}`}
          tone="danger"
          onPress={onRemove}
        />
      </View>
    </View>
  );
}

function RowAction({
  label,
  a11yLabel,
  tone = 'link',
  onPress,
}: {
  label: string;
  a11yLabel: string;
  tone?: 'link' | 'danger';
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed ? styles.actionPressed : null]}
    >
      <Text style={[styles.actionLabel, tone === 'danger' ? styles.actionDanger : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md },

  row: {
    gap: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: space.md,
  },
  rowWide: { flexDirection: 'row', alignItems: 'center' },
  rowEditing: { borderColor: colors.primary[300], backgroundColor: colors.surfaceSelected },

  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWellPrimary: { backgroundColor: colors.successBg },
  text: { flex: 1, gap: 2 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  type: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  value: { color: colors.textStrong, fontSize: 16, fontWeight: '600' },

  actions: { flexDirection: 'row', alignItems: 'center', gap: space.xs, flexWrap: 'wrap' },
  action: { borderRadius: radii.sm, paddingHorizontal: space.sm, paddingVertical: space.xs + 2 },
  actionPressed: { backgroundColor: colors.surfaceSunken },
  actionLabel: { color: colors.textLink, fontSize: 13, fontWeight: '600' },
  actionDanger: { color: colors.danger },

  empty: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSunken,
    padding: space.lg,
    gap: space.xs,
  },
  emptyTitle: { color: colors.textStrong, fontSize: 15, fontWeight: '700' },
});
