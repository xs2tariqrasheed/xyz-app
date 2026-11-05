import { googleMapsApiKey, hasGoogleMapsKey } from '@/config/maps';

/**
 * Google Geocoding web service (`GET https://maps.googleapis.com/maps/api/geocode/json`):
 * `latlng=…` turns a position into a street address, `address=…` an address
 * into coordinates.
 * Unlike the Places and Directions web services it answers browsers too
 * (CORS), so one implementation serves web, iOS and Android.
 */

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

type GeocodeBody = {
  status?: string;
  error_message?: string;
  results?: {
    formatted_address?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
    address_components?: { short_name?: string; types?: string[] }[];
  }[];
};

async function geocode(params: Record<string, string>, signal?: AbortSignal): Promise<GeocodeBody['results']> {
  if (!hasGoogleMapsKey) return [];
  const response = await fetch(`${GEOCODE_URL}?${new URLSearchParams({ ...params, key: googleMapsApiKey })}`, { signal });
  const body = (await response.json().catch(() => ({}))) as GeocodeBody;
  if (body.status === 'OK') return body.results ?? [];
  if (body.status !== 'ZERO_RESULTS' && __DEV__) {
    const reason = [body.status, body.error_message].filter(Boolean).join(': ');
    console.warn(`[Google Maps] Geocoding failed (HTTP ${response.status})${reason ? ` — ${reason}` : ''}`);
  }
  return [];
}

/**
 * Forward geocoding — an address to its coordinates (and ZIP) — for stops
 * that arrive without them, such as saved addresses, so the booking can send
 * `P_PICKUP_LAT` / `P_PICKUP_LON`. `null` when Google has no match.
 */
export async function geocodeAddress(
  address: string,
  signal?: AbortSignal,
): Promise<{ latitude: number; longitude: number; zip: string } | null> {
  const [first] = (await geocode({ address }, signal)) ?? [];
  const location = first?.geometry?.location;
  if (location?.lat == null || location.lng == null) return null;
  const zip = first?.address_components?.find((part) => part.types?.includes('postal_code'))?.short_name ?? '';
  return { latitude: location.lat, longitude: location.lng, zip };
}

/**
 * "1523 Broadway, New York, NY 10036, USA", or `null` when there is no key,
 * no address at that point, or Google refuses — the caller then shows the
 * coordinates instead, so a lookup failure never hides the position itself.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<string | null> {
  const [first] = (await geocode({ latlng: `${latitude},${longitude}` }, signal)) ?? [];
  return first?.formatted_address || null;
}
