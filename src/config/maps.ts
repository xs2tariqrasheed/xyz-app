/**
 * Google Maps Platform configuration.
 *
 * The key is read from `.env` at the project root:
 *
 *     EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
 *
 * Expo inlines `EXPO_PUBLIC_*` variables at build time, so the reference below
 * must stay static dot notation — `process.env['...']` is not substituted.
 *
 * SECURITY: anything with the `EXPO_PUBLIC_` prefix ships inside the bundle in
 * plain text. Restrict the key in the Google Cloud console (APIs + platform)
 * and move to a server-side proxy before this handles real traffic.
 */
const rawKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export const googleMapsApiKey = rawKey?.trim() ?? '';

/** False until a key is configured — the UI falls back to sample data. */
export const hasGoogleMapsKey = googleMapsApiKey.length > 0;
