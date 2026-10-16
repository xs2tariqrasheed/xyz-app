import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Alert } from '@/components/ui/Alert';
import { Sheet } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { ACTION_CODES, GATEWAY_VIEW_NAME } from '@/constants/actionCodes';
import { RIDES_MESSAGES } from '@/constants/messages';
import { useAuth } from '@/context/AuthContext';
import { actionErrorMessage } from '@/hooks/useReservationActions';
import { usePostData } from '@/hooks/usePostData';
import {
  assertCancelled,
  CANCEL_REASON_MAX,
  cancelReservationJData,
  validateCancelReason,
} from '@/services/reservation';
import { colors, space } from '@/theme';

export type CancelReservationSheetProps = {
  /** The ride to cancel; the sheet is open while one is set. */
  reservationNumber: string | null;
  onClose: () => void;
  /** After the server accepted the cancel. */
  onCancelled: (reservationNumber: string) => void;
};

/**
 * Asks for a reason, then cancels with `RES.U.CANCEL_RESERVATION`
 * (reverse-engineer-implemented/guide/19). The call is never resent, and the confirm
 * button stays locked while it is in flight.
 */
export function CancelReservationSheet({ reservationNumber, onClose, onCancelled }: CancelReservationSheetProps) {
  const { session } = useAuth();
  const cancel = usePostData();
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const reasonError = validateCancelReason(reason);

  const close = () => {
    setReason('');
    setTouched(false);
    setFailure(null);
    onClose();
  };

  const confirm = async () => {
    setTouched(true);
    if (reasonError || !reservationNumber || !session || cancel.isLoading) return;
    setFailure(null);
    try {
      const response = await cancel.mutateAsync(
        ACTION_CODES.CANCEL_RESERVATION,
        GATEWAY_VIEW_NAME,
        cancelReservationJData(session.loginId, reservationNumber, reason),
        { retry: false },
      );
      assertCancelled(response);
      setReason('');
      setTouched(false);
      onCancelled(reservationNumber);
    } catch (error) {
      setFailure(actionErrorMessage(error));
    }
  };

  return (
    <Sheet
      visible={reservationNumber !== null}
      title={RIDES_MESSAGES.CANCEL_TITLE}
      subtitle={reservationNumber ?? undefined}
      onClose={close}
      onConfirm={() => void confirm()}
      confirmLabel={cancel.isLoading ? RIDES_MESSAGES.CANCELLING : RIDES_MESSAGES.CANCEL_CONFIRM}
      confirmVariant="danger"
      confirmDisabled={cancel.isLoading}
      dismissLabel={RIDES_MESSAGES.CANCEL_KEEP}
    >
      <View style={styles.body}>
        <Text style={styles.text}>{RIDES_MESSAGES.CANCEL_BODY}</Text>
        {failure ? <Alert tone="danger" title={RIDES_MESSAGES.CANCEL_FAILED_TITLE} message={failure} /> : null}
        <TextField
          label={RIDES_MESSAGES.CANCEL_REASON_LABEL}
          required
          value={reason}
          onChangeText={setReason}
          onBlur={() => setTouched(true)}
          placeholder={RIDES_MESSAGES.CANCEL_REASON_PLACEHOLDER}
          maxLength={CANCEL_REASON_MAX}
          error={touched && reasonError ? reasonError : undefined}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.md },
  text: { color: colors.textBody, fontSize: 14, lineHeight: 20 },
});
