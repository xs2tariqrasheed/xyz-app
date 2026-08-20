import { googleMapsApiKey, hasGoogleMapsKey } from '@/config/maps';

const COMPUTE_ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

/**
 * Routes API bills per requested field, so ask for exactly what the map and
 * the summary strip render — nothing more.
 */
const FIELD_MASK = [
  'routes.duration',
  'routes.distanceMeters',
  'routes.polyline.encodedPolyline',
  'routes.legs.startLocation',
  'routes.legs.endLocation',
].join(',');

export type LatLng = { latitude: number; longitude: number };

export type RouteSummary = {
  /** Encoded polyline of the driving path, ready for the static map. */
  encodedPolyline: string;
  distanceMeters: number;
  durationSeconds: number;
  start: LatLng;
  end: LatLng;
};

type ComputeRoutesResponse = {
  routes?: {
    duration?: string;
    distanceMeters?: number;
    polyline?: { encodedPolyline?: string };
    legs?: {
      startLocation?: { latLng?: { latitude?: number; longitude?: number } };
      endLocation?: { latLng?: { latitude?: number; longitude?: number } };
    }[];
  }[];
};

/**
 * Driving route between two places.
 *
 * Returns `null` when no key is configured — the map then draws its schematic
 * preview instead of inventing a path that does not exist.
 */
export async function fetchRoute(
  originPlaceId: string,
  destinationPlaceId: string,
  signal?: AbortSignal,
): Promise<RouteSummary | null> {
  if (!hasGoogleMapsKey) return null;

  const response = await fetch(COMPUTE_ROUTES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': googleMapsApiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      origin: { placeId: originPlaceId },
      destination: { placeId: destinationPlaceId },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Route lookup failed (${response.status})`);
  }

  const json = (await response.json()) as ComputeRoutesResponse;
  const route = json.routes?.[0];
  const encodedPolyline = route?.polyline?.encodedPolyline;
  if (!route || !encodedPolyline) return null;

  const legs = route.legs ?? [];
  const start = legs[0]?.startLocation?.latLng;
  const end = legs[legs.length - 1]?.endLocation?.latLng;

  return {
    encodedPolyline,
    distanceMeters: route.distanceMeters ?? 0,
    durationSeconds: parseDuration(route.duration),
    start: toLatLng(start),
    end: toLatLng(end),
  };
}

/** Routes API returns protobuf durations as seconds with a trailing `s`. */
function parseDuration(duration: string | undefined): number {
  if (!duration) return 0;
  const seconds = Number.parseFloat(duration.replace(/s$/, ''));
  return Number.isFinite(seconds) ? seconds : 0;
}

function toLatLng(value: { latitude?: number; longitude?: number } | undefined): LatLng {
  return { latitude: value?.latitude ?? 0, longitude: value?.longitude ?? 0 };
}

/** "12.4 mi" / "800 m" — display only, never fed back into a request. */
export function formatDistance(meters: number): string {
  const miles = meters / 1609.344;
  if (miles < 0.2) return `${Math.round(meters)} m`;
  return `${miles.toFixed(1)} mi`;
}

/** "34 min" / "1 hr 12 min" */
export function formatDuration(seconds: number): string {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}
