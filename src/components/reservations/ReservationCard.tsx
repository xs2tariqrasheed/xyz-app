import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CalendarGlyph, ClockGlyph } from '@/components/ui/Glyph';
import type { Reservation } from '@/data/reservations';
import { colors, radii, shadowValues, space } from '@/theme';
import { formatClockTime, formatDayDistance, formatFullDate } from '@/utils/datetime';

import { ReservationActions, type ReservationHandlers } from './ReservationActions';
import { ReservationStatusBadge } from './ReservationStatusBadge';
import { Waypoint } from './Waypoint';

export type ReservationCardProps = {
  reservation: Reservation;
  handlers: ReservationHandlers;
  /** Anchor for "Today" / "In 5 days" captions. */
  today: Date;
};

/**
 * One reservation, phone-sized.
 *
 * Same content as a table row, stacked: the row's seven columns become a
 * header, a pickup line, the two waypoints and the action row.
 */
export function ReservationCard({ reservation, handlers, today }: ReservationCardProps) {
  const past = reservation.status === 'completed' || reservation.status === 'cancelled';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ride ${reservation.id}`}
          onPress={() => handlers.onUpdate(reservation)}
          style={({ pressed }) => (pressed ? styles.idPressed : null)}
        >
          <Text style={styles.id}>{reservation.id}</Text>
        </Pressable>
        <ReservationStatusBadge status={reservation.status} />
      </View>

      <Text style={styles.passenger} numberOfLines={1}>
        {reservation.passengerName}
      </Text>

      {reservation.cancellationReason ? (
        <Text style={styles.reason} numberOfLines={2}>
          Cancelled: {reservation.cancellationReason}
        </Text>
      ) : null}

      <View style={styles.divider} />

      <View style={styles.when}>
        <CalendarGlyph color={colors.primary[600]} size={16} />
        <Text style={styles.whenDate}>{formatFullDate(reservation.pickupAt)}</Text>
        <ClockGlyph color={colors.primary[600]} size={14} />
        <Text style={styles.whenTime}>{formatClockTime(reservation.pickupAt)}</Text>
      </View>
      <Text style={[styles.distance, past ? styles.distancePast : null]}>
        {formatDayDistance(reservation.pickupAt, today)}
      </Text>

      <View style={styles.route}>
        <Waypoint
          marker="A"
          color={colors.success}
          label="Pickup"
          address={reservation.pickupLocation}
        />
        <View style={styles.routeRule} />
        <Waypoint
          marker="B"
          color={colors.danger}
          label="Destination"
          address={reservation.destination}
        />
      </View>

      <View style={styles.divider} />

      <ReservationActions reservation={reservation} handlers={handlers} style={styles.actions} />
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
    gap: space.sm,
    boxShadow: shadowValues.sm,
  },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  id: { color: colors.textLink, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  idPressed: { opacity: 0.6 },
  passenger: { color: colors.textBody, fontSize: 14 },
  reason: { color: colors.textMuted, fontSize: 12, lineHeight: 16 },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: space.xs },

  when: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  whenDate: { color: colors.textStrong, fontSize: 14, fontWeight: '600' },
  whenTime: { color: colors.textStrong, fontSize: 14, fontWeight: '600' },
  distance: { color: colors.accent, fontSize: 12, fontWeight: '600', marginLeft: 24 },
  distancePast: { color: colors.textMuted },

  route: { gap: space.xs, marginTop: space.sm },
  // Ties A to B, aligned with the centre of the 18pt markers.
  routeRule: { width: 1, height: 10, marginLeft: 8.5, backgroundColor: colors.borderStrong },

  actions: { marginLeft: -(space.xs + 2) },
});
