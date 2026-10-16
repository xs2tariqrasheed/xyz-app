import { StyleSheet, Text, View } from 'react-native';

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

export type RideResultsTableProps = {
  rides: readonly Ride[];
  now: Date;
  onAction: RideActionHandler;
};

/**
 * Column widths as flex weights rather than pixels, so the table breathes with
 * the window instead of forcing a horizontal scrollbar.
 */
const COLUMNS = {
  rideNo: 1.15,
  passenger: 0.9,
  pickupDate: 1,
  pickupLocation: 1.45,
  destination: 1.45,
  // Wide enough that the longest status pill ("IN PROGRESS") stays on one line.
  status: 1.35,
  payment: 0.95,
  voucher: 0.8,
  actions: 0.9,
  feedback: 0.85,
} as const;

/** Desktop and tablet-landscape view of a result set. */
export function RideResultsTable({ rides, now, onAction }: RideResultsTableProps) {
  return (
    <View style={styles.table}>
      <View style={styles.headerRow}>
        <HeaderCell label="Ride No." weight={COLUMNS.rideNo} />
        <HeaderCell label="Passenger" weight={COLUMNS.passenger} />
        <HeaderCell label="Pickup date" weight={COLUMNS.pickupDate} />
        <HeaderCell label="Pickup location" weight={COLUMNS.pickupLocation} />
        <HeaderCell label="Destination" weight={COLUMNS.destination} />
        <HeaderCell label="Status" weight={COLUMNS.status} />
        <HeaderCell label="Payment" weight={COLUMNS.payment} />
        <HeaderCell label="Voucher" weight={COLUMNS.voucher} />
        <HeaderCell label="Actions" weight={COLUMNS.actions} />
        <HeaderCell label="Feedback" weight={COLUMNS.feedback} />
      </View>

      {rides.map((ride, index) => (
        <View
          key={ride.id}
          // Zebra striping: on a ten-column row it is what keeps the eye on one
          // ride while scanning across.
          style={[styles.row, index % 2 === 1 ? styles.rowAlt : null]}
        >
          <View style={[styles.cell, { flex: COLUMNS.rideNo }]}>
            <RideActionLink label={ride.id} onPress={() => onAction('view', ride)} />
          </View>
          <View style={[styles.cell, { flex: COLUMNS.passenger }]}>
            <Text style={styles.cellText}>{ride.passengerName}</Text>
          </View>
          <View style={[styles.cell, { flex: COLUMNS.pickupDate }]}>
            <Text style={styles.cellText}>{formatSlashDate(ride.pickupAt)}</Text>
            <Text style={styles.cellMuted}>{formatClockTime(ride.pickupAt)}</Text>
          </View>
          <View style={[styles.cell, { flex: COLUMNS.pickupLocation }]}>
            <Text style={styles.cellText}>{ride.pickupLocation}</Text>
          </View>
          <View style={[styles.cell, { flex: COLUMNS.destination }]}>
            <Text style={styles.cellText}>{ride.destination}</Text>
          </View>
          <View style={[styles.cell, { flex: COLUMNS.status }]}>
            <RideStatusBadge status={ride.status} />
          </View>
          <View style={[styles.cell, { flex: COLUMNS.payment }]}>
            <Text style={styles.cellText}>{PAYMENT_METHOD_LABELS[ride.paymentMethod]}</Text>
          </View>
          <View style={[styles.cell, { flex: COLUMNS.voucher }]}>
            {ride.voucherNo ? (
              <RideActionLink label={ride.voucherNo} onPress={() => onAction('voucher', ride)} />
            ) : (
              <Text style={styles.cellEmpty}>—</Text>
            )}
          </View>
          <View style={[styles.cell, { flex: COLUMNS.actions }]}>
            {canModifyRide(ride, now) ? (
              <>
                <RideActionLink label="Modify" onPress={() => onAction('modify', ride)} />
                <RideActionLink label="Cancel" tone="danger" onPress={() => onAction('cancel', ride)} />
              </>
            ) : (
              <Text style={styles.cellEmpty}>—</Text>
            )}
          </View>
          <View style={[styles.cell, { flex: COLUMNS.feedback }]}>
            {canLeaveFeedback(ride) ? (
              <RideActionLink label="Feedback" onPress={() => onAction('feedback', ride)} />
            ) : (
              <Text style={styles.cellEmpty}>{ride.feedbackLeft ? 'Sent' : '—'}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

function HeaderCell({ label, weight }: { label: string; weight: number }) {
  return (
    <View style={[styles.cell, { flex: weight }]}>
      <Text style={styles.headerLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    boxShadow: shadowValues.sm,
  },

  headerRow: { flexDirection: 'row', backgroundColor: colors.primary[700] },
  headerLabel: {
    color: colors.headerFg,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  row: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowAlt: { backgroundColor: colors.surfaceSelected },

  cell: {
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    gap: 2,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  cellText: { color: colors.textStrong, fontSize: 13, lineHeight: 18 },
  cellMuted: { color: colors.textMuted, fontSize: 12 },
  cellEmpty: { color: colors.textDisabled, fontSize: 13 },
});
