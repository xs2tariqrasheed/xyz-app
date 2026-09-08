import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { RideStatusBadge } from '@/components/rides/RideStatusBadge';
import type { Ride } from '@/services/rides';
import { colors, radii, shadowValues, space } from '@/theme';
import { formatClockTime, MONTHS_SHORT } from '@/utils/datetime';

export type RideListPanelProps = {
  title: string;
  rides: readonly Ride[];
  /** Shown in place of the rows when there is nothing to list. */
  emptyText: string;
  loading: boolean;
  /** Total behind the shown rows, so the link can say how many are left. */
  total?: number;
};

/**
 * A short, scannable run of rides — the dashboard's read-only digest of what
 * the Rides screen holds in full.
 */
export function RideListPanel({ title, rides, emptyText, loading, total }: RideListPanelProps) {
  const hidden = Math.max((total ?? rides.length) - rides.length, 0);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Link href="/rides" style={styles.link}>
          {hidden > 0 ? `View all ${total}` : 'View all'} →
        </Link>
      </View>

      {loading ? (
        <Text style={styles.note}>Loading…</Text>
      ) : rides.length === 0 ? (
        <Text style={styles.note}>{emptyText}</Text>
      ) : (
        rides.map((ride, index) => (
          <View key={ride.id} style={[styles.row, index > 0 ? styles.rowDivided : null]}>
            <View style={styles.date}>
              <Text style={styles.month}>{MONTHS_SHORT[ride.pickupAt.getMonth()].toUpperCase()}</Text>
              <Text style={styles.day}>{ride.pickupAt.getDate()}</Text>
            </View>

            <View style={styles.rowText}>
              <Text numberOfLines={1} style={styles.destination}>
                {ride.destination}
              </Text>
              <Text numberOfLines={1} style={styles.detail}>
                {formatClockTime(ride.pickupAt)} · from {ride.pickupLocation}
              </Text>
            </View>

            <RideStatusBadge status={ride.status} />
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    boxShadow: shadowValues.sm,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingVertical: space.md,
  },
  title: { color: colors.textTitle, fontSize: 15, fontWeight: '700' },
  link: { color: colors.textLink, fontSize: 13, fontWeight: '600' },

  note: { color: colors.textMuted, fontSize: 13, paddingBottom: space.md },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
  },
  rowDivided: { borderTopWidth: 1, borderTopColor: colors.border },

  date: {
    width: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSunken,
    paddingVertical: space.xs + 1,
    alignItems: 'center',
  },
  month: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  day: { color: colors.textStrong, fontSize: 16, fontWeight: '700', lineHeight: 20 },

  rowText: { flex: 1, gap: 2 },
  destination: { color: colors.textStrong, fontSize: 14, fontWeight: '600' },
  detail: { color: colors.textMuted, fontSize: 12 },
});
