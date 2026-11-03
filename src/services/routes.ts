import { hasGoogleMapsKey } from '@/config/maps';
import { drivingDirections } from '@/services/googleDirections';
import type { DirectionsPoint } from '@/services/googleDirectionsTypes';
import { type AddressSuggestion, formatAddress } from '@/services/places';
import { placePoint } from '@/utils/coordinates';

/**
 * Driving routes for the booking form's map, from Google Directions (legacy):
 * the `directions/json` web service on iOS / Android and the Maps JavaScript
 * API's `DirectionsService` in the browser (`googleDirections(.web).ts`).
 */

export type LatLng = { latitude: number; longitude: number };

export type RouteSummary = {
  /** Encoded polyline of the driving path, ready for the static map. */
  encodedPolyline: string;
  distanceMeters: number;
  /** Drive time in current traffic when Google has it. */
  durationSeconds: number;
  start: LatLng;
  end: LatLng;
};

/**
 * Driving route between two places, through any stops in between.
 *
 * Returns `null` when no key is configured or Google finds no route — the map
 * then draws its schematic preview instead of inventing a path.
 */
export async function fetchRoute(
  origin: AddressSuggestion,
  destination: AddressSuggestion,
  signal?: AbortSignal,
  stops: readonly AddressSuggestion[] = [],
): Promise<RouteSummary | null> {
  if (!hasGoogleMapsKey) return null;
  return drivingDirections(routePoint(origin), routePoint(destination), stops.map(routePoint), signal);
}

/**
 * A Google prediction routes by its place id; a saved place has no Google id,
 * so it routes by its coordinates when it has them (not blank or `0`), else by
 * its address text.
 */
function routePoint(stop: AddressSuggestion): DirectionsPoint {
  if (!stop.place) return { placeId: stop.placeId };
  return placePoint(stop.place) ?? { address: formatAddress(stop) };
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
