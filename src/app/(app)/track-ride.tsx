import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { InfoCard } from '@/components/reservation/info/InfoCard';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { hasGoogleMapsKey } from '@/config/maps';
import { ACTION_CODES, GATEWAY_VIEW_NAME } from '@/constants/actionCodes';
import { RESERVATION_INFO_MESSAGES, TRACKING_MESSAGES } from '@/constants/messages';
import { useFetchData } from '@/hooks/useFetchData';
import { usePostData } from '@/hooks/usePostData';
import { getErrorDisplay } from '@/services/gateway';
import { reverseGeocode } from '@/services/geocoding';
import { buildTrailMapUrl } from '@/services/staticMap';
import {
  type CarPosition,
  carJData,
  toCarPosition,
  toVehicleLog,
  TrackingError,
  vehicleLogJData,
  type VehicleLogEntry,
} from '@/services/tracking';
import { breakpoints, colors, radii, space } from '@/theme';
import { formatClockTime, formatSlashDate } from '@/utils/datetime';

/**
 * Track your route (reverse-engineer-implemented/guide/21): the car's logged trail and
 * dispatch timeline (`RES.S.VEHICLE_LOG`), and its current position on demand
 * (`RES.S.LATITUDE_LONGITUDE_FOR_CAR`) — the old site refreshed only when asked.
 */
export default function TrackRideScreen() {
  const { rideno, car } = useLocalSearchParams<{ rideno?: string; car?: string }>();
  const reservationNumber = typeof rideno === 'string' ? rideno.trim() : '';
  const carNumber = typeof car === 'string' ? car.trim() : '';
  const router = useRouter();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.navigate('/rides');
  };

  return (
    <Screen title={TRACKING_MESSAGES.SCREEN_TITLE} subtitle={reservationNumber || undefined}>
      <Stack.Screen options={{ title: TRACKING_MESSAGES.SCREEN_TITLE }} />
      {reservationNumber ? (
        <Tracking reservationNumber={reservationNumber} carNumber={carNumber} />
      ) : (
        <Alert tone="info" message={RESERVATION_INFO_MESSAGES.NOT_FOUND} />
      )}
      <Button label={RESERVATION_INFO_MESSAGES.BACK} variant="outline" onPress={goBack} style={styles.back} />
    </Screen>
  );
}

function Tracking({ reservationNumber, carNumber }: { reservationNumber: string; carNumber: string }) {
  const log = useFetchData(ACTION_CODES.VEHICLE_LOG, GATEWAY_VIEW_NAME, vehicleLogJData(reservationNumber));
  const mapped = useMemo((): { entries: VehicleLogEntry[]; refused: boolean } => {
    if (!log.data) return { entries: [], refused: false };
    try {
      return { entries: toVehicleLog(log.data), refused: false };
    } catch {
      return { entries: [], refused: true };
    }
  }, [log.data]);

  const locate = usePostData();
  const [position, setPosition] = useState<CarPosition | null | undefined>(undefined);
  /** Street address of `position`, when Google has one. */
  const [positionAddress, setPositionAddress] = useState<string | null>(null);
  const [locateError, setLocateError] = useState<string | null>(null);

  const refresh = async () => {
    setLocateError(null);
    try {
      const response = await locate.mutateAsync(ACTION_CODES.CAR_POSITION, GATEWAY_VIEW_NAME, carJData(carNumber));
      const next = toCarPosition(response);
      setPosition(next);
      setPositionAddress(null);
      if (next) {
        // The address is a nicety on top of the position — a failed lookup keeps the coordinates.
        reverseGeocode(next.latitude, next.longitude)
          .then(setPositionAddress)
          .catch(() => setPositionAddress(null));
      }
    } catch (error) {
      setLocateError(error instanceof TrackingError ? error.message : getErrorDisplay(error).customDescription);
    }
  };

  const trail = mapped.entries.flatMap((entry) =>
    entry.latitude !== null && entry.longitude !== null
      ? [{ latitude: entry.latitude, longitude: entry.longitude }]
      : [],
  );
  const points = position ? [...trail, position] : trail;

  return (
    <>
      <TrailMap points={points} />

      <InfoCard title={TRACKING_MESSAGES.CAR_POSITION}>
        {carNumber ? (
          <View style={styles.locate}>
            <Text style={styles.body}>
              {position === undefined
                ? `${carNumber}`
                : position
                  ? `${carNumber} · ${positionAddress ?? `${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`}`
                  : TRACKING_MESSAGES.CAR_UNKNOWN}
            </Text>
            {locateError ? <Text style={styles.error}>{locateError}</Text> : null}
            <Button
              label={locate.isLoading ? TRACKING_MESSAGES.REFRESHING : TRACKING_MESSAGES.REFRESH}
              variant="outline"
              disabled={locate.isLoading}
              onPress={() => void refresh()}
              style={styles.refresh}
            />
          </View>
        ) : (
          <Text style={styles.muted}>{TRACKING_MESSAGES.NO_CAR}</Text>
        )}
      </InfoCard>

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

/** The trail as a static map image, sized to its column. Says why when there is none. */
function TrailMap({ points }: { points: readonly CarPosition[] }) {
  const { width: windowWidth } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const height = Math.round((width * (windowWidth >= breakpoints.md ? 9 : 12)) / 16);
  const url = width > 0 ? buildTrailMapUrl({ points, width, height }) : null;

  if (points.length === 0) return null;

  return (
    <View style={styles.map} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {url ? (
        <Image source={{ uri: url }} style={{ width, height }} contentFit="cover" accessibilityLabel={TRACKING_MESSAGES.ROUTE_TITLE} />
      ) : !hasGoogleMapsKey ? (
        <Text style={styles.muted}>{TRACKING_MESSAGES.MAP_UNAVAILABLE}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start' },
  map: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 48,
    justifyContent: 'center',
    padding: 0,
  },
  locate: { gap: space.sm },
  refresh: { alignSelf: 'flex-start' },
  body: { color: colors.textBody, fontSize: 14, lineHeight: 20 },
  muted: { color: colors.textMuted, fontSize: 14, lineHeight: 20, padding: space.md },
  error: { color: colors.danger, fontSize: 13 },
  meta: { color: colors.textMuted, fontSize: 12 },
  timeline: { gap: space.md },
  entry: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  dot: { width: 10, height: 10, borderRadius: radii.pill, backgroundColor: colors.primary[600], marginTop: 5 },
  entryText: { flex: 1, gap: 2 },
});
