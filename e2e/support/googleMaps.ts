import type { Page } from '@playwright/test';

/**
 * Sandboxes Google Maps Platform for a test: address autocomplete, routing
 * and the static map image answer from fixtures, so a run never spends API
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

// 1×1 transparent PNG.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

export async function sandboxGoogleMaps(page: Page): Promise<void> {
  await page.route('https://places.googleapis.com/**', async (route) => {
    const { input = '' } = (route.request().postDataJSON() ?? {}) as { input?: string };
    const needle = input.toLowerCase();
    const matches = PLACES.filter((place) =>
      `${place.primary} ${place.secondary}`.toLowerCase().includes(needle),
    );
    await route.fulfill({
      json: {
        suggestions: matches.map((place) => ({
          placePrediction: {
            placeId: place.placeId,
            text: { text: `${place.primary}, ${place.secondary}` },
            structuredFormat: {
              mainText: { text: place.primary },
              secondaryText: { text: place.secondary },
            },
          },
        })),
      },
    });
  });

  await page.route('https://routes.googleapis.com/**', (route) =>
    route.fulfill({
      json: {
        routes: [
          {
            duration: '2700s',
            distanceMeters: 26_500,
            polyline: { encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' },
            legs: [
              {
                startLocation: { latLng: { latitude: 40.7484, longitude: -73.9857 } },
                endLocation: { latLng: { latitude: 40.6413, longitude: -73.7781 } },
              },
            ],
          },
        ],
      },
    }),
  );

  await page.route('https://maps.googleapis.com/maps/api/staticmap**', (route) =>
    route.fulfill({ contentType: 'image/png', body: PIXEL }),
  );
}
