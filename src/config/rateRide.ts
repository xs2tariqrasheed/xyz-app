/**
 * The live "Rate a ride" form (reverse-engineer-guide/24, missing-screens/08
 * §4.2), read from `.env`:
 *
 *     EXPO_PUBLIC_RATE_A_RIDE_URL=https://www.xyzcar.com/rate-a-ride/
 *
 * Ride history links each completed ride to this page with `?rideno=`, as the
 * live site does, until the gateway has a rating code (`RES.I.RIDE_RATING`).
 *
 * Expo inlines `EXPO_PUBLIC_*` variables at build time, so the reference
 * below must stay static dot notation — `process.env['...']` is not
 * substituted.
 */
const rawUrl = process.env.EXPO_PUBLIC_RATE_A_RIDE_URL;

function absoluteHttpUrl(value: string | undefined): string {
  const trimmed = value?.trim() ?? '';
  try {
    const { protocol } = new URL(trimmed);
    return protocol === 'https:' || protocol === 'http:' ? trimmed : '';
  } catch {
    return '';
  }
}

const baseUrl = absoluteHttpUrl(rawUrl);

/** False until the URL is set — the feedback link is then hidden. */
export const hasRateRideUrl = baseUrl.length > 0;

/** The rate-a-ride page with the ride number pre-filled. */
export function rateRideUrl(rideNo: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set('rideno', rideNo);
  return url.toString();
}

if (__DEV__ && !hasRateRideUrl) {
  console.warn(
    '[Rate a ride] The feedback link is hidden — set EXPO_PUBLIC_RATE_A_RIDE_URL (an absolute URL) in .env, then restart Expo.',
  );
}
