import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, shadowValues, space } from '@/theme';

export type AccountPanelProps = {
  title: string;
  /** Sits at the end of the title bar, e.g. a status badge. */
  trailing?: React.ReactNode;
  /** Footer row, typically the save and cancel buttons. */
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * A titled form panel: navy bar, white body, optional action footer.
 *
 * The account pages are single long forms rather than the reservation's stepped
 * checklist, so they get this instead of `SectionCard`.
 */
export function AccountPanel({ title, trailing, footer, style, children }: AccountPanelProps) {
  return (
    <View style={[styles.panel, style]}>
      <View style={styles.bar}>
        <Text style={styles.barTitle}>{title}</Text>
        {trailing}
      </View>

      <View style={styles.body}>{children}</View>

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    overflow: 'hidden',
    boxShadow: shadowValues.md,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.headerBg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  barTitle: { flex: 1, color: colors.headerFg, fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },

  body: { padding: space.lg, gap: space.lg },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceSunken,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
});
