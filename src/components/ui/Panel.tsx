import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, shadowValues, space } from '@/theme';

export type PanelProps = {
  /** Sits in the brand-coloured bar across the top of the card. */
  title: string;
  /** Optional action row, divided off at the foot of the card. */
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * A titled account card: brand header bar, padded body, optional footer.
 *
 * The header bar is what separates one settings panel from the next on a
 * long account page, so it stays part of the card rather than the page.
 */
export function Panel({ title, footer, style, children }: PanelProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.body}>{children}</View>

      {footer ? (
        <>
          <View style={styles.divider} />
          <View style={styles.footer}>{footer}</View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    // Keeps the header bar's own corners inside the card's rounding.
    overflow: 'hidden',
    boxShadow: shadowValues.sm,
  },
  header: {
    backgroundColor: colors.headerBg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  title: { color: colors.headerFg, fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },

  body: { padding: space.lg, gap: space.lg },
  divider: { height: 1, backgroundColor: colors.border },
  footer: { padding: space.lg },
});
