import { Link, useRouter } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { breakpoints, colors, radii, shadowValues, space } from '@/theme';

const QUICK_LINKS = [
  { label: 'Rates', hint: 'What a ride costs', href: '/rates' },
  { label: 'Receipts & Invoices', hint: 'Past rides and paperwork', href: '/receipts' },
  { label: 'Profile', hint: 'Details and saved addresses', href: '/profile' },
] as const;

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const twoUp = width >= breakpoints.sm;

  return (
    <Screen title="Book a ride" subtitle="Schedule one ahead, or call a driver right now.">
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Ready to go?</Text>
        <Text style={styles.heroBody}>
          Reserve a pickup for a date and time that suits you, or flag a live call and we will
          dispatch the nearest driver.
        </Text>
        <View style={[styles.heroActions, twoUp ? styles.heroActionsWide : null]}>
          <Button
            label="Make a reservation"
            size="lg"
            onPress={() => router.navigate('/reserve')}
          />
          <Button
            label="I'm ready now"
            variant="outline"
            size="lg"
            onPress={() => router.navigate('/reserve')}
          />
        </View>
      </View>

      <View style={[styles.links, twoUp ? styles.linksWide : null]}>
        {QUICK_LINKS.map((link) => (
          <Link key={link.href} href={link.href} style={styles.link}>
            <Text style={styles.linkLabel}>{link.label}</Text>
            {'\n'}
            <Text style={styles.linkHint}>{link.hint}</Text>
          </Link>
        ))}
      </View>

      <Link href="/theme" style={styles.themeLink}>
        View color theme →
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: space.xl - 4,
    gap: space.md,
    boxShadow: shadowValues.md,
  },
  heroTitle: { color: colors.textTitle, fontSize: 20, fontWeight: '700' },
  heroBody: { color: colors.textBody, fontSize: 15, lineHeight: 22 },
  heroActions: { gap: space.md, marginTop: space.xs },
  heroActionsWide: { flexDirection: 'row' },

  links: { gap: space.md },
  linksWide: { flexDirection: 'row' },
  link: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: space.lg,
    boxShadow: shadowValues.sm,
  },
  linkLabel: { color: colors.textStrong, fontSize: 15, fontWeight: '700' },
  linkHint: { color: colors.textMuted, fontSize: 13 },

  themeLink: { color: colors.textLink, fontSize: 14, fontWeight: '600', alignSelf: 'flex-start' },
});
