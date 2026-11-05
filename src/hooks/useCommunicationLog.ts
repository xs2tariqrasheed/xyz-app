import { useMemo } from 'react';

import { ACTION_CODES, GATEWAY_VIEW_NAME } from '@/constants/actionCodes';
import { useFetchData } from '@/hooks/useFetchData';
import { useLastDefined } from '@/hooks/useLastDefined';
import { type CommunicationEntry, communicationLogJData, toCommunicationLog } from '@/services/reservation';

export type CommunicationLogState = {
  entries: CommunicationEntry[];
  /** True only for the first load, before any answer is in. */
  isLoading: boolean;
  /** True while any call, a refetch included, is in flight. */
  isFetching: boolean;
  /** The call failed or the server refused it. */
  failed: boolean;
  refetch: () => void;
};

/**
 * The questions asked about a ride and their answers (`RES.S.COMMUNICATION_LOG`).
 * A failed refresh keeps the last answer on screen; `failed` is set only when
 * there is none to show.
 */
export function useCommunicationLog(loginId: string, reservationNumber: string, refreshKey = 0): CommunicationLogState {
  const log = useFetchData(
    ACTION_CODES.COMMUNICATION_LOG,
    GATEWAY_VIEW_NAME,
    communicationLogJData(loginId, reservationNumber),
    refreshKey,
  );
  const data = useLastDefined(log.data);
  const mapped = useMemo((): { entries: CommunicationEntry[]; refused: boolean } => {
    if (!data) return { entries: [], refused: false };
    try {
      return { entries: toCommunicationLog(data), refused: false };
    } catch {
      return { entries: [], refused: true };
    }
  }, [data]);

  return {
    entries: mapped.entries,
    isLoading: log.isLoading && !data,
    isFetching: log.isLoading,
    failed: mapped.refused || (log.isError && !data),
    refetch: log.refetch,
  };
}
