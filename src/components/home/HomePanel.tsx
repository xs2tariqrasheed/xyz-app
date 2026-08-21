import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, shadowValues, space } from '@/theme';

export type HomePanelProps = {
  /** Section heading that sits above the panel, e.g. "What's New". */
  heading: string;
  /** Bold line in the panel's navy bar. */
  barTitle: string;
  /** Inset text at the end of the bar, e.g. the last login stamp. */
  barMeta?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * A titled home-page panel: section heading, navy bar, bordered body.
 *
 * The bar wraps to a second line rather than truncating, so a long meta stamp
 * stays readable on a phone.
 */
export function HomePanel({ heading, barTitle, barMeta, style, children }: HomePanelProps) {
  return (
    <View style={[styles.root, style]}>
      <Text style={styles.heading}>{heading}</Text>

      <View style={styles.panel}>
        <View style={styles.bar} accessibilityRole="header">
          <Text style={styles.barTitle}>{barTitle}</Text>
          {barMeta ? <Text style={styles.barMeta}>{barMeta}</Text> : null}
        </View>

        <View style={styles.body}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm, flexShrink: 1 },
  heading: { color: colors.textTitle, fontSize: 18, fontWeight: '800', letterSpacing: 0.2 },

  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: radii.lg,
    overflow: 'hidden',
    boxShadow: shadowValues.md,
  },

  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.headerBg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md - 2,
  },
  barTitle: { color: colors.headerFg, fontSize: 15, fontWeight: '700' },
  barMeta: {
    color: colors.headerFgMuted,
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: colors.primary[700],
    borderRadius: radii.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },

  body: { padding: space.lg, gap: space.lg },
});
