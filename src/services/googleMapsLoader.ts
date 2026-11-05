import { googleMapsApiKey } from '@/config/maps';

/**
 * Loads the Google Maps JavaScript API once per page, for the web build only
 * (`googlePlaces.web.ts`, `googleDirections.web.ts`). The legacy Places and
 * Directions web services send no CORS headers, so a browser reaches the same
 * data through this script instead. Native code never imports this file.
 *
 * Needs "Maps JavaScript API" enabled on the key, plus the services it fronts
 * ("Places API", "Directions API").
 */

const SCRIPT_URL = 'https://maps.googleapis.com/maps/api/js';
const READY_CALLBACK = '__xyzGoogleMapsReady';
/** Libraries loaded up front, so every service is ready when the callback fires. */
const LIBRARIES = 'places,routes';

/** `google.maps` — each caller reads its own slice of it. */
export type GoogleMapsNamespace = {
  importLibrary?: (name: string) => Promise<unknown>;
} & Record<string, unknown>;

type GoogleWindow = Window & {
  google?: { maps?: GoogleMapsNamespace };
  gm_authFailure?: () => void;
  [READY_CALLBACK]?: () => void;
};

let loading: Promise<GoogleMapsNamespace> | null = null;

/**
 * A failed Google call as an error the screen can show: the customer sees
 * `userMessage`; Google's own reason goes to the console in development.
 */
export function googleUnavailable(api: string, detail: string, userMessage: string): Error {
  if (__DEV__) console.warn(`[Google Maps] ${api} failed — ${detail}`);
  return new Error(userMessage);
}

export function loadGoogleMaps(userMessage: string): Promise<GoogleMapsNamespace> {
  if (loading) return loading;

  loading = new Promise<GoogleMapsNamespace>((resolve, reject) => {
    const host = window as GoogleWindow;
    const ready = host.google?.maps;
    if (ready) {
      resolve(ready);
      return;
    }

    // Google calls this when the key is refused (API not enabled, referrer not allowed, …).
    host.gm_authFailure = () => {
      if (__DEV__) {
        console.warn(
          '[Google Maps] Maps JavaScript API refused the key — check that "Maps JavaScript API", "Places API" and "Directions API" are enabled and the key allows this site.',
        );
      }
    };
    host[READY_CALLBACK] = () => {
      const maps = host.google?.maps;
      if (maps) resolve(maps);
      else reject(googleUnavailable('Maps JavaScript API', 'the script loaded without google.maps', userMessage));
    };

    const script = document.createElement('script');
    script.src = `${SCRIPT_URL}?${new URLSearchParams({
      key: googleMapsApiKey,
      libraries: LIBRARIES,
      loading: 'async',
      callback: READY_CALLBACK,
    })}`;
    script.async = true;
    script.onerror = () => {
      loading = null;
      reject(googleUnavailable('Maps JavaScript API', 'the script could not be loaded', userMessage));
    };
    document.head.appendChild(script);
  });

  return loading;
}

/**
 * A library's classes: through `importLibrary` when the loader offers it,
 * else straight off `google.maps` (where `libraries=` already put them).
 */
export async function googleLibrary<T>(name: string, userMessage: string): Promise<T> {
  const maps = await loadGoogleMaps(userMessage);
  if (typeof maps.importLibrary === 'function') return (await maps.importLibrary(name)) as T;
  return (name === 'places' ? maps.places : maps) as T;
}

/** Settles with a callback's answer, unless the caller gave up first. */
export function abortable<T>(
  signal: AbortSignal | undefined,
  run: (resolve: (value: T) => void, reject: (error: Error) => void) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Aborted'));
      return;
    }
    signal?.addEventListener('abort', () => reject(new Error('Aborted')));
    run(resolve, reject);
  });
}
