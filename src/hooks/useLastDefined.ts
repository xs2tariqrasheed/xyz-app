import { useState } from 'react';

/**
 * `value`, or the last one that wasn't `undefined` — so a refresh that fails,
 * or is still in flight, keeps the previous gateway answer on screen.
 * Mount it under a `key` for its request when the request itself can change.
 */
export function useLastDefined<T>(value: T | undefined): T | undefined {
  const [last, setLast] = useState(value);
  if (value !== undefined && value !== last) setLast(value);
  return value ?? last;
}
