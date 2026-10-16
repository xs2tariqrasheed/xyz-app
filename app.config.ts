import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Adds what app.json cannot express: the Google Maps key, read from `.env`,
 * for react-native-maps in native builds (EAS / `expo run`). Expo Go ships
 * its own key, so `expo start` works without this.
 *
 * The key needs "Maps SDK for Android" / "Maps SDK for iOS" enabled for the
 * native map, besides the web services the app calls (see .env.example).
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';
  return {
    ...config,
    name: config.name ?? 'xyz-app',
    slug: config.slug ?? 'xyz-app',
    plugins: [
      ...(config.plugins ?? []),
      ['react-native-maps', { androidGoogleMapsApiKey: key, iosGoogleMapsApiKey: key }],
    ],
  };
};
