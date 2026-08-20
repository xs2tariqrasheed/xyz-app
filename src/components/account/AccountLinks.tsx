import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { ChevronGlyph } from '@/components/ui/Glyph';
import { colors, radii, shadowValues, space } from '@/theme';

type AccountLink = {
  label: string;
  description: string;
  /** Absent while the destination is still to be built. */
  href?: Href;
};

/** The account menu, in the order it appears in the profile drawer. */
const ACCOUNT_LINKS: readonly AccountLink[] = [
  {
    label: 'Update Mailing Address',
    description: 'Where statements and account mail are sent.',
    href: '/mailing-address',
  },
  { label: 'Change Billing Address', description: 'The address your card is registered to.' },
  { label: 'Change Preferences', description: 'Notifications, receipts and ride defaults.' },
  { label: 'My Addresses', description: 'Saved pickup and drop-off addresses.' },
  { label: 'My Contacts', description: 'People you can book a ride for.' },
  { label: 'Change Password', description: 'Update the password on this account.' },
];

/** Account destinations, listed on the profile page. */
export function AccountLinks() {
  const router = useRouter();

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Account</Text>

      {ACCOUNT_LINKS.map((link, index) => {
        // Bound outside the callback so the narrowing survives into it.
        const href = link.href;
        const ready = href !== undefined;

        return (
          <Pressable
            key={link.label}
            accessibilityRole={ready ? 'link' : undefined}
            accessibilityState={{ disabled: !ready }}
            disabled={!ready}
            onPress={href ? () => router.navigate(href) : undefined}
            style={({ pressed }) => [
              styles.row,
              index > 0 ? styles.rowDivided : null,
              pressed && ready ? styles.rowPressed : null,
            ]}
          >
            <View style={styles.text}>
              <Text style={[styles.label, ready ? null : styles.labelIdle]}>{link.label}</Text>
              <Text style={styles.description}>{link.description}</Text>
            </View>

            {ready ? (
              <ChevronGlyph direction="right" color={colors.textMuted} size={7} />
            ) : (
              <Badge label="SOON" tone="muted" />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    paddingHorizontal: space.lg,
    paddingBottom: space.xs,
    boxShadow: shadowValues.sm,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    paddingTop: space.lg,
    paddingBottom: space.sm,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    minHeight: 56,
  },
  rowDivided: { borderTopWidth: 1, borderTopColor: colors.surfaceSunken },
  rowPressed: { backgroundColor: colors.surfaceSelected },
  text: { flex: 1, gap: 2 },
  label: { color: colors.textStrong, fontSize: 15, fontWeight: '600' },
  labelIdle: { color: colors.textMuted },
  description: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
});
