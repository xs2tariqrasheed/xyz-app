import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { MapZoomControls } from '@/components/reservation/MapZoomControls';
import { ADDRESS_FIELD_MESSAGES } from '@/constants/messages';
import { googleLibrary } from '@/services/googleMapsLoader';
import { colors } from '@/theme';
import type { LatLngPoint } from '@/utils/polyline';

import type { RouteMapViewProps } from './RouteMapView';

/**
 * The pickup-to-drop-off route on an interactive Google map in the browser,
 * through the Maps JavaScript API the web build already loads for address
 * search: drag to pan, pinch / ctrl + scroll / double-click to zoom, and the
 * shared + / − / fit buttons. iOS and Android use react-native-maps
 * (`RouteMapView.tsx`).
 */

type LatLngLiteral = { lat: number; lng: number };
type JsMap = {
  fitBounds: (bounds: { north: number; south: number; east: number; west: number }, padding?: number) => void;
  getZoom: () => number | undefined;
  setZoom: (zoom: number) => void;
};
type MapsLibrary = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => JsMap;
  Polyline: new (options: Record<string, unknown>) => { setMap: (map: JsMap | null) => void };
};
type MarkerLibrary = {
  Marker: new (options: Record<string, unknown>) => { setMap: (map: JsMap | null) => void };
};

/** `google.maps.SymbolPath.CIRCLE` — a plain dot, coloured like the pins elsewhere in the app. */
const CIRCLE = 0;
/** Room left around the route when it is framed. */
const FIT_PADDING = 48;
const MAX_ZOOM = 21;

const toLiteral = (point: LatLngPoint): LatLngLiteral => ({ lat: point.latitude, lng: point.longitude });

function boundsOf(points: readonly LatLngPoint[]) {
  const lats = points.map((point) => point.latitude);
  const lngs = points.map((point) => point.longitude);
  return { north: Math.max(...lats), south: Math.min(...lats), east: Math.max(...lngs), west: Math.min(...lngs) };
}

const NO_TRAIL: readonly LatLngPoint[] = [];

export function RouteMapView({
  start,
  end,
  path,
  startTitle,
  endTitle,
  accessibilityLabel,
  trail = NO_TRAIL,
  car = null,
  carTitle = '',
}: RouteMapViewProps) {
  const containerRef = useRef<View>(null);
  const mapRef = useRef<JsMap | null>(null);
  const framed = [...(path.length > 1 ? path : [start, end]), ...trail, ...(car ? [car] : [])];
  const route = { start, end, path, startTitle, endTitle, trail, car, carTitle, framed };
  // The latest route, read by the map build and the fit button. Declared before
  // the build effect, so it is current when that effect runs.
  const routeRef = useRef(route);
  useEffect(() => {
    routeRef.current = route;
  });

  // Rebuilt only when the route itself changes (or its labels).
  const routeKey = JSON.stringify([
    start,
    end,
    path.length,
    path[Math.floor(path.length / 2)] ?? null,
    startTitle,
    endTitle,
    trail.length,
    trail[trail.length - 1] ?? null,
    car,
    carTitle,
  ]);

  useEffect(() => {
    // react-native-web renders a View as a DOM element, which is what the map mounts into.
    const element = containerRef.current as unknown as HTMLElement | null;
    if (!element) return;
    let cancelled = false;
    const overlays: { setMap: (map: JsMap | null) => void }[] = [];

    void (async () => {
      try {
        const { Map, Polyline } = await googleLibrary<MapsLibrary>('maps', ADDRESS_FIELD_MESSAGES.ROUTE_UNAVAILABLE);
        const { Marker } = await googleLibrary<MarkerLibrary>('marker', ADDRESS_FIELD_MESSAGES.ROUTE_UNAVAILABLE);
        if (cancelled) return;
        const { start, end, path, startTitle, endTitle, trail, car, carTitle, framed } = routeRef.current;

        const map = new Map(element, {
          // Our own + / − / fit buttons replace Google's, so the control matches iOS and Android.
          disableDefaultUI: true,
          clickableIcons: false,
          // The map sits in a scrolling form: one-finger drag and plain wheel keep scrolling the
          // page; two fingers / ctrl + wheel zoom the map.
          gestureHandling: 'cooperative',
          maxZoom: MAX_ZOOM,
        });
        mapRef.current = map;

        if (path.length > 1) {
          overlays.push(
            new Polyline({
              map,
              path: path.map(toLiteral),
              strokeColor: colors.primary[600],
              strokeOpacity: 1,
              strokeWeight: 5,
            }),
          );
        }
        if (trail.length > 1) {
          overlays.push(
            new Polyline({
              map,
              path: trail.map(toLiteral),
              strokeColor: colors.accent,
              strokeOpacity: 1,
              strokeWeight: 4,
            }),
          );
        }
        const pins: [LatLngPoint, string, string, string][] = [
          [start, startTitle, 'A', colors.success],
          [end, endTitle, 'B', colors.danger],
        ];
        if (car) pins.push([car, carTitle, 'C', colors.accent]);
        for (const [point, title, label, color] of pins) {
          overlays.push(
            new Marker({
              map,
              position: toLiteral(point),
              title,
              label: { text: label, color: colors.textOnPrimary, fontSize: '12px', fontWeight: '800' },
              icon: {
                path: CIRCLE,
                scale: 12,
                fillColor: color,
                fillOpacity: 1,
                strokeColor: colors.textOnPrimary,
                strokeWeight: 2,
              },
            }),
          );
        }
        map.fitBounds(boundsOf(framed), FIT_PADDING);
      } catch {
        // The loader already logged why; the frame keeps its plain background.
      }
    })();

    return () => {
      cancelled = true;
      for (const overlay of overlays) overlay.setMap(null);
      mapRef.current = null;
    };
  }, [routeKey]);

  const zoomBy = (step: number) => {
    const map = mapRef.current;
    if (!map) return;
    const zoom = map.getZoom() ?? 10;
    map.setZoom(Math.max(1, Math.min(MAX_ZOOM, zoom + step)));
  };

  return (
    <View style={styles.root} accessibilityLabel={accessibilityLabel}>
      <View ref={containerRef} style={StyleSheet.absoluteFill} />
      <MapZoomControls
        onZoomIn={() => zoomBy(1)}
        onZoomOut={() => zoomBy(-1)}
        onFit={() => mapRef.current?.fitBounds(boundsOf(routeRef.current.framed), FIT_PADDING)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
