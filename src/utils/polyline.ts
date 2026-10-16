/**
 * Google's encoded polyline format → coordinates
 * (https://developers.google.com/maps/documentation/utilities/polylinealgorithm).
 * Directions returns the drive this way; the interactive maps draw the points.
 */

export type LatLngPoint = { latitude: number; longitude: number };

export function decodePolyline(encoded: string): LatLngPoint[] {
  const points: LatLngPoint[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  const next = (): number => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };

  while (index < encoded.length) {
    latitude += next();
    longitude += next();
    points.push({ latitude: latitude / 1e5, longitude: longitude / 1e5 });
  }
  return points;
}
