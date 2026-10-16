import { googleMapsApiKey, hasGoogleMapsKey } from '@/config/maps';
import { colors } from '@/theme';

/**
 * Maps Static API image of a car's logged trail, for Track your route. (The
 * booking form's route is an interactive map — `RouteMapView`.)
 *
 * NOTE: Google recommends signing static map URLs, and unsigned requests can be
 * rejected. Signing uses a URL-signing secret that must never ship in the app,
 * so a production build should mint these URLs server-side.
 */

const STATIC_MAP_URL = 'https://maps.googleapis.com/maps/api/staticmap';

/** Maps Static API caps a single image at 640×640 before `scale` is applied. */
const MAX_EDGE = 640;

function clampEdge(value: number): number {
  return Math.max(64, Math.min(MAX_EDGE, Math.round(value)));
}

function latLng(point: { latitude: number; longitude: number }): string {
  return `${point.latitude},${point.longitude}`;
}

export type TrailMapOptions = {
  /** Logged positions in order; the last one is where the car is (or ended). */
  points: readonly { latitude: number; longitude: number }[];
  width: number;
  height: number;
  scale?: 1 | 2;
};

/**
 * URL for a map of a car's logged trail (reverse-engineer-implemented/guide/21): the
 * path through every point, a pin where it started and one where it is now.
 * `null` without a key or without a point to draw.
 */
export function buildTrailMapUrl({ points, width, height, scale = 2 }: TrailMapOptions): string | null {
  if (!hasGoogleMapsKey || points.length === 0) return null;

  const params = new URLSearchParams({
    size: `${clampEdge(width)}x${clampEdge(height)}`,
    scale: String(scale),
    key: googleMapsApiKey,
  });
  if (points.length > 1) {
    params.append('path', `color:${mapColor(colors.primary[600])}FF|weight:4|${points.map(latLng).join('|')}`);
    params.append('markers', `color:${mapColor(colors.success)}|label:A|${latLng(points[0])}`);
  }
  params.append('markers', `color:${mapColor(colors.danger)}|label:C|${latLng(points[points.length - 1])}`);

  return `${STATIC_MAP_URL}?${params.toString()}`;
}

/** Theme `#RRGGBB` → the Static Maps API's `0xRRGGBB`. */
function mapColor(hex: string): string {
  return `0x${hex.replace('#', '').slice(0, 6).toUpperCase()}`;
}
