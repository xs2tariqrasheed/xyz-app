import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { colors, radii, shadowValues, space } from '@/theme';

export type ComingSoonProps = {
  /** One line on what will live here. */
  blurb: string;
};

/** Placeholder body for the menu destinations that are not built yet. */
export function ComingSoon({ blurb }: ComingSoonProps) {
  return (
    <View style={styles.card}>
      <Badge label="COMING SOON" tone="muted" style={styles.badge} />
      <Text style={styles.blurb}>{blurb}</Text>

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
  link: { color: colors.textLink, fontSize: 15, fontWeight: '600', marginTop: space.xs },
});
