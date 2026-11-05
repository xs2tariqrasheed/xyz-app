import { ADDRESS_FIELD_MESSAGES } from '@/constants/messages';
import { abortable, googleLibrary, googleUnavailable } from '@/services/googleMapsLoader';
import {
  DETAILS_FIELDS,
  type PlaceDetailsResult,
  type PlacePrediction,
} from '@/services/googlePlacesTypes';

/**
 * Google Places (legacy) in the browser, through the Maps JavaScript API's
 * `AutocompleteService` and `PlacesService` — the same data as the
 * `place/autocomplete/json` and `place/details/json` web service that iOS and
 * Android call (`googlePlaces.ts`), which a browser cannot reach because it
 * sends no CORS headers.
 *
 * Needs "Maps JavaScript API" and "Places API" enabled on the key.
 */

// The slice of the Maps JavaScript API used here (no @types/google.maps dependency).
type Status = string;
type LegacyPrediction = {
  place_id?: string;
  description?: string;
  structured_formatting?: { main_text?: string; secondary_text?: string };
};
type LegacyPlace = {
  name?: string;
  types?: string[];
  address_components?: { long_name?: string; short_name?: string; types?: string[] }[];
  geometry?: { location?: { lat: () => number; lng: () => number } };
};
type PlacesLibrary = {
  AutocompleteService: new () => {
    getPlacePredictions: (
      request: { input: string },
      callback: (predictions: LegacyPrediction[] | null, status: Status) => void,
    ) => void;
  };
  PlacesService: new (attributionContainer: HTMLElement) => {
    getDetails: (
      request: { placeId: string; fields: string[] },
      callback: (place: LegacyPlace | null, status: Status) => void,
    ) => void;
  };
};
/** Answers that are not failures. */
const OK_STATUSES = new Set(['OK', 'ZERO_RESULTS']);

const unavailable = (api: string, detail: string) =>
  googleUnavailable(api, detail, ADDRESS_FIELD_MESSAGES.SEARCH_UNAVAILABLE);

const loadPlaces = () => googleLibrary<PlacesLibrary>('places', ADDRESS_FIELD_MESSAGES.SEARCH_UNAVAILABLE);

export async function placeAutocomplete(input: string, signal?: AbortSignal): Promise<PlacePrediction[]> {
  const places = await loadPlaces();
  return abortable(signal, (resolve, reject) => {
    new places.AutocompleteService().getPlacePredictions({ input }, (predictions, status) => {
      if (!OK_STATUSES.has(status)) {
        reject(unavailable('Places autocomplete', status));
        return;
      }
      resolve(
        (predictions ?? []).flatMap((prediction) =>
          prediction.place_id
            ? [
                {
                  placeId: prediction.place_id,
                  mainText: prediction.structured_formatting?.main_text ?? prediction.description ?? '',
                  secondaryText: prediction.structured_formatting?.secondary_text ?? '',
                },
              ]
            : [],
        ),
      );
    });
  });
}

export async function placeDetails(placeId: string, signal?: AbortSignal): Promise<PlaceDetailsResult> {
  const places = await loadPlaces();
  return abortable(signal, (resolve, reject) => {
    // PlacesService wants an element for attributions; nothing here shows a map.
    new places.PlacesService(document.createElement('div')).getDetails(
      { placeId, fields: [...DETAILS_FIELDS] },
      (place, status) => {
        if (status !== 'OK' || !place) {
          reject(unavailable('Place details', status));
          return;
        }
        const location = place.geometry?.location;
        resolve({
          name: place.name ?? '',
          types: place.types ?? [],
          components: (place.address_components ?? []).map((part) => ({
            longName: part.long_name ?? '',
            shortName: part.short_name ?? '',
            types: part.types ?? [],
          })),
          latitude: location ? location.lat() : null,
          longitude: location ? location.lng() : null,
        });
      },
    );
  });
}
