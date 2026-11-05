import { ADDRESS_FIELD_MESSAGES } from '@/constants/messages';
import type { DirectionsPoint, DirectionsResult } from '@/services/googleDirectionsTypes';
import { abortable, googleLibrary, googleUnavailable } from '@/services/googleMapsLoader';

/**
 * Google Directions (legacy) in the browser, through the Maps JavaScript
 * API's `DirectionsService` — the same data as the `directions/json` web
 * service iOS and Android call (`googleDirections.ts`), which a browser
 * cannot reach because it sends no CORS headers.
 *
 * Needs "Maps JavaScript API" and "Directions API" enabled on the key.
 */

type JsLatLng = { lat: () => number; lng: () => number };
type JsLocation = string | { placeId: string } | { lat: number; lng: number };
type JsRoute = {
  overview_polyline?: string | { points?: string };
  legs?: {
    distance?: { value?: number };
    duration?: { value?: number };
    duration_in_traffic?: { value?: number };
    start_location?: JsLatLng;
    end_location?: JsLatLng;
  }[];
};
type RoutesLibrary = {
  DirectionsService: new () => {
    route: (
      request: {
        origin: JsLocation;
        destination: JsLocation;
        waypoints: { location: JsLocation; stopover: boolean }[];
        travelMode: 'DRIVING';
        drivingOptions: { departureTime: Date };
      },
      callback: (result: { routes?: JsRoute[] } | null, status: string) => void,
    ) => void;
  };
};

function location(point: DirectionsPoint): JsLocation {
  if ('placeId' in point) return { placeId: point.placeId };
  if ('latitude' in point) return { lat: point.latitude, lng: point.longitude };
  return point.address;
}

const toLatLng = (value: JsLatLng | undefined) => ({
  latitude: value ? value.lat() : 0,
  longitude: value ? value.lng() : 0,
});

/** The driving route, or `null` when Google finds none between the points. */
export async function drivingDirections(
  origin: DirectionsPoint,
  destination: DirectionsPoint,
  waypoints: readonly DirectionsPoint[] = [],
  signal?: AbortSignal,
): Promise<DirectionsResult | null> {
  const { DirectionsService } = await googleLibrary<RoutesLibrary>('routes', ADDRESS_FIELD_MESSAGES.ROUTE_UNAVAILABLE);

  return abortable(signal, (resolve, reject) => {
    new DirectionsService().route(
      {
        origin: location(origin),
        destination: location(destination),
        waypoints: waypoints.map((point) => ({ location: location(point), stopover: true })),
        travelMode: 'DRIVING',
        // Same as `departure_time=now`: the drive time in current traffic.
        drivingOptions: { departureTime: new Date() },
      },
      (result, status) => {
        if (status === 'ZERO_RESULTS' || status === 'NOT_FOUND') {
          resolve(null);
          return;
        }
        if (status !== 'OK' || !result) {
          reject(googleUnavailable('Directions', status, ADDRESS_FIELD_MESSAGES.ROUTE_UNAVAILABLE));
          return;
        }
        const route = result.routes?.[0];
        const legs = route?.legs ?? [];
        const polyline = route?.overview_polyline;
        const encodedPolyline = typeof polyline === 'string' ? polyline : (polyline?.points ?? '');
        if (!route || !encodedPolyline || legs.length === 0) {
          resolve(null);
          return;
        }
        resolve({
          encodedPolyline,
          distanceMeters: legs.reduce((sum, leg) => sum + (leg.distance?.value ?? 0), 0),
          durationSeconds: legs.reduce(
            (sum, leg) => sum + (leg.duration_in_traffic?.value ?? leg.duration?.value ?? 0),
            0,
          ),
          start: toLatLng(legs[0].start_location),
          end: toLatLng(legs[legs.length - 1].end_location),
        });
      },
    );
  });
}
