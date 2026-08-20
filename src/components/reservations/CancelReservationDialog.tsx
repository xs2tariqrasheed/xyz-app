import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Sheet } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import type { Reservation } from '@/data/reservations';
import { colors, radii, space } from '@/theme';
import { formatClockTime, formatShortDate } from '@/utils/datetime';

/** Long enough for a real explanation, short enough to sit in a list cell. */
const REASON_MAX_LENGTH = 200;

export type CancelReservationDialogProps = {
  /** The ride being called off, or `null` when the dialog is closed. */
  reservation: Reservation | null;
  onClose: () => void;
  onConfirm: (reservation: Reservation, reason: string) => void;
};

/**
 * Confirms a cancellation and collects the reason for it.
 *
 * The reason is mandatory: the confirm button stays disabled until there is
 * something to send, so a ride can never be called off without one.
 */
export function CancelReservationDialog({
  reservation,
  onClose,
  onConfirm,
}: CancelReservationDialogProps) {
  const [reason, setReason] = useState('');

  // Reset during render rather than in an effect, so reopening the dialog on a
  // different ride never shows the previous ride's reason for a frame.
  const [lastId, setLastId] = useState(reservation?.id);
  if (lastId !== reservation?.id) {
    setLastId(reservation?.id);
    setReason('');
  }

  const trimmed = reason.trim();

  return (
    <Sheet
      visible={reservation !== null}
      title="Cancel reservation"
      subtitle="The driver will be stood down."
      confirmLabel="Cancel ride"
      confirmVariant="danger"
      confirmDisabled={trimmed.length === 0}
      dismissLabel="No, thanks"
      onClose={onClose}
      onConfirm={() => {
        if (reservation && trimmed) onConfirm(reservation, trimmed);
      }}
    >
      {reservation ? (
        <View style={styles.body}>
          <Text style={styles.lede}>
            You have selected to cancel reservation{' '}
            <Text style={styles.ledeId}>{reservation.id}</Text>. This action is irreversible.
          </Text>

          <View style={styles.summary}>
            <Text style={styles.summaryLine}>{reservation.passengerName}</Text>
            <Text style={styles.summaryLine}>
              {formatShortDate(reservation.pickupAt)} · {formatClockTime(reservation.pickupAt)}
            </Text>
            <Text style={styles.summaryLine} numberOfLines={2}>
              {reservation.pickupLocation} → {reservation.destination}
            </Text>
          </View>

          <TextField
            label="Reason"
            required
            hint="Tell us why so we can pass it on to dispatch."
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Flight was rescheduled"
            multiline
            numberOfLines={3}
            maxLength={REASON_MAX_LENGTH}
            textAlignVertical="top"
            inputStyle={styles.reasonInput}
            autoCapitalize="sentences"
          />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.lg },

  lede: { color: colors.textBody, fontSize: 14, lineHeight: 20 },
  ledeId: { color: colors.danger, fontWeight: '700' },

  summary: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.md,
    padding: space.md,
    gap: 2,
  },
  summaryLine: { color: colors.textBody, fontSize: 13, lineHeight: 18 },

  reasonInput: { minHeight: 76 },
});
