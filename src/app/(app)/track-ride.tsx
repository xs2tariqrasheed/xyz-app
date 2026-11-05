import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { DriverCard } from '@/components/reservation/info/DriverCard';
import { InfoCard } from '@/components/reservation/info/InfoCard';
import { InfoList, RecordRow } from '@/components/reservation/info/InfoRow';
import { MessagesCard } from '@/components/reservation/info/MessagesCard';
import { RouteMap } from '@/components/reservation/RouteMap';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TRACKING_POLL_MS } from '@/config/tracking';
import { ACTION_CODES, GATEWAY_VIEW_NAME } from '@/constants/actionCodes';
import { RESERVATION_INFO_MESSAGES, TRACKING_MESSAGES } from '@/constants/messages';
import { useAuth } from '@/context/AuthContext';
import { useCommunicationLog } from '@/hooks/useCommunicationLog';
import { useFetchData } from '@/hooks/useFetchData';
import { useLastDefined } from '@/hooks/useLastDefined';
import { usePolling } from '@/hooks/usePolling';
import { useVehicleTypes } from '@/hooks/useReservationLookups';
import { useReservationRecord } from '@/hooks/useReservationRecord';
import { useRoute } from '@/hooks/useRoute';
import type { GatewayResponse } from '@/services/gateway';
import { reverseGeocode } from '@/services/geocoding';
import { formatAddress } from '@/services/places';
import { type ReservationRecord, stopToSuggestion } from '@/services/reservation';
import {
  type CarPosition,
  carJData,
  toCarPosition,
  toVehicleLog,
  TrackingError,
  vehicleLogJData,
  type VehicleLogEntry,
} from '@/services/tracking';
import { findVehicleType } from '@/services/vehicleTypes';
import { colors, radii, space } from '@/theme';
import { formatClockTime, formatSlashDate } from '@/utils/datetime';

/**
 * Track your route (reverse-engineer-implemented/guide/21): the ride
 * (`RES.S.LOAD_RESERVATION`) on a map, pinned at its stored pickup and
 * drop-off, with the car's logged trail and dispatch timeline
 * (`RES.S.VEHICLE_LOG`), its current position (`RES.S.LATITUDE_LONGITUDE_FOR_CAR`)
 * while the ride is open, and the ride's messages (`RES.S.COMMUNICATION_LOG`).
 * While the ride is open every read is repeated each {@link TRACKING_POLL_MS},
 * and Refresh repeats them at once.
 */
export default function TrackRideScreen() {
  const { rideno } = useLocalSearchParams<{ rideno?: string }>();
  const reservationNumber = typeof rideno === 'string' ? rideno.trim() : '';
  const router = useRouter();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.navigate('/rides');
  };

  return (
    <Screen title={TRACKING_MESSAGES.SCREEN_TITLE} subtitle={reservationNumber || undefined}>
      <Stack.Screen options={{ title: TRACKING_MESSAGES.SCREEN_TITLE }} />
      {reservationNumber ? (
        <Tracking key={reservationNumber} reservationNumber={reservationNumber} />
      ) : (
        <Alert tone="info" message={RESERVATION_INFO_MESSAGES.NOT_FOUND} />
      )}
      <Button label={RESERVATION_INFO_MESSAGES.BACK} variant="outline" onPress={goBack} style={styles.back} />
    </Screen>
  );
}

/** Shared by every read on the screen: bumping it repeats them all together. */
type Refresh = {
  key: number;
  run: () => void;
  /** The ride itself is being re-read. */
  recordFetching: boolean;
  /** The last re-read of the ride failed; the previous answer is still shown. */
  recordFailed: boolean;
};

/** The car on an open ride, as the map and the position card need it. */
type LocatedCar = {
  carNumber: string;
  /** `undefined` until the first answer, `null` when the server has no position. */
  position: CarPosition | null | undefined;
  address: string | null;
  /** Set when there is no position to show because the lookup failed or was refused. */
  error: string | null;
  /** The latest lookup failed while an earlier answer is still shown. */
  refreshFailed: boolean;
  loading: boolean;
  /** The answer behind `position`, to stamp the update time. */
  answer: GatewayResponse | undefined;
};

function isOpen(record: ReservationRecord): boolean {
  return record.status === 'confirmed' || record.status === 'in-progress';
}

function Tracking({ reservationNumber }: { reservationNumber: string }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const { record, failureMessage, isLoading, isFetching, refetch } = useReservationRecord(reservationNumber, refreshKey);
  // A failed re-read keeps the ride on screen; only a first load that fails replaces it.
  const shown = useLastDefined(record ?? undefined);
  const open = shown ? isOpen(shown) : false;
  const runRefresh = () => setRefreshKey((key) => key + 1);
  usePolling(runRefresh, TRACKING_POLL_MS, open);

  if (isLoading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={colors.primary[600]} />
      </View>
    );
  }

  if (!shown) {
    return (
      <View style={styles.locate}>
        <Alert tone="danger" title={RESERVATION_INFO_MESSAGES.LOAD_FAILED_TITLE} message={failureMessage ?? ''} />
        <Button label={RESERVATION_INFO_MESSAGES.RETRY} variant="outline" onPress={refetch} style={styles.refresh} />
      </View>
    );
  }

  const refresh: Refresh = {
    key: refreshKey,
    run: runRefresh,
    recordFetching: isFetching,
    recordFailed: failureMessage !== null,
  };
  const carNumber = shown.driver.carNumber.trim();
  return open && carNumber ? (
    <LocatedRide key={carNumber} record={shown} carNumber={carNumber} refresh={refresh} />
  ) : (
    <RideTracking record={shown} car={null} open={open} refresh={refresh} />
  );
}

