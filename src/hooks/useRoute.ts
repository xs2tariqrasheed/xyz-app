import { useEffect, useState } from 'react';

import type { AddressSuggestion } from '@/services/places';
import { fetchRoute, type RouteSummary } from '@/services/routes';

export type RouteState = {
  route: RouteSummary | null;
  loading: boolean;
  error: string | null;
};

/** Looks up the driving route whenever both endpoints are set. */
export function useRoute(
  origin: AddressSuggestion | null,
  destination: AddressSuggestion | null,
): RouteState {
  const key = origin && destination ? `${origin.placeId}>${destination.placeId}` : null;

  const [result, setResult] = useState<{
    key: string;
    route: RouteSummary | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    if (!key || !origin || !destination) return;

    const controller = new AbortController();
    let cancelled = false;

    fetchRoute(origin.placeId, destination.placeId, controller.signal)
      .then((route) => {
        if (!cancelled) setResult({ key, route, error: null });
      })
      .catch((error: unknown) => {
        if (cancelled || controller.signal.aborted) return;
        setResult({
          key,
          route: null,
          error: error instanceof Error ? error.message : 'Could not load the route',
        });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [key, origin, destination]);

  if (!key) return { route: null, loading: false, error: null };

  const settled = result?.key === key;
  return {
    route: settled ? result.route : null,
    loading: !settled,
    error: settled ? result.error : null,
  };
}
