/**
 * Google Directions (legacy) in one shape for both transports: the
 * `directions/json` web service on iOS / Android (`googleDirections.ts`) and
 * the Maps JavaScript API's `DirectionsService` in the browser
 * (`googleDirections.web.ts`).
 */

/** Where a route starts, stops or ends. */
export type DirectionsPoint =
  | { placeId: string }
  | { latitude: number; longitude: number }
  | { address: string };

export type DirectionsResult = {
  /** Encoded polyline of the whole drive, ready for the static map. */
  encodedPolyline: string;
  distanceMeters: number;
  /** In current traffic when Google has it (`departure_time=now`), else typical. */
  durationSeconds: number;
  start: { latitude: number; longitude: number };
  end: { latitude: number; longitude: number };
};
