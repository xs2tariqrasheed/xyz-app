/**
 * What the app needs from Google's (legacy) Places API, in one shape for both
 * transports: the web service on iOS / Android (`googlePlaces.ts`) and the
 * Maps JavaScript API in the browser (`googlePlaces.web.ts`).
 */

export type PlacePrediction = {
  placeId: string;
  /** "350 5th Avenue" */
  mainText: string;
  /** "New York, NY, USA" */
  secondaryText: string;
};

export type PlaceAddressComponent = {
  longName: string;
  shortName: string;
  types: readonly string[];
};

export type PlaceDetailsResult = {
  name: string;
  types: readonly string[];
  components: readonly PlaceAddressComponent[];
  latitude: number | null;
  longitude: number | null;
};

/** Fields Place Details is asked for — it bills per field. */
export const DETAILS_FIELDS = ['address_components', 'geometry.location', 'types', 'name'] as const;
