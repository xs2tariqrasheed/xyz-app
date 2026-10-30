import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { CancelReservationSheet } from '@/components/rides/CancelReservationSheet';
import type { RideAction } from '@/components/rides/RideActionLink';
import { RideQuestionSheet } from '@/components/rides/RideQuestionSheet';
import { RideResults } from '@/components/rides/RideResults';
import { RideSearchForm, type RideSearchFormValue } from '@/components/rides/RideSearchForm';
import { Alert } from '@/components/ui/Alert';
import { ACTION_CODES, GATEWAY_VIEW_NAME } from '@/constants/actionCodes';
import { RIDES_MESSAGES } from '@/constants/messages';
import { useAuth } from '@/context/AuthContext';
import { useFetchData } from '@/hooks/useFetchData';
import { useOpenReservation } from '@/hooks/useReservationActions';
import type { GatewayResponse } from '@/services/gateway';
import { openRateRide } from '@/services/rateRide';
import {
  allOrdersJData,
  filterRides,
  HISTORY_DEFAULT_DAYS,
  HISTORY_REACH_DAYS,
  type Ride,
  toRides,
  toUpdatableRides,
  updatableOrdersJData,
} from '@/services/rides';
import { colors, radii, space } from '@/theme';
import { addDays, startOfDay } from '@/utils/datetime';

type Tab = 'upcoming' | 'history';

type Notice = { tone: 'success' | 'danger'; message: string } | null;

/**
 * The customer's rides (reverse-engineer-implemented/guide/18, 19): open reservations
 * that can still be changed or cancelled (`RES.S.UPDATABLE_ORDERS`), and the
 * ride history search (`RES.S.ALL_ORDERS`). Each ride opens its details.
 */
export default function RideSearchScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const loginId = session?.loginId ?? '';

  // One "now" for the whole screen, so the calendar floor, the default range
  // and the "can this still be modified?" test cannot disagree.
  const [today] = useState(() => new Date());
  const [earliest] = useState(() => addDays(startOfDay(today), -HISTORY_REACH_DAYS));
  const [tab, setTab] = useState<Tab>('upcoming');
  const [notice, setNotice] = useState<Notice>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  // Bumped after a cancel so both lists reload.
  const [generation, setGeneration] = useState(0);
  const opener = useOpenReservation();

  const onAction = (action: RideAction, ride: Ride) => {
    setNotice(null);
    opener.clearError();
    if (action === 'view') router.push({ pathname: '/reservation-info', params: { rideno: ride.id } });
    else if (action === 'voucher') router.push({ pathname: '/voucher', params: { rideno: ride.id } });
    else if (action === 'receipt') router.push({ pathname: '/receipt', params: { rideno: ride.id } });
    else if (action === 'modify') void opener.open(ride.id, 'edit');
    else if (action === 'cancel') setCancelling(ride.id);
    else if (action === 'ask') setAsking(ride.id);
    else if (action === 'feedback') {
      void openRateRide(ride.id).then((failure) => failure && setNotice({ tone: 'danger', message: failure }));
    }
  };

  return (
    <Screen title={RIDES_MESSAGES.SCREEN_TITLE}>
      <Stack.Screen options={{ title: RIDES_MESSAGES.SCREEN_TITLE }} />

      <Tabs value={tab} onChange={setTab} />

      {notice ? <Alert tone={notice.tone} message={notice.message} /> : null}
      {opener.error ? <Alert tone="danger" message={opener.error} /> : null}

      {tab === 'upcoming' ? (
        <UpcomingRides key={generation} loginId={loginId} now={today} onAction={onAction} />
      ) : (
        <RideHistory key={generation} loginId={loginId} today={today} earliest={earliest} onAction={onAction} />
      )}

      <CancelReservationSheet
        reservationNumber={cancelling}
        onClose={() => setCancelling(null)}
        onCancelled={() => {
          setCancelling(null);
          setNotice({ tone: 'success', message: RIDES_MESSAGES.CANCEL_DONE });
          setGeneration((count) => count + 1);
        }}
      />

      <RideQuestionSheet
        reservationNumber={asking}
        onClose={() => setAsking(null)}
        onSent={(message) => setNotice({ tone: 'success', message })}
      />
    </Screen>
  );
}

