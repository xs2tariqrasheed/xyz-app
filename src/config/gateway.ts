/**
 * API gateway and auth session configuration, read from `.env`:
 *
 *     EXPO_PUBLIC_DBAPI_URL=https://…/DBAPI/ProcessRequest
 *     EXPO_PUBLIC_DBAPI_SOURCE=…
 *     EXPO_PUBLIC_DBAPI_TARGET=…
 *     EXPO_PUBLIC_DBAPI_LOGIN=…
 *     EXPO_PUBLIC_DBAPI_PASSWORD=…
 *     EXPO_PUBLIC_AUTH_SESSION_MAX_AGE_HOURS=720
 *
 * plus the optional JHeader values in {@link jHeaderConfig}.
 *
 * Expo inlines `EXPO_PUBLIC_*` variables at build time, so each reference
 * below must stay static dot notation — `process.env['...']` is not
 * substituted.
 *
 * SECURITY: `EXPO_PUBLIC_` values ship inside the bundle in plain text,
 * including the gateway password.
 */

const env = {
  EXPO_PUBLIC_DBAPI_URL: process.env.EXPO_PUBLIC_DBAPI_URL?.trim() ?? '',
  EXPO_PUBLIC_DBAPI_SOURCE: process.env.EXPO_PUBLIC_DBAPI_SOURCE?.trim() ?? '',
  EXPO_PUBLIC_DBAPI_TARGET: process.env.EXPO_PUBLIC_DBAPI_TARGET?.trim() ?? '',
  EXPO_PUBLIC_DBAPI_LOGIN: process.env.EXPO_PUBLIC_DBAPI_LOGIN?.trim() ?? '',
  EXPO_PUBLIC_DBAPI_PASSWORD: process.env.EXPO_PUBLIC_DBAPI_PASSWORD?.trim() ?? '',
};

export const gatewayConfig = {
  url: env.EXPO_PUBLIC_DBAPI_URL,
  source: env.EXPO_PUBLIC_DBAPI_SOURCE,
  target: env.EXPO_PUBLIC_DBAPI_TARGET,
  apiLogin: env.EXPO_PUBLIC_DBAPI_LOGIN,
  apiPassword: env.EXPO_PUBLIC_DBAPI_PASSWORD,
};

/**
 * Optional JHeader values (docs/DM.md §4). Unset ones are sent as empty
 * strings; ClientVersion falls back to the app version from app.json.
 */
export const jHeaderConfig = {
  client: process.env.EXPO_PUBLIC_DBAPI_CLIENT?.trim() ?? '',
  clientVersion: process.env.EXPO_PUBLIC_DBAPI_CLIENT_VERSION?.trim() ?? '',
  apiVersion: process.env.EXPO_PUBLIC_DBAPI_API_VERSION?.trim() ?? '',
  requestedUrl: process.env.EXPO_PUBLIC_DBAPI_REQUESTED_URL?.trim() ?? '',
  /** Sent when no real position is known; DM.md defaults both to "0". */
  fallbackLatitude: process.env.EXPO_PUBLIC_JHEADER_FALLBACK_LAT?.trim() || '0',
  fallbackLongitude: process.env.EXPO_PUBLIC_JHEADER_FALLBACK_LNG?.trim() || '0',
  /**
   * Returns the caller's public IP (JSON `{ "ip": … }` or plain text). Unset
   * means no lookup: ClientIP is sent as "0.0.0.0".
   */
  clientIpLookupUrl: process.env.EXPO_PUBLIC_CLIENT_IP_LOOKUP_URL?.trim() ?? '',
};

/** Names of the gateway variables that are unset — empty when configured. */
export const missingGatewayEnv = (Object.keys(env) as (keyof typeof env)[]).filter(
  (name) => env[name].length === 0,
);

/** Used only when EXPO_PUBLIC_AUTH_SESSION_MAX_AGE_HOURS is unset or invalid. */
const DEFAULT_SESSION_MAX_AGE_HOURS = 720;

const rawMaxAge = Number(process.env.EXPO_PUBLIC_AUTH_SESSION_MAX_AGE_HOURS);

/** How long a stored login stays valid on this device. */
export const sessionMaxAgeMs =
  (Number.isFinite(rawMaxAge) && rawMaxAge > 0 ? rawMaxAge : DEFAULT_SESSION_MAX_AGE_HOURS) *
  60 *
  60 *
  1000;
