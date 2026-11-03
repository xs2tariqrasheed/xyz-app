import { useEffect, useState } from 'react';

import type { ActionCode } from '@/constants/actionCodes';
import {
  callGateway,
  type ErrorDisplay,
  getErrorDisplay,
  type GatewayJData,
  type GatewayResponse,
  mapRows,
} from '@/services/gateway';

/**
 * Reads from the gateway — dropdowns, lists, profile data (docs/XYZ_INTEGRATION_GUIDE.md §5).
 *
 * Runs on mount and again whenever any input changes. Inputs are compared by
 * value, so an inline `jData` literal is fine, but keep values that change on
 * every render (timestamps, random ids) out of it. The previous result stays
 * visible while a refetch of the same request is in flight.
 *
 * `refreshKey` re-runs the same request whenever it changes, so one screen
 * can refresh several reads together (Track your route's polling).
 */

export type FetchDataResult = {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  data?: GatewayResponse;
  /** `JData` rows keyed by their headings. */
  parsedData?: Record<string, string>[];
  error?: unknown;
  errorDisplay?: ErrorDisplay;
  refetch: () => void;
};

type Settled = {
  requestKey: string;
  /** Which run answered: the `refetch` count and the caller's `refreshKey`. */
  run: string;
  data?: GatewayResponse;
  error?: unknown;
};

export function useFetchData(
  actionCode: ActionCode,
  viewName: string,
  jData: GatewayJData,
  refreshKey = 0,
): FetchDataResult {
  const requestKey = JSON.stringify([actionCode, viewName, jData]);
  const [attempt, setAttempt] = useState(0);
  const run = `${attempt}:${refreshKey}`;
  const [settled, setSettled] = useState<Settled | null>(null);

  useEffect(() => {
    // Read the inputs back from the key so the effect depends on their value,
    // not on the identity of a jData object rebuilt every render.
    const [code, view, params] = JSON.parse(requestKey) as [ActionCode, string, GatewayJData];
    const controller = new AbortController();

    callGateway(code, params, { viewName: view, signal: controller.signal }).then(
      (data) => {
        if (!controller.signal.aborted) setSettled({ requestKey, run, data });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setSettled({ requestKey, run, error });
      },
    );

    return () => controller.abort();
  }, [requestKey, run]);

  const current = settled?.requestKey === requestKey ? settled : null;
  const done = current?.run === run;
  const failed = done && current.error !== undefined;

  return {
    isLoading: !done,
    isSuccess: done && !failed,
    isError: failed,
    data: current?.data,
    parsedData: current?.data ? mapRows(current.data) : undefined,
    error: failed ? current.error : undefined,
    errorDisplay: failed ? getErrorDisplay(current.error) : undefined,
    refetch: () => setAttempt((count) => count + 1),
  };
}
