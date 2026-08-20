import { Link } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { ExpressPickupPanel } from '@/components/home/ExpressPickupPanel';
import { WhatsNewPanel } from '@/components/home/WhatsNewPanel';
import { Screen } from '@/components/layout/Screen';
import { breakpoints, colors, space } from '@/theme';

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

      <Link href="/theme" style={styles.themeLink}>
        View color theme →
      </Link>
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

  themeLink: { color: colors.textLink, fontSize: 14, fontWeight: '600', alignSelf: 'flex-start' },
});
