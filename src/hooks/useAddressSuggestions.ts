import { useEffect, useState } from 'react';

import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  fetchAddressSuggestions,
  MIN_QUERY_LENGTH,
  type AddressSuggestion,
} from '@/services/places';

export type AddressSuggestionsState = {
  suggestions: AddressSuggestion[];
  loading: boolean;
  error: string | null;
};

/**
 * Debounced address lookup.
 *
 * Previous results stay on screen while the next request is in flight, so the
 * list does not blink empty between keystrokes.
 */
export function useAddressSuggestions(query: string, enabled: boolean): AddressSuggestionsState {
  const trimmed = query.trim();
  const debounced = useDebouncedValue(trimmed);
  const active = enabled && debounced.length >= MIN_QUERY_LENGTH;

  const [result, setResult] = useState<{
    query: string;
    items: AddressSuggestion[];
    error: string | null;
  } | null>(null);

  useEffect(() => {
    if (!active) return;

    const controller = new AbortController();
    let cancelled = false;

    fetchAddressSuggestions(debounced, controller.signal)
      .then((items) => {
        if (!cancelled) setResult({ query: debounced, items, error: null });
      })
      .catch((error: unknown) => {
        if (cancelled || controller.signal.aborted) return;
        setResult({
          query: debounced,
          items: [],
          error: error instanceof Error ? error.message : 'Could not load addresses',
        });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [active, debounced]);

  if (!active) {
    return { suggestions: [], loading: false, error: null };
  }

  // Loading covers both the debounce gap and the request itself.
  const settled = result?.query === debounced;
  return {
    suggestions: result?.items ?? [],
    loading: trimmed !== debounced || !settled,
    error: result?.error ?? null,
  };
}
