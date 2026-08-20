import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, shadowValues, space } from '@/theme';

export type ContactPanelProps = {
  title: string;
  /** Sits at the end of the title bar, e.g. a count badge. */
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * Card with a navy title bar — the contact page's own block, carried over
 * from the desk app it replaces.
 */
export function ContactPanel({ title, trailing, style, children }: ContactPanelProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.bar}>
        <Text style={styles.title}>{title}</Text>
        {trailing}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    overflow: 'hidden',
    boxShadow: shadowValues.sm,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.headerBg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  title: { flex: 1, color: colors.headerFg, fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  body: { padding: space.lg, gap: space.lg },
});
