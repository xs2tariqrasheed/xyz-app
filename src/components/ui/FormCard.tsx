import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadowValues, space } from '@/theme';

export type FormCardProps = {
  /** Sits in the card's header bar. */
  title: string;
  /** Optional second line under the title, in the same bar. */
  subtitle?: string;
  children: React.ReactNode;
};

/**
 * A form panel under a solid brand header bar.
 *
 * `overflow: 'hidden'` is what keeps the bar's square top corners inside the
 * card's rounded ones — the bar itself carries no radius.
 */
export function FormCard({ title, subtitle, children }: FormCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: radii.xl,
    overflow: 'hidden',
    boxShadow: shadowValues.md,
  },
  header: {
    backgroundColor: colors.headerBg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    gap: 2,
  },
  title: { color: colors.headerFg, fontSize: 15, fontWeight: '700', letterSpacing: 0.1 },
  subtitle: { color: colors.headerFgMuted, fontSize: 13, lineHeight: 18 },
  body: { padding: space.lg, gap: space.lg },
});
