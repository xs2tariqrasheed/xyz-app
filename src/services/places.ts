import { googleMapsApiKey, hasGoogleMapsKey } from '@/config/maps';

const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';

/** Shortest query worth sending — anything less is mostly noise. */
export const MIN_QUERY_LENGTH = 3;

export type AddressSuggestion = {
  placeId: string;
  /** Street line, e.g. "1600 Amphitheatre Pkwy". */
  primary: string;
  /** Locality line, e.g. "Mountain View, CA, USA". */
  secondary: string;
};

/** Shape of the slice of the Places response we ask for. */
type AutocompleteResponse = {
  suggestions?: {
    placePrediction?: {
      placeId?: string;
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
      text?: { text?: string };
    };
  }[];
};

/**
 * Places API (New) autocomplete.
 *
 * Falls back to {@link SAMPLE_ADDRESSES} while no key is configured, so the
 * field is demonstrable before the Google project is wired up.
 */
export async function fetchAddressSuggestions(
  query: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const input = query.trim();
  if (input.length < MIN_QUERY_LENGTH) return [];

  if (!hasGoogleMapsKey) return filterSamples(input);

  const response = await fetch(AUTOCOMPLETE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': googleMapsApiKey,
    },
    body: JSON.stringify({ input }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Places autocomplete failed (${response.status})`);
  }

  const json = (await response.json()) as AutocompleteResponse;

  return (json.suggestions ?? []).flatMap((suggestion) => {
    const prediction = suggestion.placePrediction;
    // Query predictions carry no place id, so they cannot become a ride stop.
    if (!prediction?.placeId) return [];

    return [
      {
        placeId: prediction.placeId,
        primary: prediction.structuredFormat?.mainText?.text ?? prediction.text?.text ?? '',
        secondary: prediction.structuredFormat?.secondaryText?.text ?? '',
      },
    ];
  });
}

/** "12 Oak Street, Springfield, IL, USA" */
export function formatAddress(address: AddressSuggestion): string {
  return [address.primary, address.secondary].filter(Boolean).join(', ');
}

/** Stand-in results used until a key is present. Clearly labelled in the UI. */
export const SAMPLE_ADDRESSES: readonly AddressSuggestion[] = [
  { placeId: 'sample-1', primary: '12 Oak Street', secondary: 'Springfield, IL, USA' },
  { placeId: 'sample-2', primary: '440 Pine Avenue', secondary: 'Springfield, IL, USA' },
  { placeId: 'sample-3', primary: 'Springfield Regional Airport', secondary: 'Terminal A, Springfield, IL' },
  { placeId: 'sample-4', primary: 'Union Station', secondary: '500 Monroe St, Springfield, IL' },
  { placeId: 'sample-5', primary: 'Riverside Medical Center', secondary: '77 River Rd, Springfield, IL' },
  { placeId: 'sample-6', primary: 'Grandview Hotel', secondary: '9 Market Square, Springfield, IL' },
];

function filterSamples(input: string): AddressSuggestion[] {
  const needle = input.toLowerCase();
  const matches = SAMPLE_ADDRESSES.filter(
    (address) =>
      address.primary.toLowerCase().includes(needle) ||
      address.secondary.toLowerCase().includes(needle),
  );
  // Always show something, so typing never looks broken pre-integration.
  return matches.length > 0 ? matches : [...SAMPLE_ADDRESSES].slice(0, 4);
}
