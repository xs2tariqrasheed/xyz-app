import { Stack } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { RideResults } from '@/components/rides/RideResults';
import type { RideAction } from '@/components/rides/RideActionLink';
import { RideSearchForm, type RideSearchFormValue } from '@/components/rides/RideSearchForm';
import { searchRides, type Ride } from '@/services/rides';
import { colors, radii, space } from '@/theme';
import { addDays, startOfDay } from '@/utils/datetime';

/** How far back the history goes, and how far ahead the default range looks. */
const HISTORY_DAYS = 365;
const DEFAULT_FROM_OFFSET = -90;
const DEFAULT_TO_OFFSET = 30;

const ACTION_NOTICES: Record<RideAction, (ride: Ride) => string> = {
  modify: (ride) => `Editing ride ${ride.id} opens once the dispatch API is connected.`,
  cancel: (ride) => `Cancelling ride ${ride.id} needs the dispatch API — nothing has been changed.`,
  feedback: (ride) => `Feedback for ride ${ride.id} will post once the dispatch API is connected.`,
};

export default function RideSearchScreen() {
  // One "now" for the whole screen, so the calendar floor, the default range
  // and the "can this still be modified?" test cannot disagree.
  const [today] = useState(() => new Date());
  const [earliest] = useState(() => addDays(startOfDay(today), -HISTORY_DAYS));

  const [filters, setFilters] = useState<RideSearchFormValue>(() => ({
    from: addDays(startOfDay(today), DEFAULT_FROM_OFFSET),
    to: addDays(startOfDay(today), DEFAULT_TO_OFFSET),
    paymentMethod: 'all',
  }));

  const [rides, setRides] = useState<readonly Ride[]>([]);
  // The range the listed rides belong to — it only catches up with the form
  // when a search actually returns, so the header never lies about the results.
  const [range, setRange] = useState({ from: filters.from, to: filters.to });
  const [loading, setLoading] = useState(true);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Only the newest request may write to state: a second Search tapped while
  // the first is in flight must not be overwritten by the slower answer.
  const requestRef = useRef(0);

  const settle = useCallback(
    (request: number, next: RideSearchFormValue, results: readonly Ride[] | null) => {
      if (requestRef.current !== request) return;
      setRides(results ?? []);
      setRange({ from: next.from, to: next.to });
      setError(results === null);
      setLoading(false);
      setSearched(true);
    },
    [],
  );

  const startSearch = useCallback(
    (next: RideSearchFormValue) => {
      const request = requestRef.current + 1;
      requestRef.current = request;

      return searchRides(next).then(
        (results) => settle(request, next, results),
        () => settle(request, next, null),
      );
    },
    [settle],
  );

  // First paint shows the default range rather than an empty table. `loading`
  // already starts true, so the effect only has to write back the answer.
  useEffect(() => {
    void startSearch({
      from: addDays(startOfDay(today), DEFAULT_FROM_OFFSET),
      to: addDays(startOfDay(today), DEFAULT_TO_OFFSET),
      paymentMethod: 'all',
    });
  }, [startSearch, today]);

  return (
    <Screen
      title="Search rides"
      subtitle="Look up past and upcoming rides by date and payment method."
    >
      <Stack.Screen options={{ title: 'Search rides' }} />

      <RideSearchForm
        value={filters}
        onChange={setFilters}
        onSubmit={() => {
          setNotice(null);
          setLoading(true);
          void startSearch(filters);
        }}
        today={today}
        earliest={earliest}
        searching={loading}
      />

      {notice ? <Notice message={notice} onDismiss={() => setNotice(null)} /> : null}

      <RideResults
        rides={rides}
        range={range}
        now={today}
        loading={loading}
        searched={searched}
        failed={error}
        onAction={(action, ride) => setNotice(ACTION_NOTICES[action](ride))}
      />
    </Screen>
  );
}

/** Says what a row action would do, until those flows exist. */
function Notice({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <View style={styles.notice}>
      <Text style={styles.noticeText}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        onPress={onDismiss}
        style={({ pressed }) => [styles.dismiss, pressed ? styles.pressed : null]}
      >
        <Text style={styles.dismissGlyph}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.infoBg,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    borderRadius: radii.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
  },
  noticeText: { flex: 1, color: colors.info, fontSize: 13, lineHeight: 18 },
  dismiss: {
    width: 26,
    height: 26,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  dismissGlyph: { color: colors.info, fontSize: 12, fontWeight: '700' },
});
