import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, shadowValues, space } from '@/theme';

export type PanelCardProps = {
  /** Sits in the brand header bar. */
  title: string;
  /** Optional line under the title, still inside the bar. */
  subtitle?: string;
  /** End of the header bar, e.g. a status badge. */
  trailing?: React.ReactNode;
  /** Divided-off action row under the body. */
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * A titled panel: brand header bar over a white body.
 *
 * The account screens group their fields in these, where the reservation flow
 * uses the numbered `SectionCard` instead.
 */
export function PanelCard({ title, subtitle, trailing, footer, style, children }: PanelCardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {trailing}
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
    // Keeps the header bar's corners inside the card's radius.
    overflow: 'hidden',
    boxShadow: shadowValues.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.headerBg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  headerText: { flex: 1, gap: 2 },
  title: { color: colors.headerFg, fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  subtitle: { color: colors.headerFgMuted, fontSize: 12, lineHeight: 16 },

  body: { padding: space.lg, gap: space.lg },
  divider: { height: 1, backgroundColor: colors.border },
  footer: { padding: space.lg },
});