/** Looks the car up as the screen opens (the old site did it behind the scenes), on every poll and on Refresh. */
function LocatedRide({ record, carNumber, refresh }: { record: ReservationRecord; carNumber: string; refresh: Refresh }) {
  const located = useFetchData(ACTION_CODES.CAR_POSITION, GATEWAY_VIEW_NAME, carJData(carNumber), refresh.key);
  const answer = useLastDefined(located.data);
  const mapped = useMemo((): { position: CarPosition | null | undefined; error: string | null } => {
    if (!answer) return { position: undefined, error: null };
    try {
      return { position: toCarPosition(answer), error: null };
    } catch (error) {
      return { position: null, error: error instanceof TrackingError ? error.message : TRACKING_MESSAGES.CAR_FAILED };
    }
  }, [answer]);
  const address = useCarAddress(mapped.position);

  const car: LocatedCar = {
    carNumber,
    position: mapped.position,
    address,
    error:
      mapped.error ??
      (located.isError && !answer ? (located.errorDisplay?.customDescription ?? TRACKING_MESSAGES.CAR_FAILED) : null),
    refreshFailed: located.isError && answer !== undefined,
    loading: located.isLoading,
    answer,
  };
  return <RideTracking record={record} car={car} open refresh={refresh} />;
}

/** Street address of the car's position — a nicety: without one the coordinates show. */
function useCarAddress(position: CarPosition | null | undefined): string | null {
  const key = position ? `${position.latitude},${position.longitude}` : null;
  const [result, setResult] = useState<{ key: string; address: string | null } | null>(null);

  useEffect(() => {
    if (!key) return;
    const [latitude, longitude] = key.split(',').map(Number);
    const controller = new AbortController();
    reverseGeocode(latitude, longitude, controller.signal)
      .then((address) => {
        if (!controller.signal.aborted) setResult({ key, address });
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [key]);

  return result?.key === key ? result.address : null;
}

/** When `answer` last changed — each gateway answer is a new object. */
function useAnsweredAt(answer: GatewayResponse | undefined): Date | null {
  const [stamp, setStamp] = useState<{ answer: GatewayResponse; at: Date } | null>(null);
  if (answer && answer !== stamp?.answer) setStamp({ answer, at: new Date() });
  return stamp?.at ?? null;
}

function RideTracking({
  record,
  car,
  open,
  refresh,
}: {
  record: ReservationRecord;
  car: LocatedCar | null;
  open: boolean;
  refresh: Refresh;
}) {
  const { reservationNumber } = record;
  const { session } = useAuth();
  const vehicleTypes = useVehicleTypes();
  const origin = useMemo(() => stopToSuggestion(record.pickup, `track:${reservationNumber}:from`), [record.pickup, reservationNumber]);
  const destination = useMemo(
    () => (record.destination ? stopToSuggestion(record.destination, `track:${reservationNumber}:to`) : null),
    [record.destination, reservationNumber],
  );
  const drive = useRoute(origin, destination);

  const log = useFetchData(ACTION_CODES.VEHICLE_LOG, GATEWAY_VIEW_NAME, vehicleLogJData(reservationNumber), refresh.key);
  const logAnswer = useLastDefined(log.data);
  const mapped = useMemo((): { entries: VehicleLogEntry[]; refused: boolean } => {
    if (!logAnswer) return { entries: [], refused: false };
    try {
      return { entries: toVehicleLog(logAnswer), refused: false };
    } catch {
      return { entries: [], refused: true };
    }
  }, [logAnswer]);
  const messages = useCommunicationLog(session?.loginId ?? '', reservationNumber, refresh.key);

  const trail = mapped.entries.flatMap((entry) =>
    entry.latitude !== null && entry.longitude !== null
      ? [{ latitude: entry.latitude, longitude: entry.longitude }]
      : [],
  );

  const updatedAt = useAnsweredAt(car?.answer ?? logAnswer);
  const busy = refresh.recordFetching || log.isLoading || messages.isFetching || (car?.loading ?? false);
  // Only a Refresh the customer pressed says so; the background polls stay quiet.
  const [pressedKey, setPressedKey] = useState<number | null>(null);
  const refreshing = pressedKey === refresh.key && busy;
  const refreshFailed =
    !busy && (refresh.recordFailed || (log.isError && logAnswer !== undefined) || (car?.refreshFailed ?? false));
  const carTypeLabel = findVehicleType(vehicleTypes.items, record.preferences.carType)?.label ?? '';

  return (
    <>
      <InfoCard title={TRACKING_MESSAGES.TRIP_TITLE}>
        <InfoList>
          <RecordRow label={TRACKING_MESSAGES.STATUS} value={record.statusLabel} />
          <RecordRow label={TRACKING_MESSAGES.RIDE_DATE} value={record.rideAt ? formatSlashDate(record.rideAt) : ''} />
          <RecordRow label={TRACKING_MESSAGES.RIDE_TIME} value={record.rideAt ? formatClockTime(record.rideAt) : ''} />
          <RecordRow label={TRACKING_MESSAGES.PICKUP} value={formatAddress(origin)} />
          <RecordRow
            label={TRACKING_MESSAGES.DESTINATION}
            value={destination ? formatAddress(destination) : RESERVATION_INFO_MESSAGES.AS_DIRECTED}
          />
        </InfoList>
      </InfoCard>

      <RouteMap
        origin={origin}
        destination={destination}
        route={drive.route}
        loading={drive.loading}
        error={drive.error}
        trail={trail}
        car={car?.position ?? null}
        carTitle={car ? `${TRACKING_MESSAGES.CAR_MARKER} ${car.carNumber}` : ''}
        showStats={false}
        emptyNote={destination ? undefined : RESERVATION_INFO_MESSAGES.AS_DIRECTED}
        mapWithoutRoute
      />

      <View style={styles.refreshRow}>
        <View style={styles.refreshText}>
          {updatedAt ? (
            <Text style={styles.meta}>{`${TRACKING_MESSAGES.UPDATED_AT} ${formatClockTime(updatedAt)}`}</Text>
          ) : null}
          {refreshFailed ? <Text style={styles.error}>{TRACKING_MESSAGES.REFRESH_FAILED}</Text> : null}
        </View>
        <Button
          label={refreshing ? TRACKING_MESSAGES.REFRESHING : TRACKING_MESSAGES.REFRESH}
          variant="outline"
          disabled={refreshing}
          onPress={() => {
            setPressedKey(refresh.key + 1);
            refresh.run();
          }}
        />
      </View>

      {car ? (
        <InfoCard title={TRACKING_MESSAGES.CAR_POSITION}>
          <View style={styles.locate}>
            <Text style={styles.body}>
              {car.position === undefined
                ? car.carNumber
                : car.position
                  ? `${car.carNumber} · ${car.address ?? `${car.position.latitude.toFixed(5)}, ${car.position.longitude.toFixed(5)}`}`
                  : TRACKING_MESSAGES.CAR_UNKNOWN}
            </Text>
            {car.error ? <Text style={styles.error}>{car.error}</Text> : null}
          </View>
        </InfoCard>
      ) : open ? (
        <InfoCard title={TRACKING_MESSAGES.CAR_POSITION}>
          <Text style={styles.muted}>{TRACKING_MESSAGES.NO_CAR}</Text>
        </InfoCard>
      ) : null}

      <InfoCard title={TRACKING_MESSAGES.ROUTE_TITLE}>
        {log.isLoading && !logAnswer ? (
          <ActivityIndicator color={colors.primary[600]} />
        ) : (log.isError && !logAnswer) || mapped.refused ? (
          <View style={styles.locate}>
            <Text style={styles.error}>{TRACKING_MESSAGES.LOG_FAILED}</Text>
            <Button label={RESERVATION_INFO_MESSAGES.RETRY} variant="outline" onPress={log.refetch} style={styles.refresh} />
          </View>
        ) : mapped.entries.length === 0 ? (
          <Text style={styles.muted}>{TRACKING_MESSAGES.LOG_EMPTY}</Text>
        ) : (
          <View style={styles.timeline}>
            {mapped.entries.map((entry) => (
              <View key={entry.id} style={styles.entry}>
                <View style={styles.dot} />
                <View style={styles.entryText}>
                  <Text style={styles.body}>{entry.status}</Text>
                  <Text style={styles.meta}>
                    {[
                      entry.at ? `${formatSlashDate(entry.at)} ${formatClockTime(entry.at)}` : '',
                      entry.latitude !== null && entry.longitude !== null
                        ? `${entry.latitude.toFixed(5)}, ${entry.longitude.toFixed(5)}`
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </InfoCard>

      {record.driver.carNumber.trim() ? <DriverCard record={record} carTypeLabel={carTypeLabel} /> : null}

      <MessagesCard log={messages} />
    </>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start' },
  state: { paddingVertical: space.xl, alignItems: 'center' },
  locate: { gap: space.sm },
  refresh: { alignSelf: 'flex-start' },
  refreshRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  refreshText: { flex: 1, gap: 2 },
  body: { color: colors.textBody, fontSize: 14, lineHeight: 20 },
  muted: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 13 },
  meta: { color: colors.textMuted, fontSize: 12 },
  timeline: { gap: space.md },
  entry: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  dot: { width: 10, height: 10, borderRadius: radii.pill, backgroundColor: colors.accent, marginTop: 5 },
  entryText: { flex: 1, gap: 2 },
});
