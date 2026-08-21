import { StyleSheet, Text, View } from 'react-native';

import { PinGlyph } from '@/components/ui/Glyph';
import {
  canLeaveFeedback,
  canModifyRide,
  PAYMENT_METHOD_LABELS,
  type Ride,
} from '@/services/rides';
import { colors, radii, shadowValues, space } from '@/theme';
import { formatClockTime, formatSlashDate } from '@/utils/datetime';

import { RideActionLink, type RideActionHandler } from './RideActionLink';
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

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.rideNo}>{ride.id}</Text>
          <Text style={styles.passenger}>{ride.passengerName}</Text>
        </View>
        <RideStatusBadge status={ride.status} />
      </View>

      <View style={styles.pickupRow}>
        <Text style={styles.pickupDate}>{formatSlashDate(ride.pickupAt)}</Text>
        <Text style={styles.pickupTime}>{formatClockTime(ride.pickupAt)}</Text>
      </View>

      <View style={styles.route}>
        <Leg label="Pickup" value={ride.pickupLocation} tone="primary" />
        <View style={styles.legLine} />
        <Leg label="Destination" value={ride.destination} tone="accent" />
      </View>

      <View style={styles.meta}>
        <Meta label="Payment" value={PAYMENT_METHOD_LABELS[ride.paymentMethod]} />
        <Meta label="Voucher" value={ride.voucherNo ?? '—'} />
      </View>

      {modifiable || feedback ? (
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
          {feedback ? (
            <RideActionLink label="Leave feedback" onPress={() => onAction('feedback', ride)} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Leg({ label, value, tone }: { label: string; value: string; tone: 'primary' | 'accent' }) {
  return (
    <View style={styles.leg}>
      <View style={[styles.legPin, tone === 'accent' ? styles.legPinAccent : null]}>
        <PinGlyph color={tone === 'accent' ? colors.accent : colors.primary[600]} size={14} />
      </View>
      <View style={styles.legText}>
        <Text style={styles.legLabel}>{label}</Text>
        <Text style={styles.legValue}>{value}</Text>
      </View>
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
  rideNo: { color: colors.textLink, fontSize: 15, fontWeight: '700' },
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

  route: { gap: 2 },
  leg: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  legPin: {
    width: 26,
    height: 26,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legPinAccent: { backgroundColor: colors.accentSubtle },
  legText: { flex: 1, gap: 1 },
  legLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  legValue: { color: colors.textStrong, fontSize: 14, lineHeight: 19 },
  legLine: {
    width: 1,
    height: space.md,
    marginLeft: 13,
    backgroundColor: colors.borderStrong,
  },

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
