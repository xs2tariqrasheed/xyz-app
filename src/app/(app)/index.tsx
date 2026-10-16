import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { ExpressPickupPanel } from '@/components/home/ExpressPickupPanel';
import { NextRideCard } from '@/components/home/NextRideCard';
import { QuickLinks } from '@/components/home/QuickLinks';
import { RideListPanel } from '@/components/home/RideListPanel';
import { RideStatTiles } from '@/components/home/RideStatTiles';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { ACTION_CODES, GATEWAY_VIEW_NAME } from '@/constants/actionCodes';
import { HOME_MESSAGES, RIDES_MESSAGES } from '@/constants/messages';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
import { useReservation } from '@/context/ReservationContext';
import { useFetchData } from '@/hooks/useFetchData';
import { allOrdersJData, overviewWindow, type RideOverview, toRideOverview, toRides } from '@/services/rides';
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
  const { session } = useAuth();
  const { startNew } = useReservation();

  // `RES.S.ALL_ORDERS` over a history search's reach either side of today.
  const range = overviewWindow(now);
  const orders = useFetchData(
    ACTION_CODES.ALL_ORDERS,
    GATEWAY_VIEW_NAME,
    allOrdersJData(session?.loginId ?? '', range.from, range.to),
  );
  const mapped = useMemo((): { overview: RideOverview | null; refused: boolean } => {
    if (!orders.data) return { overview: null, refused: false };
    try {
      return { overview: toRideOverview(toRides(orders.data), now), refused: false };
    } catch {
      return { overview: null, refused: true };
    }
  }, [orders.data, now]);
  const overview = mapped.overview;
  const loading = orders.isLoading && !orders.data;
  const failed = orders.isError || mapped.refused;

  const bookRide = () => {
    startNew();
    router.navigate('/reserver-2');
  };

  const { profile } = useProfile();
  const lastLoginAt = profile?.lastLoginAt ?? null;
  // A car already on the road is what the customer is watching; only with none
  // does the next booking take the featured slot.
  const featured = overview?.active[0] ?? overview?.upcoming[0] ?? null;

  return (
    <Screen
      title={profile?.firstName ? HOME_MESSAGES.WELCOME_NAMED(profile.firstName) : HOME_MESSAGES.WELCOME}
      subtitle={
        lastLoginAt
          ? HOME_MESSAGES.LAST_LOGIN(formatFullDate(lastLoginAt), formatClockTime(lastLoginAt))
          : undefined
      }
      trailing={<Button label={HOME_MESSAGES.BOOK_RIDE} onPress={bookRide} />}
    >
      {failed ? (
        <Notice
          tone="danger"
          title={RIDES_MESSAGES.HOME_RIDES_FAILED_TITLE}
          message={RIDES_MESSAGES.HOME_RIDES_FAILED}
        />
      ) : null}

      <RideStatTiles overview={overview} now={now} loading={loading} />

      <View style={[styles.columns, twoUp ? styles.columnsWide : null]}>
        <View style={[styles.main, twoUp ? styles.mainWide : null]}>
          <NextRideCard ride={featured} now={now} loading={loading} onBook={bookRide} />

          <RideListPanel
            title={HOME_MESSAGES.UPCOMING_TITLE}
            rides={(overview?.upcoming ?? []).slice(0, LIST_LIMIT)}
            total={overview?.counts.upcoming}
            emptyText={HOME_MESSAGES.UPCOMING_EMPTY}
            loading={loading}
          />

          <RideListPanel
            title={HOME_MESSAGES.PAST_TITLE}
            rides={(overview?.past ?? []).slice(0, LIST_LIMIT)}
            total={overview ? overview.counts.completed + overview.counts.canceled : undefined}
            emptyText={HOME_MESSAGES.PAST_EMPTY}
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
