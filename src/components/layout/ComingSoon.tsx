import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { colors, radii, shadowValues, space } from '@/theme';

export type ComingSoonProps = {
  blurb: string;
  /** What this section will hold once it is built. */
  points: readonly string[];
};

/** Placeholder body for the menu destinations that are not built yet. */
export function ComingSoon({ blurb, points }: ComingSoonProps) {
  return (
    <View style={styles.card}>
      <Badge label="COMING SOON" tone="muted" style={styles.badge} />
      <Text style={styles.blurb}>{blurb}</Text>

      <View style={styles.points}>
        {points.map((point) => (
          <View key={point} style={styles.point}>
            <View style={styles.bullet} />
            <Text style={styles.pointLabel}>{point}</Text>
          </View>
        ))}
      </View>

      <Link href="/reserve" style={styles.link}>
        Make a reservation →
      </Link>
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
    gap: space.md,
    boxShadow: shadowValues.sm,
  },
  badge: { alignSelf: 'flex-start' },
  blurb: { color: colors.textBody, fontSize: 15, lineHeight: 22 },
  points: { gap: space.sm },
  point: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary[300] },
  pointLabel: { flex: 1, color: colors.textStrong, fontSize: 14 },
  link: { color: colors.textLink, fontSize: 15, fontWeight: '600', marginTop: space.xs },
});