/** Maps a list response with its code's mapper, treating a mapping failure like a failed load. */
function useRides(data: GatewayResponse | undefined, toList: (response: GatewayResponse) => Ride[]) {
  return useMemo((): { rides: Ride[]; refused: boolean } => {
    if (!data) return { rides: [], refused: false };
    try {
      return { rides: toList(data), refused: false };
    } catch {
      return { rides: [], refused: true };
    }
  }, [data, toList]);
}

function UpcomingRides({
  loginId,
  now,
  onAction,
}: {
  loginId: string;
  now: Date;
  onAction: (action: RideAction, ride: Ride) => void;
}) {
  const { data, isLoading, isError, refetch } = useFetchData(
    ACTION_CODES.UPDATABLE_ORDERS,
    GATEWAY_VIEW_NAME,
    updatableOrdersJData(loginId),
  );
  const { rides, refused } = useRides(data, toUpdatableRides);
  // Soonest first: what is coming next leads.
  const sorted = useMemo(() => [...rides].reverse(), [rides]);

  return (
    <RideResults
      title={RIDES_MESSAGES.UPCOMING_TITLE}
      rides={sorted}
      now={now}
      loading={isLoading && !data}
      searched
      failed={isError || refused}
      failedTitle={RIDES_MESSAGES.UPCOMING_FAILED}
      emptyTitle={RIDES_MESSAGES.UPCOMING_EMPTY}
      onRetry={refetch}
      onAction={onAction}
    />
  );
}

function RideHistory({
  loginId,
  today,
  earliest,
  onAction,
}: {
  loginId: string;
  today: Date;
  earliest: Date;
  onAction: (action: RideAction, ride: Ride) => void;
}) {
  const [filters, setFilters] = useState<RideSearchFormValue>(() => ({
    from: addDays(startOfDay(today), -HISTORY_DEFAULT_DAYS),
    to: startOfDay(today),
    paymentMethod: 'all',
  }));
  // The search that ran — the list and its header only follow the form on Search.
  const [searched, setSearched] = useState(filters);

  const { data, isLoading, isError, refetch } = useFetchData(
    ACTION_CODES.ALL_ORDERS,
    GATEWAY_VIEW_NAME,
    allOrdersJData(loginId, searched.from, searched.to),
  );
  const { rides, refused } = useRides(data, toRides);
  // The contract has no payment parameter, so the filter runs here.
  const shown = useMemo(() => filterRides(rides, searched), [rides, searched]);

  return (
    <>
      <RideSearchForm
        value={filters}
        onChange={setFilters}
        onSubmit={() => {
          // Same inputs → same request key, so an unchanged search refetches explicitly.
          if (JSON.stringify(filters) === JSON.stringify(searched)) refetch();
          setSearched(filters);
        }}
        today={today}
        earliest={earliest}
        searching={isLoading}
      />

      <RideResults
        rides={shown}
        range={{ from: searched.from, to: searched.to }}
        now={today}
        loading={isLoading}
        searched
        failed={isError || refused}
        failedTitle={RIDES_MESSAGES.HISTORY_FAILED}
        onAction={onAction}
      />
    </>
  );
}

/** Upcoming | History — a two-way switch, the same on every platform. */
function Tabs({ value, onChange }: { value: Tab; onChange: (next: Tab) => void }) {
  const options: { value: Tab; label: string }[] = [
    { value: 'upcoming', label: RIDES_MESSAGES.UPCOMING_TAB },
    { value: 'history', label: RIDES_MESSAGES.HISTORY_TAB },
  ];
  return (
    <View style={styles.tabs} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={[styles.tab, selected ? styles.tabSelected : null]}
          >
            <Text style={[styles.tabLabel, selected ? styles.tabLabelSelected : null]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.pill,
    padding: 3,
    gap: 3,
  },
  tab: { paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radii.pill },
  tabSelected: { backgroundColor: colors.surface },
  tabLabel: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  tabLabelSelected: { color: colors.primary[600] },
});
