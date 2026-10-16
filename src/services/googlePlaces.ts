import { googleMapsApiKey } from '@/config/maps';
import { ADDRESS_FIELD_MESSAGES } from '@/constants/messages';
import {
  DETAILS_FIELDS,
  type PlaceDetailsResult,
  type PlacePrediction,
} from '@/services/googlePlacesTypes';

/**
 * Google Places (legacy) web service, for iOS and Android:
 *
 * - `GET https://maps.googleapis.com/maps/api/place/autocomplete/json`
 * - `GET https://maps.googleapis.com/maps/api/place/details/json`
 *
 * These endpoints send no CORS headers, so a browser cannot call them — the
 * web build uses the Maps JavaScript API instead (`googlePlaces.web.ts`).
 */

const AUTOCOMPLETE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

/** Statuses that are an answer, not a failure. */
const OK_STATUSES = new Set(['OK', 'ZERO_RESULTS']);

type LegacyBody = { status?: string; error_message?: string };

type AutocompleteBody = LegacyBody & {
  predictions?: {
    place_id?: string;
    description?: string;
    structured_formatting?: { main_text?: string; secondary_text?: string };
  }[];
};

type DetailsBody = LegacyBody & {
  result?: {
    name?: string;
    types?: string[];
    address_components?: { long_name?: string; short_name?: string; types?: string[] }[];
    geometry?: { location?: { lat?: number; lng?: number } };
  };
};

/**
 * The legacy API answers HTTP 200 even when it refuses (`REQUEST_DENIED`,
 * `OVER_QUERY_LIMIT`, …), so the body's `status` decides. The customer sees
 * short copy; Google's own reason goes to the console in development.
 */
async function getJson<T extends LegacyBody>(url: string, api: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  const body = (await response.json().catch(() => ({}))) as T;
  if (response.ok && body.status && OK_STATUSES.has(body.status)) return body;
  if (__DEV__) {
    const reason = [body.status, body.error_message].filter(Boolean).join(': ');
    console.warn(`[Google Maps] ${api} failed (HTTP ${response.status})${reason ? ` — ${reason}` : ''}`);
  }
  throw new Error(ADDRESS_FIELD_MESSAGES.SEARCH_UNAVAILABLE);
}

export async function placeAutocomplete(input: string, signal?: AbortSignal): Promise<PlacePrediction[]> {
  const params = new URLSearchParams({ input, key: googleMapsApiKey });
  const body = await getJson<AutocompleteBody>(`${AUTOCOMPLETE_URL}?${params}`, 'Places autocomplete', signal);
  return (body.predictions ?? []).flatMap((prediction) =>
    prediction.place_id
      ? [
          {
            placeId: prediction.place_id,
            mainText: prediction.structured_formatting?.main_text ?? prediction.description ?? '',
            secondaryText: prediction.structured_formatting?.secondary_text ?? '',
          },
        ]
      : [],
  );
}

export async function placeDetails(placeId: string, signal?: AbortSignal): Promise<PlaceDetailsResult> {
  const params = new URLSearchParams({
    place_id: placeId,
    // The web service spells the nested field with a slash.
    fields: DETAILS_FIELDS.map((field) => field.replace('.', '/')).join(','),
    key: googleMapsApiKey,
  });
  const body = await getJson<DetailsBody>(`${DETAILS_URL}?${params}`, 'Place details', signal);
  const result = body.result ?? {};
  return {
    name: result.name ?? '',
    types: result.types ?? [],
    components: (result.address_components ?? []).map((part) => ({
      longName: part.long_name ?? '',
      shortName: part.short_name ?? '',
      types: part.types ?? [],
    })),
    latitude: result.geometry?.location?.lat ?? null,
    longitude: result.geometry?.location?.lng ?? null,
  };
}
