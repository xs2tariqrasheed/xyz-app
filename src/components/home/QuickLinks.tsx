import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { ChevronGlyph } from '@/components/ui/Glyph';
import { colors, radii, shadowValues, space } from '@/theme';

type QuickLink = { label: string; href: Href };

/**
 * The pages worth reaching from home that the ride panels do not cover —
 * including `/reservation-info` and `/theme`, which nothing else links to.
 */
const LINKS: readonly QuickLink[] = [
  { label: 'Review a booked ride', href: '/reservation-info' },
  { label: 'Receipts & invoices', href: '/receipts' },
  { label: 'Saved addresses', href: '/addresses' },
  { label: 'Color theme', href: '/theme' },
];

export function QuickLinks({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title}>Quick links</Text>

      {LINKS.map((link, index) => (
        <Link key={link.label} href={link.href} asChild>
          <Pressable accessibilityRole="link" accessibilityLabel={link.label}>
            {({ pressed }) => (
              <View style={[styles.row, index > 0 ? styles.rowDivided : null, pressed ? styles.pressed : null]}>
                <Text style={styles.label}>{link.label}</Text>
                <ChevronGlyph direction="right" color={colors.textMuted} size={7} />
              </View>
            )}
          </Pressable>
        </Link>
      ))}
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
    paddingBottom: space.sm,
    boxShadow: shadowValues.sm,
  },
  title: {
    color: colors.textTitle,
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingVertical: space.md,
  },
  rowDivided: { borderTopWidth: 1, borderTopColor: colors.border },
  pressed: { opacity: 0.6 },
  label: { color: colors.textStrong, fontSize: 14, fontWeight: '500' },
});
