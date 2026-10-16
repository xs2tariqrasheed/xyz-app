import { useRouter } from 'expo-router';
import { useState } from 'react';

import { ACTION_CODES, GATEWAY_VIEW_NAME } from '@/constants/actionCodes';
import { RIDES_MESSAGES } from '@/constants/messages';
import { useAuth } from '@/context/AuthContext';
import { useReservation } from '@/context/ReservationContext';
import { usePostData } from '@/hooks/usePostData';
import { getErrorDisplay } from '@/services/gateway';
import {
  type DraftMode,
  loadReservationJData,
  ReservationError,
  toReservationRecord,
} from '@/services/reservation';

/** What to tell the customer about a failed action: the server's refusal, or general copy. */
export function actionErrorMessage(error: unknown): string {
  return error instanceof ReservationError ? error.message : getErrorDisplay(error).customDescription;
}

/**
 * Opens a reservation in the booking wizard — to change it, book the way
 * back, or book it again (reverse-engineer-guide/19, 22). The record is
 * loaded fresh with `RES.S.LOAD_RESERVATION`, so the wizard never edits a
 * stale list row.
 */
export function useOpenReservation() {
  const router = useRouter();
  const { session } = useAuth();
  const { startFrom } = useReservation();
  const load = usePostData();
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = async (reservationNumber: string, mode: Exclude<DraftMode, 'new'>) => {
    if (!session || openingId) return;
    setOpeningId(reservationNumber);
    setError(null);
    try {
      const response = await load.mutateAsync(
        ACTION_CODES.LOAD_RESERVATION,
        GATEWAY_VIEW_NAME,
        loadReservationJData(session.loginId, reservationNumber),
      );
      const record = toReservationRecord(response);
      if (!record) throw new ReservationError(RIDES_MESSAGES.LOAD_RESERVATION_FAILED);
      startFrom(record, mode);
      router.navigate('/reserver-2');
    } catch (failure) {
      setError(actionErrorMessage(failure));
    } finally {
      setOpeningId(null);
    }
  };

  return { open, openingId, error, clearError: () => setError(null) };
}
