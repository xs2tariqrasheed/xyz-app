import { hasGoogleMapsKey } from '@/config/maps';
import { geocodeAddress } from '@/services/geocoding';
import { placeAutocomplete, placeDetails } from '@/services/googlePlaces';

/** Shortest query worth sending — anything less is mostly noise. */
export const MIN_QUERY_LENGTH = 3;

/** How a booking describes a stop (`P_PU_TYPE` / `P_DO_TYPE`). */
export type PlaceKind = 'address' | 'airport' | 'landmark';

/**
 * A stop broken into the fields `RES.I.RESERVATION` asks for. Built from a
 * saved address (gateway) or from Google Place Details; blanks stay ''.
 */
export type StructuredPlace = {
  kind: PlaceKind;
  country: string;
  state: string;
  city: string;
  county: string;
  zip: string;
  streetNumber: string;
  streetName: string;
  crossStreet: string;
  /** Suite, apartment or floor (`P_PU_ADDRESS_ADD` / `P_DO_ADDRESS_ADD`). */
  addressAdd: string;
  pickupPoint: string;
  /** Saved-address directions, offered as the leg's default instructions. */
  directions: string;
  airportName: string;
  landmarkName: string;
  /** Decimal degrees as strings — the gateway takes them that way. */
  latitude: string;
  longitude: string;
};

export type AddressSuggestion = {
  placeId: string;
  /** Street line, e.g. "1600 Amphitheatre Pkwy". */
  primary: string;
  /** Locality line, e.g. "Mountain View, CA, USA". */
  secondary: string;
  /**
   * Already-structured places (saved, profile and company addresses) carry
   * their fields; a Google prediction does not, and is looked up on pick.
   */
  place?: StructuredPlace;
};

export const EMPTY_PLACE: StructuredPlace = {
  kind: 'address',
  country: '',
  state: '',
  city: '',
  county: '',
  zip: '',
  streetNumber: '',
  streetName: '',
  crossStreet: '',
  addressAdd: '',
  pickupPoint: '',
  directions: '',
  airportName: '',
  landmarkName: '',
  latitude: '',
  longitude: '',
};

/**
 * Address search through Google Places (legacy) autocomplete — the web
 * service on iOS / Android, the Maps JavaScript API in the browser
 * (`googlePlaces.ts` / `googlePlaces.web.ts`). With no key configured there
 * is no search: the field offers only the customer's saved places.
 */
export async function fetchAddressSuggestions(
  query: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const input = query.trim();
  if (input.length < MIN_QUERY_LENGTH || !hasGoogleMapsKey) return [];

  const predictions = await placeAutocomplete(input, signal);
  return predictions.map((prediction) => ({
    placeId: prediction.placeId,
    primary: prediction.mainText,
    secondary: prediction.secondaryText,
  }));
}

/**
 * The booking fields of a picked suggestion. Saved places already carry them;
 * a Google prediction is resolved through Place Details. Google's `airport`
 * type makes an airport stop, a street address an address stop, and anything
 * else (a hotel, a station) a landmark — the old site's rule (guide 15).
 */
export async function resolvePlace(
  suggestion: AddressSuggestion,
  signal?: AbortSignal,
): Promise<StructuredPlace> {
  if (suggestion.place) return withCoordinates(suggestion, suggestion.place, signal);
  if (!hasGoogleMapsKey) throw new Error('Place lookup needs a Google Maps key.');

  const details = await placeDetails(suggestion.placeId, signal);
  const component = (type: string, short = false) => {
    const match = details.components.find((part) => part.types.includes(type));
    return (short ? match?.shortName : match?.longName) ?? '';
  };

  const { types } = details;
  const kind: PlaceKind = types.includes('airport')
    ? 'airport'
    : types.includes('street_address') || types.includes('premise') || types.includes('route')
      ? 'address'
      : 'landmark';
  const name = details.name || suggestion.primary;

  return {
    ...EMPTY_PLACE,
    kind,
    country: component('country', true),
    state: component('administrative_area_level_1', true),
    city: component('locality') || component('sublocality') || component('postal_town'),
    county: component('administrative_area_level_2'),
    zip: component('postal_code'),
    streetNumber: component('street_number'),
    streetName: component('route'),
    addressAdd: component('subpremise'),
    airportName: kind === 'airport' ? name : '',
    landmarkName: kind === 'landmark' ? name : '',
    latitude: details.latitude != null ? String(details.latitude) : '',
    longitude: details.longitude != null ? String(details.longitude) : '',
  };
}

/**
 * A saved place keeps its own fields; only missing coordinates (and a missing
 * ZIP) are filled by geocoding its address, so the booking can send them. A
 * failed lookup leaves the place as it was — the coordinates are a bonus.
 */
async function withCoordinates(
  suggestion: AddressSuggestion,
  place: StructuredPlace,
  signal?: AbortSignal,
): Promise<StructuredPlace> {
  if (place.latitude && place.longitude) return place;
  try {
    const found = await geocodeAddress(formatAddress(suggestion), signal);
    if (!found) return place;
    return {
      ...place,
      latitude: String(found.latitude),
      longitude: String(found.longitude),
      zip: place.zip || found.zip,
    };
  } catch {
    return place;
  }
}

/** Country names the gateway's rows use, onto the contract's two-letter code ("US"). */
const COUNTRY_CODES: Record<string, string> = {
  USA: 'US',
  'UNITED STATES': 'US',
  'UNITED STATES OF AMERICA': 'US',
};

export function toCountryCode(country: string): string {
  const value = country.trim();
  return COUNTRY_CODES[value.toUpperCase()] ?? (value.length === 2 ? value.toUpperCase() : value);
}

/** "12 Oak Street, Springfield, IL, USA" */
export function formatAddress(address: AddressSuggestion): string {
  return [address.primary, address.secondary].filter(Boolean).join(', ');
}

/** Street line of a structured place: "666 5 Ave", the airport, or the landmark. */
export function placeStreetLine(place: StructuredPlace): string {
  if (place.kind === 'airport' && place.airportName) return place.airportName;
  if (place.kind === 'landmark' && place.landmarkName) return place.landmarkName;
  return [place.streetNumber, place.streetName].filter(Boolean).join(' ');
}

/** Locality line of a structured place: "Manhattan, NY 10019". */
export function placeLocalityLine(place: StructuredPlace): string {
  const stateZip = [place.state, place.zip].filter(Boolean).join(' ');
  return [place.city, stateZip].filter(Boolean).join(', ');
}

/** A saved or loaded place as something the address field can show. */
export function toSuggestion(id: string, place: StructuredPlace): AddressSuggestion {
  return {
    placeId: id,
    primary: placeStreetLine(place) || placeLocalityLine(place),
    secondary: placeStreetLine(place) ? placeLocalityLine(place) : '',
    place,
  };
}
