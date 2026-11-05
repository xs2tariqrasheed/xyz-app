import type { Page } from '@playwright/test';

/**
 * Sandboxes Google Maps Platform for a test: address search, place details,
 * directions, geocoding and the static map image answer from fixtures, so a run never spends API
 * quota or depends on which APIs the key has enabled.
 */

export const PICKUP = {
  placeId: 'e2e-pickup',
  primary: '350 5th Ave',
  secondary: 'New York, NY, USA',
};

export const DESTINATION = {
  placeId: 'e2e-destination',
  primary: 'JFK International Airport',
  secondary: 'Queens, NY, USA',
};

const PLACES = [PICKUP, DESTINATION];

/** Place Details for each fixture, in the legacy Places shape: the fields a booking reads. */
const DETAILS: Record<string, object> = {
  [PICKUP.placeId]: {
    name: PICKUP.primary,
    types: ['street_address'],
    location: { lat: 40.7484, lng: -73.9857 },
    address_components: [
      { long_name: '350', short_name: '350', types: ['street_number'] },
      { long_name: '5th Avenue', short_name: '5th Ave', types: ['route'] },
      { long_name: 'New York', short_name: 'New York', types: ['locality'] },
      { long_name: 'New York County', short_name: 'New York County', types: ['administrative_area_level_2'] },
      { long_name: 'New York', short_name: 'NY', types: ['administrative_area_level_1'] },
      { long_name: 'United States', short_name: 'US', types: ['country'] },
      { long_name: '10118', short_name: '10118', types: ['postal_code'] },
    ],
  },
  [DESTINATION.placeId]: {
    name: DESTINATION.primary,
    types: ['airport', 'point_of_interest'],
    location: { lat: 40.6413, lng: -73.7781 },
    address_components: [
      { long_name: 'Queens', short_name: 'Queens', types: ['sublocality'] },
      { long_name: 'Queens County', short_name: 'Queens County', types: ['administrative_area_level_2'] },
      { long_name: 'New York', short_name: 'NY', types: ['administrative_area_level_1'] },
      { long_name: 'United States', short_name: 'US', types: ['country'] },
      { long_name: '11430', short_name: '11430', types: ['postal_code'] },
    ],
  },
};

/** Where every geocoding request lands — for saved addresses that come without coordinates. */
export const GEOCODED = { lat: 40.7605, lng: -73.9765 };

/** The one drive every route request gets: 26.5 km, 45 min, pickup to JFK. */
const ROUTE = {
  polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
  distanceMeters: 26_500,
  durationSeconds: 2_700,
  start: { lat: 40.7484, lng: -73.9857 },
  end: { lat: 40.6413, lng: -73.7781 },
};

/**
 * A stand-in for the Maps JavaScript API — what the web build loads for
 * address search and routes (`src/services/googlePlaces.web.ts`,
 * `googleDirections.web.ts`). Answers from the fixtures above, then calls the
 * page's ready callback.
 */
function fakeMapsScript(callback: string): string {
  const places = PLACES.map((place) => ({
    place_id: place.placeId,
    description: `${place.primary}, ${place.secondary}`,
    structured_formatting: { main_text: place.primary, secondary_text: place.secondary },
  }));
  return `(() => {
    const PREDICTIONS = ${JSON.stringify(places)};
    const DETAILS = ${JSON.stringify(DETAILS)};
    class AutocompleteService {
      getPlacePredictions({ input }, done) {
        const needle = String(input).toLowerCase();
        const matches = PREDICTIONS.filter((p) => p.description.toLowerCase().includes(needle));
        setTimeout(() => done(matches, matches.length ? 'OK' : 'ZERO_RESULTS'), 0);
      }
    }
    class PlacesService {
      getDetails({ placeId }, done) {
        const d = DETAILS[placeId];
        if (!d) return setTimeout(() => done(null, 'NOT_FOUND'), 0);
        const place = { ...d, geometry: { location: { lat: () => d.location.lat, lng: () => d.location.lng } } };
        setTimeout(() => done(place, 'OK'), 0);
      }
    }
    const ROUTE = ${JSON.stringify(ROUTE)};
    const latLng = (p) => ({ lat: () => p.lat, lng: () => p.lng });
    class DirectionsService {
      route(request, done) {
        setTimeout(() => done({
          routes: [{
            overview_polyline: ROUTE.polyline,
            legs: [{
              distance: { value: ROUTE.distanceMeters },
              duration: { value: ROUTE.durationSeconds },
              start_location: latLng(ROUTE.start),
              end_location: latLng(ROUTE.end),
            }],
          }],
        }, 'OK'), 0);
      }
    }
    // An interactive map that only records what it was told — enough for a
    // spec to see the route drawn and the zoom buttons wired.
    class Map {
      constructor(element) { this.zoom = 10; window.__e2eMap = this; element.setAttribute('data-e2e-map', 'ready'); }
      fitBounds(bounds) { this.bounds = bounds; this.zoom = 11; }
      getZoom() { return this.zoom; }
      setZoom(zoom) { this.zoom = zoom; }
    }
    class Polyline { constructor(options) { (window.__e2ePolylines ||= []).push(options); } setMap() {} }
    class Marker { constructor(options) { (window.__e2eMarkers ||= []).push(options); } setMap() {} }
    const places = { AutocompleteService, PlacesService };
    const routes = { DirectionsService };
    const maps = { Map, Polyline };
    const marker = { Marker };
    window.google = {
      maps: {
        places,
        DirectionsService,
        Map,
        Polyline,
        Marker,
        importLibrary: async (name) => ({ places, routes, maps, marker })[name] ?? {},
      },
    };
    window[${JSON.stringify(callback)}]?.();
  })();`;
}

// 1×1 transparent PNG.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

export async function sandboxGoogleMaps(page: Page): Promise<void> {
  await page.route('https://maps.googleapis.com/maps/api/js**', (route) => {
    const callback = new URL(route.request().url()).searchParams.get('callback') ?? '';
    return route.fulfill({ contentType: 'text/javascript', body: fakeMapsScript(callback) });
  });

  // iOS / Android web services, should a test ever reach them from the page.
  await page.route('https://maps.googleapis.com/maps/api/directions/json**', (route) =>
    route.fulfill({
      json: {
        status: 'OK',
        routes: [
          {
            overview_polyline: { points: ROUTE.polyline },
            legs: [
              {
                distance: { value: ROUTE.distanceMeters },
                duration: { value: ROUTE.durationSeconds },
                start_location: ROUTE.start,
                end_location: ROUTE.end,
              },
            ],
          },
        ],
      },
    }),
  );

  await page.route('https://maps.googleapis.com/maps/api/geocode/json**', (route) =>
    route.fulfill({
      json: {
        status: 'OK',
        results: [
          {
            formatted_address: `${PICKUP.primary}, ${PICKUP.secondary}`,
            geometry: { location: GEOCODED },
            address_components: [{ short_name: '10019', types: ['postal_code'] }],
          },
        ],
      },
    }),
  );

  await page.route('https://maps.googleapis.com/maps/api/staticmap**', (route) =>
    route.fulfill({ contentType: 'image/png', body: PIXEL }),
  );
}
