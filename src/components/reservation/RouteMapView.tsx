import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, type Region } from 'react-native-maps';

import { MapZoomControls } from '@/components/reservation/MapZoomControls';
import { framedPoints, isSinglePoint } from '@/components/reservation/routeMapPoints';
import { colors } from '@/theme';
import type { LatLngPoint } from '@/utils/polyline';

export type RouteMapViewProps = {
  /** The pickup pin; `null` when the pickup has no position to show. */
  start: LatLngPoint | null;
  /** The drop-off pin; `null` for an as-directed ride or one with no position. */
  end: LatLngPoint | null;
  /** The drive, decoded from Directions' polyline. */
  path: readonly LatLngPoint[];
  startTitle: string;
  endTitle: string;
  accessibilityLabel: string;
  /** Where the car has been (Track your route), drawn over the planned drive. */
  trail?: readonly LatLngPoint[];
  /** Where the car is now. */
  car?: LatLngPoint | null;
  carTitle?: string;
};


/** Room left around the route when it is framed, so the pins never sit on the edge. */
const EDGE = { top: 48, right: 64, bottom: 48, left: 48 };

/** The span shown around a single point (about a few blocks). */
const POINT_SPAN = { latitudeDelta: 0.01, longitudeDelta: 0.01 };

/** Each tap on + / − halves or doubles the visible span. */
const ZOOM_STEP = 2;

/**
 * The pickup-to-drop-off route on an interactive map (iOS, Android):
 * pinch and double-tap to zoom, drag to pan, and the shared + / − / fit
 * buttons. The web build draws the same map with the Maps JavaScript API
 * (`RouteMapView.web.tsx`).
 */
export function RouteMapView({
  start,
  end,
  path,
  startTitle,
  endTitle,
  accessibilityLabel,
  trail = [],
  car,
  carTitle,
}: RouteMapViewProps) {
  const mapRef = useRef<MapView>(null);
  const region = useRef<Region | null>(null);

  const fit = (animated: boolean) => {
    const points = framedPoints({ start, end, path, trail, car });
    if (points.length === 0) return;
    // One spot has no area to fit; show it at street level rather than the closest zoom.
    if (isSinglePoint(points)) {
      mapRef.current?.animateToRegion({ ...points[0], ...POINT_SPAN }, animated ? 250 : 0);
      return;
    }
    mapRef.current?.fitToCoordinates(points, { edgePadding: EDGE, animated });
  };

  // Re-frame when the route itself changes; a car or trail update (polling) leaves the view alone.
  const routeKey = JSON.stringify([start, end, path.length, path[Math.floor(path.length / 2)] ?? null]);
  const ready = useRef(false);
  const fitRef = useRef(fit);
  useEffect(() => {
    fitRef.current = fit;
  });
  useEffect(() => {
    if (ready.current) fitRef.current(true);
  }, [routeKey]);

  const zoom = (factor: number) => {
    const current = region.current;
    if (!current) return;
    mapRef.current?.animateToRegion(
      {
        ...current,
        latitudeDelta: Math.min(180, current.latitudeDelta * factor),
        longitudeDelta: Math.min(360, current.longitudeDelta * factor),
      },
      250,
    );
  };

  return (
    <View style={styles.root} accessibilityLabel={accessibilityLabel}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        zoomEnabled
        scrollEnabled
        zoomTapEnabled
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        onMapReady={() => {
          ready.current = true;
          fit(false);
        }}
        onRegionChangeComplete={(next) => {
          region.current = next;
        }}
      >
        {path.length > 1 ? (
          <Polyline coordinates={[...path]} strokeColor={colors.primary[600]} strokeWidth={4} />
        ) : null}
        {start ? <Marker coordinate={start} title={startTitle} pinColor={colors.success} /> : null}
        {end ? <Marker coordinate={end} title={endTitle} pinColor={colors.danger} /> : null}
        {trail.length > 1 ? (
          <Polyline coordinates={[...trail]} strokeColor={colors.accent} strokeWidth={4} />
        ) : null}
        {car ? <Marker coordinate={car} title={carTitle} pinColor={colors.accent} /> : null}
      </MapView>

      <MapZoomControls
        onZoomIn={() => zoom(1 / ZOOM_STEP)}
        onZoomOut={() => zoom(ZOOM_STEP)}
        onFit={() => fit(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
