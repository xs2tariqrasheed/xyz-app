import { StyleSheet, Text, View } from 'react-native';

import { RECEIPTS_MESSAGES } from '@/constants/messages';
import {
  canLeaveFeedback,
  canModifyRide,
  hasReceipt,
  PAYMENT_METHOD_LABELS,
  type Ride,
} from '@/services/rides';
import { colors, radii, shadowValues, space } from '@/theme';
import { formatClockTime, formatSlashDate } from '@/utils/datetime';

import { RideActionLink, type RideActionHandler } from './RideActionLink';
import { RideRoute } from './RideRoute';
import { RideStatusBadge } from './RideStatusBadge';

export type RideCardProps = {
  ride: Ride;
  now: Date;
  onAction: RideActionHandler;
};

/** One ride on a phone: the same ten fields, stacked instead of columned. */
export function RideCard({ ride, now, onAction }: RideCardProps) {
  const modifiable = canModifyRide(ride, now);
  const feedback = canLeaveFeedback(ride);
  const receipt = hasReceipt(ride);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <RideActionLink label={ride.id} onPress={() => onAction('view', ride)} />
          <Text style={styles.passenger}>{ride.passengerName}</Text>
        </View>
        <RideStatusBadge status={ride.status} />
      </View>

      <View style={styles.pickupRow}>
        <Text style={styles.pickupDate}>{formatSlashDate(ride.pickupAt)}</Text>
        <Text style={styles.pickupTime}>{formatClockTime(ride.pickupAt)}</Text>
      </View>

      <RideRoute pickup={ride.pickupLocation} destination={ride.destination} />

      <View style={styles.meta}>
        <Meta label="Payment" value={PAYMENT_METHOD_LABELS[ride.paymentMethod]} />
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Voucher</Text>
          {ride.voucherNo ? (
            <RideActionLink label={ride.voucherNo} onPress={() => onAction('voucher', ride)} />
          ) : (
            <Text style={styles.metaValue}>—</Text>
          )}
        </View>
      </View>

      {modifiable || feedback || receipt ? (
        <View style={styles.actions}>
          {modifiable ? (
            <>
              <RideActionLink label="Modify ride" onPress={() => onAction('modify', ride)} />
              <RideActionLink
                label="Cancel ride"
                tone="danger"
                onPress={() => onAction('cancel', ride)}
              />
            </>
          ) : null}
          {receipt ? (
            <RideActionLink label={RECEIPTS_MESSAGES.VIEW} onPress={() => onAction('receipt', ride)} />
          ) : null}
          {feedback ? (
            <RideActionLink label="Leave feedback" onPress={() => onAction('feedback', ride)} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: space.lg,
    gap: space.md,
    boxShadow: shadowValues.sm,
  },

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  headerText: { flex: 1, gap: 2 },
  passenger: { color: colors.textMuted, fontSize: 13 },

  pickupRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space.sm,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  pickupDate: { color: colors.textStrong, fontSize: 14, fontWeight: '700' },
  pickupTime: { color: colors.textBody, fontSize: 13 },

  meta: {
    flexDirection: 'row',
    gap: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space.md,
  },
  metaItem: { flex: 1, gap: 2 },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  metaValue: { color: colors.textStrong, fontSize: 14 },

  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space.sm,
  },
});
