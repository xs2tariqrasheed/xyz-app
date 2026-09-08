import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { ExpressPickupPanel } from '@/components/home/ExpressPickupPanel';
import { NextRideCard } from '@/components/home/NextRideCard';
import { QuickLinks } from '@/components/home/QuickLinks';
import { RideListPanel } from '@/components/home/RideListPanel';
import { RideStatTiles } from '@/components/home/RideStatTiles';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { DEMO_SESSION } from '@/data/session';
import { loadRideOverview, type RideOverview } from '@/services/rides';
import { breakpoints, space } from '@/theme';
import { formatClockTime, formatFullDate } from '@/utils/datetime';

/** How many rides each dashboard list shows before deferring to /rides. */
const LIST_LIMIT = 3;

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  // Two columns only once the ride column and the express panel both stay
  // readable side by side.
  const twoUp = width >= breakpoints.lg;

  // One "now" for the whole screen, so the counts, the "next ride" pick and
  // the relative dates under it cannot disagree.
  const [now] = useState(() => new Date());
  const [overview, setOverview] = useState<RideOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;

    const settle = (result: RideOverview | null) => {
      if (!live) return;
      setOverview(result);
      setFailed(result === null);
      setLoading(false);
    };

    void loadRideOverview(now).then(settle, () => settle(null));
    return () => {
      live = false;
    };
  }, [now]);

  const { lastLoginAt } = DEMO_SESSION;
  // A car already on the road is what the customer is watching; only with none
  // does the next booking take the featured slot.
  const featured = overview?.active[0] ?? overview?.upcoming[0] ?? null;

  return (
    <Screen
      title={`Welcome back, ${DEMO_SESSION.name}`}
      subtitle={`Last login ${formatFullDate(lastLoginAt)} · ${formatClockTime(lastLoginAt)}`}
      trailing={<Button label="Book a ride" onPress={() => router.navigate('/reserve')} />}
    >
      {failed ? (
        <Notice
          tone="danger"
          title="Your rides could not be loaded"
          message="The dispatch service did not answer. Booking still works."
        />
      ) : null}

      <RideStatTiles overview={overview} now={now} loading={loading} />

      <View style={[styles.columns, twoUp ? styles.columnsWide : null]}>
        <View style={[styles.main, twoUp ? styles.mainWide : null]}>
          <NextRideCard ride={featured} now={now} loading={loading} />

          <RideListPanel
            title="Upcoming rides"
            rides={(overview?.upcoming ?? []).slice(0, LIST_LIMIT)}
            total={overview?.counts.upcoming}
            emptyText="Nothing booked yet."
            loading={loading}
          />

          <RideListPanel
            title="Past rides"
            rides={(overview?.past ?? []).slice(0, LIST_LIMIT)}
            total={overview ? overview.counts.completed + overview.counts.canceled : undefined}
            emptyText="No rides on this account yet."
            loading={loading}
          />
        </View>

        <View style={[styles.aside, twoUp ? styles.asideWide : null]}>
          <ExpressPickupPanel />
          <QuickLinks />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  columns: { gap: space.xl },
  columnsWide: { flexDirection: 'row', alignItems: 'flex-start' },

  main: { gap: space.lg },
  aside: { gap: space.xl },
  // Only in the row layout: `flex` implies a zero basis, which would collapse
  // a stacked column to nothing inside the page's vertical ScrollView.
  mainWide: { flex: 2 },
  asideWide: { flex: 1 },
});
