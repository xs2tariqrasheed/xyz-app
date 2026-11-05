import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { RouteMapView } from '@/components/reservation/RouteMapView';
import { hasGoogleMapsKey } from '@/config/maps';
import { ROUTE_MAP_MESSAGES } from '@/constants/messages';
import type { AddressSuggestion } from '@/services/places';
import { formatDistance, formatDuration, type RouteSummary } from '@/services/routes';
import { breakpoints, colors, radii, space } from '@/theme';
import { placePoint } from '@/utils/coordinates';
import { decodePolyline, type LatLngPoint } from '@/utils/polyline';

export type RouteMapProps = {
  origin: AddressSuggestion | null;
  destination: AddressSuggestion | null;
  route: RouteSummary | null;
  loading: boolean;
  error: string | null;
  /** Where the car has been and where it is now (Track your route). */
  trail?: readonly LatLngPoint[];
  car?: LatLngPoint | null;
  carTitle?: string;
  /** Distance and drive time under the map; the booking form shows them. */
  showStats?: boolean;
  /** Replaces the stand-in's note when there is no route to draw. */
  emptyNote?: string;
  /**
   * Keep the interactive map, with whatever pins, trail and car there are,
   * when there is no drive to draw (as-directed ride, no route found). Track
   * your route sets it; the booking form keeps its stand-in until both ends are set.
   */
  mapWithoutRoute?: boolean;
};

/**
 * The pickup-to-drop-off leg on an interactive map the customer can zoom and
 * pan (`RouteMapView`: react-native-maps on iOS / Android, the Maps
 * JavaScript API on web), with the distance and drive time under it.
 *
 * The A / B pins sit at each end's stored position (a loaded reservation's
 * `oepickuplat/lon`, `oedropofflat/lon`) and fall back to where Directions
 * starts and ends the drive when the place has none.
 */
export function RouteMap({
  origin,
  destination,
  route,
  loading,
  error,
  trail,
  car,
  carTitle,
  showStats = true,
  emptyNote,
  mapWithoutRoute = false,
}: RouteMapProps) {
  const path = useMemo(() => (route ? decodePolyline(route.encodedPolyline) : []), [route]);
  const start = useMemo(() => placePoint(origin?.place) ?? route?.start ?? null, [origin, route]);
  const end = useMemo(() => (destination ? (placePoint(destination.place) ?? route?.end ?? null) : null), [destination, route]);
  const drawable = Boolean(start || end || car || (trail && trail.length > 0));
  const showMap = hasGoogleMapsKey && (route !== null || (mapWithoutRoute && drawable));
  // A taller frame on phones leaves room to pinch and drag.
  const { width } = useWindowDimensions();
  const narrow = width < breakpoints.sm;

  return (
    <View style={styles.root}>
      <View style={[styles.frame, narrow ? styles.frameNarrow : null]}>
        {showMap ? (
          <RouteMapView
            start={start}
            end={end}
            path={path}
            startTitle={origin?.primary ?? ''}
            endTitle={destination?.primary ?? ''}
            accessibilityLabel={`Route from ${origin?.primary ?? ROUTE_MAP_MESSAGES.PICKUP} to ${destination?.primary ?? ROUTE_MAP_MESSAGES.DESTINATION}`}
            trail={trail}
            car={car}
            carTitle={carTitle}
          />
        ) : (
          <Schematic origin={origin} destination={destination} error={error} emptyNote={emptyNote} />
        )}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary[500]} />
            <Text style={styles.loadingLabel}>{ROUTE_MAP_MESSAGES.FINDING_ROUTE}</Text>
          </View>
        ) : null}
      </View>

      {route && showStats ? (
        <View style={styles.stats}>
          <Stat label={ROUTE_MAP_MESSAGES.DISTANCE} value={formatDistance(route.distanceMeters)} />
          <View style={styles.statDivider} />
          <Stat label={ROUTE_MAP_MESSAGES.DRIVE_TIME} value={formatDuration(route.durationSeconds)} />
        </View>
      ) : null}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

/** Stand-in shown before there is a route to draw. */
function Schematic({
  origin,
  destination,
  error,
  emptyNote,
}: {
  origin: AddressSuggestion | null;
  destination: AddressSuggestion | null;
  error: string | null;
  emptyNote?: string;
}) {
  const note = error
    ? error
    : emptyNote
      ? emptyNote
      : !hasGoogleMapsKey
        ? ROUTE_MAP_MESSAGES.NO_KEY
        : !origin || !destination
          ? ROUTE_MAP_MESSAGES.CHOOSE_BOTH
          : ROUTE_MAP_MESSAGES.NO_ROUTE;

  return (
    <View style={styles.schematic}>
      <View style={styles.leg}>
        <View style={[styles.endpoint, { backgroundColor: colors.success }]}>
          <Text style={styles.endpointLabel}>A</Text>
        </View>
        <View style={styles.dashes} />
        <View style={[styles.endpoint, { backgroundColor: colors.danger }]}>
          <Text style={styles.endpointLabel}>B</Text>
        </View>
      </View>

      <View style={styles.legLabels}>
        <Text style={styles.legLabel} numberOfLines={1}>
          {origin?.primary ?? ROUTE_MAP_MESSAGES.PICKUP}
        </Text>
        <Text style={[styles.legLabel, styles.legLabelEnd]} numberOfLines={1}>
          {destination?.primary ?? ROUTE_MAP_MESSAGES.DESTINATION}
        </Text>
      </View>

      <Text style={[styles.note, error ? styles.noteError : null]}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md },
  frame: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
  },
  frameNarrow: { aspectRatio: 4 / 3 },

  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: 'rgba(246,248,250,0.82)',
  },
  loadingLabel: { color: colors.textBody, fontSize: 13, fontWeight: '600' },

  schematic: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    gap: space.sm,
  },
  leg: { flexDirection: 'row', alignItems: 'center' },
  endpoint: {
    width: 26,
    height: 26,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endpointLabel: { color: colors.textOnPrimary, fontSize: 12, fontWeight: '800' },
  dashes: {
    flex: 1,
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    marginHorizontal: space.sm,
  },
  legLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  legLabel: { flex: 1, color: colors.textStrong, fontSize: 12, fontWeight: '600' },
  legLabelEnd: { textAlign: 'right' },
  note: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: space.xs },
  noteError: { color: colors.danger },

  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSelected,
    borderWidth: 1,
    borderColor: colors.primary[100],
    borderRadius: radii.lg,
    paddingVertical: space.md - 2,
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.primary[100] },
  statLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  statValue: { color: colors.textStrong, fontSize: 16, fontWeight: '700', marginTop: 2 },
});
