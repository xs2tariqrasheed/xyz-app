import type { LatLngPoint } from '@/utils/polyline';

/**
 * Everything the route map frames: the drive (or, without one, its pins), the
 * car's trail and the car. Shared by `RouteMapView.tsx` and `.web.tsx`
 * without pulling react-native-maps into the web bundle.
 */
/** True when every point is the same spot (A and B stored on one point): there is no area to fit. */
export function isSinglePoint(points: readonly LatLngPoint[]): boolean {
  return points.every((point) => point.latitude === points[0].latitude && point.longitude === points[0].longitude);
}

export function framedPoints({
  start,
  end,
  path,
  trail = [],
  car,
}: {
  start: LatLngPoint | null;
  end: LatLngPoint | null;
  path: readonly LatLngPoint[];
  trail?: readonly LatLngPoint[];
  car?: LatLngPoint | null;
}): LatLngPoint[] {
  const ends = [start, end].filter((point): point is LatLngPoint => point !== null);
  return [...(path.length > 1 ? path : ends), ...trail, ...(car ? [car] : [])];
}
