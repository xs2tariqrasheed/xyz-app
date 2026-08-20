import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Reservation } from '@/data/reservations';
import { colors, radii, shadowValues, space } from '@/theme';
import { formatClockTime, formatDayDistance, formatShortDate } from '@/utils/datetime';

import { ReservationActions, type ReservationHandlers } from './ReservationActions';
import { ReservationStatusBadge } from './ReservationStatusBadge';
import { Waypoint } from './Waypoint';

export type ReservationTableProps = {
  reservations: readonly Reservation[];
  handlers: ReservationHandlers;
  today: Date;
};

const HEADINGS = [
  { key: 'ride', label: 'Ride No.' },
  { key: 'passenger', label: 'Passenger' },
  { key: 'pickup', label: 'Pickup' },
  { key: 'from', label: 'Pickup Location' },
  { key: 'to', label: 'Destination' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions' },
] as const;

/**
 * The wide-screen view of the same list the cards show.
 *
 * Columns are flex-weighted rather than fixed, so the table fills whatever
 * width the page column has instead of forcing a horizontal scroll.
 */
export function ReservationTable({ reservations, handlers, today }: ReservationTableProps) {
  return (
    <View style={styles.table}>
      <View style={styles.headRow} accessibilityRole="header">
        {HEADINGS.map((heading) => (
          <Text key={heading.key} style={[styles.headLabel, columns[heading.key]]}>
            {heading.label}
          </Text>
        ))}
      </View>

      {reservations.map((reservation, index) => (
        <View
          key={reservation.id}
          style={[styles.row, index === reservations.length - 1 ? styles.rowLast : null]}
        >
          <View style={columns.ride}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ride ${reservation.id}`}
              onPress={() => handlers.onUpdate(reservation)}
              style={({ pressed }) => (pressed ? styles.idPressed : null)}
            >
              <Text style={styles.id}>{reservation.id}</Text>
            </Pressable>
          </View>

          <Text style={[styles.cell, columns.passenger]} numberOfLines={2}>
            {reservation.passengerName}
          </Text>

          <View style={columns.pickup}>
            <Text style={styles.cellStrong} numberOfLines={1}>
              {formatShortDate(reservation.pickupAt)}
            </Text>
            <Text style={styles.cellMuted} numberOfLines={1}>
              {formatClockTime(reservation.pickupAt)}
            </Text>
            <Text style={styles.cellMuted} numberOfLines={1}>
              {formatDayDistance(reservation.pickupAt, today)}
            </Text>
          </View>

          <Waypoint
            marker="A"
            color={colors.success}
            address={reservation.pickupLocation}
            style={columns.from}
          />
          <Waypoint
            marker="B"
            color={colors.danger}
            address={reservation.destination}
            style={columns.to}
          />

          <View style={[styles.statusCell, columns.status]}>
            <ReservationStatusBadge status={reservation.status} />
            {reservation.cancellationReason ? (
              <Text style={styles.reason} numberOfLines={3}>
                {reservation.cancellationReason}
              </Text>
            ) : null}
          </View>

          <ReservationActions
            reservation={reservation}
            handlers={handlers}
            style={columns.actions}
          />
        </View>
      ))}
    </View>
  );
}

/** One weight per column, shared by the head row and every body row. */
const columns = StyleSheet.create({
  ride: { flex: 1 },
  passenger: { flex: 0.95 },
  pickup: { flex: 0.95 },
  from: { flex: 1.5 },
  to: { flex: 1.45 },
  status: { flex: 0.95 },
  // Widest weight: three actions have to sit on one line.
  actions: { flex: 1.7 },
});

const styles = StyleSheet.create({
  table: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: 'hidden',
    boxShadow: shadowValues.sm,
  },

  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surfaceSelected,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  headLabel: {
    color: colors.primary[700],
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  rowLast: { borderBottomWidth: 0 },

  id: { color: colors.textLink, fontSize: 14, fontWeight: '700' },
  idPressed: { opacity: 0.6 },
  cell: { color: colors.textStrong, fontSize: 13, lineHeight: 18 },
  cellStrong: { color: colors.textStrong, fontSize: 13, fontWeight: '600' },
  cellMuted: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  statusCell: { alignItems: 'flex-start', gap: space.xs },
  reason: { color: colors.textMuted, fontSize: 11, lineHeight: 15 },
});
