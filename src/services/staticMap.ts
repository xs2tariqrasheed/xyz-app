import { googleMapsApiKey, hasGoogleMapsKey } from '@/config/maps';

import type { RouteSummary } from './routes';

const STATIC_MAP_URL = 'https://maps.googleapis.com/maps/api/staticmap';

/** Maps Static API caps a single image at 640×640 before `scale` is applied. */
const MAX_EDGE = 640;

export type StaticMapOptions = {
  route: RouteSummary;
  width: number;
  height: number;
  /** 2 on retina displays — doubles pixels without widening the coverage area. */
  scale?: 1 | 2;
  /** Route stroke, as `0xRRGGBBAA`. */
  pathColor?: string;
};

/**
 * URL for a map image with the route drawn across it.
 *
 * No key means no URL — callers render their own placeholder rather than
 * requesting an image that would come back as an error tile.
 *
 * NOTE: Google recommends signing static map URLs, and unsigned requests can be
 * rejected. Signing uses a URL-signing secret that must never ship in the app,
 * so a production build should mint these URLs server-side.
 */
export function buildStaticMapUrl(options: StaticMapOptions): string | null {
  if (!hasGoogleMapsKey) return null;

  const { route, scale = 2, pathColor = '0x013F83FF' } = options;
  const width = clampEdge(options.width);
  const height = clampEdge(options.height);

  const params = new URLSearchParams({
    size: `${width}x${height}`,
    scale: String(scale),
    path: `color:${pathColor}|weight:5|enc:${route.encodedPolyline}`,
    key: googleMapsApiKey,
  });

  // Endpoints as labelled pins; the viewport auto-fits the path and markers.
  params.append('markers', `color:0x137A4A|label:A|${latLng(route.start)}`);
  params.append('markers', `color:0xB3261E|label:B|${latLng(route.end)}`);

  return `${STATIC_MAP_URL}?${params.toString()}`;
}

function clampEdge(value: number): number {
  return Math.max(64, Math.min(MAX_EDGE, Math.round(value)));
}

function latLng(point: { latitude: number; longitude: number }): string {
  return `${point.latitude},${point.longitude}`;
}
