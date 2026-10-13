import { useRef, useState } from 'react';

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
 * Sends a gateway action on demand — logins, bookings, updates, deletes
 * (docs/XYZ_INTEGRATION_GUIDE.md §5). Nothing runs until `mutate` / `mutateAsync` is called.
 *
 * `isSuccess` means the gateway executed the action (`JHeader.ActionCode` 0);
 * callers still check any `o_code` in `parsedData` themselves. One instance
 * tracks its latest call only, so use one per action.
 */

type PostState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: GatewayResponse }
  | { status: 'error'; error: unknown };

export type PostDataResult = {
  /** Fire and forget; the outcome lands in the returned state. */
  mutate: (actionCode: ActionCode, viewName: string, jData: GatewayJData) => void;
  /** Same call, but resolves with the response or throws the error. */
  mutateAsync: (
    actionCode: ActionCode,
    viewName: string,
    jData: GatewayJData,
  ) => Promise<GatewayResponse>;
  reset: () => void;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  data?: GatewayResponse;
  /** `JData` rows keyed by their headings. */
  parsedData?: Record<string, string>[];
  error?: unknown;
  errorDisplay?: ErrorDisplay;
};

export function usePostData(): PostDataResult {
  const [state, setState] = useState<PostState>({ status: 'idle' });
  // Only the latest call may write state; an older one finishing late must
  // not overwrite a newer result.
  const latestCall = useRef(0);

  const mutateAsync = async (actionCode: ActionCode, viewName: string, jData: GatewayJData) => {
    const call = ++latestCall.current;
    setState({ status: 'loading' });
    try {
      const data = await callGateway(actionCode, jData, { viewName });
      if (call === latestCall.current) setState({ status: 'success', data });
      return data;
    } catch (error) {
      if (call === latestCall.current) setState({ status: 'error', error });
      throw error;
    }
  };

  const mutate = (actionCode: ActionCode, viewName: string, jData: GatewayJData) => {
    // The error is already in state; swallowing it here keeps it unhandled-free.
    mutateAsync(actionCode, viewName, jData).catch(() => undefined);
  };

  const reset = () => {
    latestCall.current += 1;
    setState({ status: 'idle' });
  };

  return {
    mutate,
    mutateAsync,
    reset,
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    data: state.status === 'success' ? state.data : undefined,
    parsedData: state.status === 'success' ? mapRows(state.data) : undefined,
    error: state.status === 'error' ? state.error : undefined,
    errorDisplay: state.status === 'error' ? getErrorDisplay(state.error) : undefined,
  };
}
