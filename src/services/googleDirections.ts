import { googleMapsApiKey } from '@/config/maps';
import { ADDRESS_FIELD_MESSAGES } from '@/constants/messages';
import type { DirectionsPoint, DirectionsResult } from '@/services/googleDirectionsTypes';

/**
 * Google Directions (legacy) web service, for iOS and Android:
 * `GET https://maps.googleapis.com/maps/api/directions/json` with
 * `mode=driving` and `departure_time=now`, plus `waypoints` for stops.
 *
 * It sends no CORS headers, so the web build uses the Maps JavaScript API's
 * `DirectionsService` instead (`googleDirections.web.ts`).
 */

const DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json';

type LatLngBody = { lat?: number; lng?: number };

type DirectionsBody = {
  status?: string;
  error_message?: string;
  routes?: {
    overview_polyline?: { points?: string };
    legs?: {
      distance?: { value?: number };
      duration?: { value?: number };
      duration_in_traffic?: { value?: number };
      start_location?: LatLngBody;
      end_location?: LatLngBody;
    }[];
  }[];
};

/** `place_id:…`, `lat,lng` or the address text — the web service's three forms. */
function param(point: DirectionsPoint): string {
  if ('placeId' in point) return `place_id:${point.placeId}`;
  if ('latitude' in point) return `${point.latitude},${point.longitude}`;
  return point.address;
}

const toLatLng = (value: LatLngBody | undefined) => ({ latitude: value?.lat ?? 0, longitude: value?.lng ?? 0 });

/** The driving route, or `null` when Google finds none between the points. */
export async function drivingDirections(
  origin: DirectionsPoint,
  destination: DirectionsPoint,
  waypoints: readonly DirectionsPoint[] = [],
  signal?: AbortSignal,
): Promise<DirectionsResult | null> {
  const params = new URLSearchParams({
    origin: param(origin),
    destination: param(destination),
    mode: 'driving',
    departure_time: 'now',
    key: googleMapsApiKey,
  });
  if (waypoints.length > 0) params.set('waypoints', waypoints.map(param).join('|'));

  const response = await fetch(`${DIRECTIONS_URL}?${params}`, { signal });
  const body = (await response.json().catch(() => ({}))) as DirectionsBody;

  // The legacy API answers HTTP 200 even when it refuses, so `status` decides.
  if (body.status === 'ZERO_RESULTS' || body.status === 'NOT_FOUND') return null;
  if (!response.ok || body.status !== 'OK') {
    if (__DEV__) {
      const reason = [body.status, body.error_message].filter(Boolean).join(': ');
      console.warn(`[Google Maps] Directions failed (HTTP ${response.status})${reason ? ` — ${reason}` : ''}`);
    }
    throw new Error(ADDRESS_FIELD_MESSAGES.ROUTE_UNAVAILABLE);
  }

  const route = body.routes?.[0];
  const legs = route?.legs ?? [];
  const encodedPolyline = route?.overview_polyline?.points;
  if (!route || !encodedPolyline || legs.length === 0) return null;

  return {
    encodedPolyline,
    distanceMeters: legs.reduce((sum, leg) => sum + (leg.distance?.value ?? 0), 0),
    durationSeconds: legs.reduce(
      (sum, leg) => sum + (leg.duration_in_traffic?.value ?? leg.duration?.value ?? 0),
      0,
    ),
    start: toLatLng(legs[0].start_location),
    end: toLatLng(legs[legs.length - 1].end_location),
  };
}
