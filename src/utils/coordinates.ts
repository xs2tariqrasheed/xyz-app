import type { StructuredPlace } from '@/services/places';
import type { LatLngPoint } from '@/utils/polyline';

/**
 * A gateway coordinate (decimal degrees as a string). Blank, unparseable and
 * `0` read as `null`: the gateway sends `0` / blank for "no position", and a
 * real ride is never at 0° — routing there would start in the Atlantic.
 */
export function parseCoordinate(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed !== 0 ? parsed : null;
}

/** A place's stored position, or `null` unless both halves are usable. */
export function placePoint(place: StructuredPlace | null | undefined): LatLngPoint | null {
  if (!place) return null;
  const latitude = parseCoordinate(place.latitude);
  const longitude = parseCoordinate(place.longitude);
  return latitude !== null && longitude !== null ? { latitude, longitude } : null;
}
