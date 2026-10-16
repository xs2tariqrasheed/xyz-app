import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, type Region } from 'react-native-maps';

import { MapZoomControls } from '@/components/reservation/MapZoomControls';
import { colors } from '@/theme';
import type { LatLngPoint } from '@/utils/polyline';

export type RouteMapViewProps = {
  start: LatLngPoint;
  end: LatLngPoint;
  /** The drive, decoded from Directions' polyline. */
  path: readonly LatLngPoint[];
  startTitle: string;
  endTitle: string;
  accessibilityLabel: string;
};

/** Room left around the route when it is framed, so the pins never sit on the edge. */
const EDGE = { top: 48, right: 64, bottom: 48, left: 48 };

/** Each tap on + / − halves or doubles the visible span. */
const ZOOM_STEP = 2;

/**
 * The pickup-to-drop-off route on an interactive map (iOS, Android):
 * pinch and double-tap to zoom, drag to pan, and the shared + / − / fit
 * buttons. The web build draws the same map with the Maps JavaScript API
 * (`RouteMapView.web.tsx`).
 */
export function RouteMapView({ start, end, path, startTitle, endTitle, accessibilityLabel }: RouteMapViewProps) {
  const mapRef = useRef<MapView>(null);
  const region = useRef<Region | null>(null);

  const fit = (animated: boolean) =>
    mapRef.current?.fitToCoordinates(path.length > 1 ? [...path] : [start, end], {
      edgePadding: EDGE,
      animated,
    });

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
        onMapReady={() => fit(false)}
        onRegionChangeComplete={(next) => {
          region.current = next;
        }}
      >
        {path.length > 1 ? (
          <Polyline coordinates={[...path]} strokeColor={colors.primary[600]} strokeWidth={4} />
        ) : null}
        <Marker coordinate={start} title={startTitle} pinColor={colors.success} />
        <Marker coordinate={end} title={endTitle} pinColor={colors.danger} />
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
