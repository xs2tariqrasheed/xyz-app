import { useMemo } from 'react';

import { ACTION_CODES, GATEWAY_VIEW_NAME } from '@/constants/actionCodes';
import { RIDES_MESSAGES } from '@/constants/messages';
import { useAuth } from '@/context/AuthContext';
import { useFetchData } from '@/hooks/useFetchData';
import { actionErrorMessage } from '@/hooks/useReservationActions';
import { getErrorDisplay } from '@/services/gateway';
import { loadReservationJData, type ReservationRecord, toReservationRecord } from '@/services/reservation';

export type ReservationRecordResult = {
  record: ReservationRecord | null;
  /** Set when the load failed or the server refused it; `null` while loading or loaded. */
  failureMessage: string | null;
  /** True only for the first load, before any answer is in. */
  isLoading: boolean;
  /** True while any load, a refresh included, is in flight. */
  isFetching: boolean;
  refetch: () => void;
};

/**
 * One reservation from `RES.S.LOAD_RESERVATION`, mapped for the screens —
 * details, voucher and receipt all read the same record the same way.
 */
export function useReservationRecord(reservationNumber: string, refreshKey = 0): ReservationRecordResult {
  const { session } = useAuth();
  const { data, isLoading, isError, error, refetch } = useFetchData(
    ACTION_CODES.LOAD_RESERVATION,
    GATEWAY_VIEW_NAME,
    loadReservationJData(session?.loginId ?? '', reservationNumber),
    refreshKey,
  );

  const loaded = useMemo((): { record: ReservationRecord | null; failure: string | null } => {
    if (!data) return { record: null, failure: null };
    try {
      return { record: toReservationRecord(data), failure: null };
    } catch (failure) {
      return { record: null, failure: actionErrorMessage(failure) };
    }
  }, [data]);

  const pending = isLoading && !data;
  let failureMessage: string | null = null;
  if (loaded.failure) failureMessage = loaded.failure;
  else if (isError) failureMessage = getErrorDisplay(error).customDescription;
  else if (!pending && !loaded.record) failureMessage = RIDES_MESSAGES.LOAD_RESERVATION_FAILED;

  return { record: loaded.record, failureMessage, isLoading: pending, isFetching: isLoading, refetch };
}
