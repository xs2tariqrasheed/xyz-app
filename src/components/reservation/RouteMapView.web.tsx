import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MapZoomControls } from '@/components/reservation/MapZoomControls';
import { framedPoints, isSinglePoint } from '@/components/reservation/routeMapPoints';
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
  setCenter: (center: LatLngLiteral) => void;
  getZoom: () => number | undefined;
  setZoom: (zoom: number) => void;
};
type Overlay = { setMap: (map: JsMap | null) => void };
type PolylineClass = new (options: Record<string, unknown>) => Overlay;
type MarkerClass = new (options: Record<string, unknown>) => Overlay;
type MapsLibrary = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => JsMap;
  Polyline: PolylineClass;
};
type MarkerLibrary = { Marker: MarkerClass };
/** The built map and the classes its overlays are drawn with. */
type BuiltMap = { map: JsMap; Polyline: PolylineClass; Marker: MarkerClass };

/** `google.maps.SymbolPath.CIRCLE` — a plain dot, coloured like the pins elsewhere in the app. */
const CIRCLE = 0;
/** Room left around the route when it is framed. */
const FIT_PADDING = 48;
const MAX_ZOOM = 21;
/** Street level, for a frame that is a single point. */
const POINT_ZOOM = 16;

const toLiteral = (point: LatLngPoint): LatLngLiteral => ({ lat: point.latitude, lng: point.longitude });

/** Frames the points; with none there is nothing to frame, and one spot shows at street level. */
function fitTo(map: JsMap, points: readonly LatLngPoint[]) {
  if (points.length === 0) return;
  if (isSinglePoint(points)) {
    map.setCenter(toLiteral(points[0]));
    map.setZoom(POINT_ZOOM);
    return;
  }
  const lats = points.map((point) => point.latitude);
  const lngs = points.map((point) => point.longitude);
  map.fitBounds(
    { north: Math.max(...lats), south: Math.min(...lats), east: Math.max(...lngs), west: Math.min(...lngs) },
    FIT_PADDING,
  );
}

const NO_TRAIL: readonly LatLngPoint[] = [];

/** A lettered dot, coloured like the pins elsewhere in the app. */
function drawPin(
  { map, Marker }: BuiltMap,
  point: LatLngPoint,
  title: string,
  label: string,
  color: string,
): Overlay {
  return new Marker({
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
  });
}

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
  const builtRef = useRef<BuiltMap | null>(null);
  // Bumped each time a map is built, so the car and trail are drawn onto the new one.
  const [mapVersion, setMapVersion] = useState(0);
  const route = { start, end, path, startTitle, endTitle, trail, car, carTitle };
  // The latest props, read by the map build, the overlays and the fit button.
  // Declared before the effects, so it is current when they run.
  const routeRef = useRef(route);
  useEffect(() => {
    routeRef.current = route;
  });

  // The map, the drive and its pins: rebuilt (and re-framed) only when the route itself changes.
  const routeKey = JSON.stringify([
    start,
    end,
    path.length,
    path[Math.floor(path.length / 2)] ?? null,
    startTitle,
    endTitle,
  ]);
  // The car and its trail: redrawn on the map as it is, keeping the customer's pan and zoom.
  const carKey = JSON.stringify([trail.length, trail[trail.length - 1] ?? null, car, carTitle]);

  useEffect(() => {
    // react-native-web renders a View as a DOM element, which is what the map mounts into.
    const element = containerRef.current as unknown as HTMLElement | null;
    if (!element) return;
    let cancelled = false;
    const overlays: Overlay[] = [];

    void (async () => {
      try {
        const { Map, Polyline } = await googleLibrary<MapsLibrary>('maps', ADDRESS_FIELD_MESSAGES.ROUTE_UNAVAILABLE);
        const { Marker } = await googleLibrary<MarkerLibrary>('marker', ADDRESS_FIELD_MESSAGES.ROUTE_UNAVAILABLE);
        if (cancelled) return;
        const { start, end, path, startTitle, endTitle } = routeRef.current;

        const map = new Map(element, {
          // Our own + / − / fit buttons replace Google's, so the control matches iOS and Android.
          disableDefaultUI: true,
          clickableIcons: false,
          // The map sits in a scrolling form: one-finger drag and plain wheel keep scrolling the
          // page; two fingers / ctrl + wheel zoom the map.
          gestureHandling: 'cooperative',
          maxZoom: MAX_ZOOM,
        });
        const built = { map, Polyline, Marker };

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
        if (start) overlays.push(drawPin(built, start, startTitle, 'A', colors.success));
        if (end) overlays.push(drawPin(built, end, endTitle, 'B', colors.danger));
        fitTo(map, framedPoints(routeRef.current));
        builtRef.current = built;
        setMapVersion((version) => version + 1);
      } catch {
        // The loader already logged why; the frame keeps its plain background.
      }
    })();

    return () => {
      cancelled = true;
      for (const overlay of overlays) overlay.setMap(null);
      builtRef.current = null;
    };
  }, [routeKey]);

  useEffect(() => {
    const built = builtRef.current;
    if (!built) return;
    const { trail, car, carTitle } = routeRef.current;
    const overlays: Overlay[] = [];
    if (trail.length > 1) {
      overlays.push(
        new built.Polyline({
          map: built.map,
          path: trail.map(toLiteral),
          strokeColor: colors.accent,
          strokeOpacity: 1,
          strokeWeight: 4,
        }),
      );
    }
    if (car) overlays.push(drawPin(built, car, carTitle, 'C', colors.accent));
    return () => {
      for (const overlay of overlays) overlay.setMap(null);
    };
  }, [carKey, mapVersion]);

  const zoomBy = (step: number) => {
    const map = builtRef.current?.map;
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
        onFit={() => {
          if (builtRef.current) fitTo(builtRef.current.map, framedPoints(routeRef.current));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
