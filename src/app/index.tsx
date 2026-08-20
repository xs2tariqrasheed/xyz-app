import { Link } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { ExpressPickupPanel } from '@/components/home/ExpressPickupPanel';
import { WhatsNewPanel } from '@/components/home/WhatsNewPanel';
import { Screen } from '@/components/layout/Screen';
import { breakpoints, colors, space } from '@/theme';

/**
 * Pages worth reaching from home that the header nav does not carry.
 *
 * The two panels cover the main routes, so this is only for the leftovers —
 * without it `/reservation-info` has no inbound link anywhere in the app.
 */
const EXTRA_LINKS = [
  { label: 'Review a booked ride', href: '/reservation-info' },
  { label: 'View color theme', href: '/theme' },
] as const;

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  // Two columns only once the express panel can keep both address lists
  // readable beside the announcement copy.
  const twoUp = width >= breakpoints.lg;

  return (
    <Screen
      title="Our services"
      subtitle="Executive sedan reservations — book ahead, or ride right now."
    >
      <View style={[styles.columns, twoUp ? styles.columnsWide : null]}>
        <WhatsNewPanel style={twoUp ? styles.main : null} />
        <ExpressPickupPanel style={twoUp ? styles.aside : null} />
      </View>

      <View style={styles.extras}>
        {EXTRA_LINKS.map((link) => (
          <Link key={link.href} href={link.href} style={styles.extraLink}>
            <Text>{link.label} →</Text>
          </Link>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  columns: { gap: space.xl },
  columnsWide: { flexDirection: 'row', alignItems: 'flex-start' },
  // Only in the row layout: `flex` implies a zero basis, which would collapse
  // a stacked panel to nothing inside the page's vertical ScrollView.
  main: { flex: 2 },
  aside: { flex: 1 },

  extras: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg },
  extraLink: { color: colors.textLink, fontSize: 14, fontWeight: '600' },
});
