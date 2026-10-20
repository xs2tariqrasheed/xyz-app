import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { InfoCard } from '@/components/reservation/info/InfoCard';
import { RouteMap } from '@/components/reservation/RouteMap';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ACTION_CODES, GATEWAY_VIEW_NAME } from '@/constants/actionCodes';
import { RESERVATION_INFO_MESSAGES, TRACKING_MESSAGES } from '@/constants/messages';
import { useFetchData } from '@/hooks/useFetchData';
import { useReservationRecord } from '@/hooks/useReservationRecord';
import { useRoute } from '@/hooks/useRoute';
import { reverseGeocode } from '@/services/geocoding';
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
import { colors, radii, space } from '@/theme';
import { formatClockTime, formatSlashDate } from '@/utils/datetime';

/**
 * Track your route (reverse-engineer-implemented/guide/21): the ride's pickup-to-drop-off
 * drive (`RES.S.LOAD_RESERVATION`), with the car's logged trail and dispatch timeline
 * (`RES.S.VEHICLE_LOG`) and, while the ride is open, its current position
 * (`RES.S.LATITUDE_LONGITUDE_FOR_CAR`) drawn over it.
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

/** The car on an open ride, as the map and the position card need it. */
type LocatedCar = {
  carNumber: string;
  /** `undefined` until the first answer, `null` when the server has no position. */
  position: CarPosition | null | undefined;
  address: string | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
};

function Tracking({ reservationNumber }: { reservationNumber: string }) {
  const { record, failureMessage, isLoading, refetch } = useReservationRecord(reservationNumber);

  if (isLoading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={colors.primary[600]} />
      </View>
    );
  }

  if (failureMessage || !record) {
    return (
      <View style={styles.locate}>
        <Alert tone="danger" title={RESERVATION_INFO_MESSAGES.LOAD_FAILED_TITLE} message={failureMessage ?? ''} />
        <Button label={RESERVATION_INFO_MESSAGES.RETRY} variant="outline" onPress={refetch} style={styles.refresh} />
      </View>
    );
  }

  const open = record.status === 'confirmed' || record.status === 'in-progress';
  const carNumber = record.driver.carNumber.trim();
  return open && carNumber ? (
    <LocatedRide record={record} carNumber={carNumber} />
  ) : (
    <RideTracking record={record} car={null} open={open} />
  );
}

/** Looks the car up as the screen opens (the old site did it behind the scenes) and on Refresh. */
function LocatedRide({ record, carNumber }: { record: ReservationRecord; carNumber: string }) {
  const located = useFetchData(ACTION_CODES.CAR_POSITION, GATEWAY_VIEW_NAME, carJData(carNumber));
  const mapped = useMemo((): { position: CarPosition | null | undefined; error: string | null } => {
    if (!located.data) return { position: undefined, error: null };
    try {
      return { position: toCarPosition(located.data), error: null };
    } catch (error) {
      return { position: null, error: error instanceof TrackingError ? error.message : TRACKING_MESSAGES.CAR_FAILED };
    }
  }, [located.data]);
  const address = useCarAddress(mapped.position);

  const car: LocatedCar = {
    carNumber,
    position: mapped.position,
    address,
    error: mapped.error ?? (located.isError ? (located.errorDisplay?.customDescription ?? TRACKING_MESSAGES.CAR_FAILED) : null),
    loading: located.isLoading,
    refresh: located.refetch,
  };
  return <RideTracking record={record} car={car} open />;
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

function RideTracking({ record, car, open }: { record: ReservationRecord; car: LocatedCar | null; open: boolean }) {
  const { reservationNumber } = record;
  const origin = useMemo(() => stopToSuggestion(record.pickup, `track:${reservationNumber}:from`), [record.pickup, reservationNumber]);
  const destination = useMemo(
    () => (record.destination ? stopToSuggestion(record.destination, `track:${reservationNumber}:to`) : null),
    [record.destination, reservationNumber],
  );
  const drive = useRoute(origin, destination);

  const log = useFetchData(ACTION_CODES.VEHICLE_LOG, GATEWAY_VIEW_NAME, vehicleLogJData(reservationNumber));
  const mapped = useMemo((): { entries: VehicleLogEntry[]; refused: boolean } => {
    if (!log.data) return { entries: [], refused: false };
    try {
      return { entries: toVehicleLog(log.data), refused: false };
    } catch {
      return { entries: [], refused: true };
    }
  }, [log.data]);

  const trail = mapped.entries.flatMap((entry) =>
    entry.latitude !== null && entry.longitude !== null
      ? [{ latitude: entry.latitude, longitude: entry.longitude }]
      : [],
  );

  return (
    <>
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
      />

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
            <Button
              label={car.loading ? TRACKING_MESSAGES.REFRESHING : TRACKING_MESSAGES.REFRESH}
              variant="outline"
              disabled={car.loading}
              onPress={car.refresh}
              style={styles.refresh}
            />
          </View>
        </InfoCard>
      ) : open ? (
        <InfoCard title={TRACKING_MESSAGES.CAR_POSITION}>
          <Text style={styles.muted}>{TRACKING_MESSAGES.NO_CAR}</Text>
        </InfoCard>
      ) : null}

      <InfoCard title={TRACKING_MESSAGES.ROUTE_TITLE}>
        {log.isLoading && !log.data ? (
          <ActivityIndicator color={colors.primary[600]} />
        ) : log.isError || mapped.refused ? (
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
    </>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start' },
  state: { paddingVertical: space.xl, alignItems: 'center' },
  locate: { gap: space.sm },
  refresh: { alignSelf: 'flex-start' },
  body: { color: colors.textBody, fontSize: 14, lineHeight: 20 },
  muted: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 13 },
  meta: { color: colors.textMuted, fontSize: 12 },
  timeline: { gap: space.md },
  entry: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  dot: { width: 10, height: 10, borderRadius: radii.pill, backgroundColor: colors.accent, marginTop: 5 },
  entryText: { flex: 1, gap: 2 },
});
