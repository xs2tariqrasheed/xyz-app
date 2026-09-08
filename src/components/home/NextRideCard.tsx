import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { RideRoute } from '@/components/rides/RideRoute';
import { RideStatusBadge } from '@/components/rides/RideStatusBadge';
import { Button } from '@/components/ui/Button';
import { PAYMENT_METHOD_LABELS, type Ride } from '@/services/rides';
import { breakpoints, colors, radii, shadowValues, space } from '@/theme';
import { formatClockTime, formatDayDistance, formatFullDate } from '@/utils/datetime';

import { SedanIllustration } from './SedanIllustration';

export type NextRideCardProps = {
  /** The ride in progress if there is one, otherwise the next booked pickup. */
  ride: Ride | null;
  now: Date;
  loading: boolean;
};

/**
 * The one ride the customer most likely opened the app for.
 *
 * A car already on the road outranks a future booking; with neither, the card
 * becomes the booking prompt rather than an empty slot.
 */
export function NextRideCard({ ride, now, loading }: NextRideCardProps) {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const roomy = width >= breakpoints.sm;

  if (loading) {
    return (
      <View style={[styles.card, styles.placeholder]}>
        <ActivityIndicator color={colors.primary[600]} />
        <Text style={styles.placeholderText}>Loading your next ride</Text>
      </View>
    );
  }

  if (!ride) {
    return (
      <View style={[styles.card, styles.empty]}>
        <SedanIllustration style={styles.emptyArt} />
        <Text style={styles.emptyTitle}>No rides booked</Text>
        <Text style={styles.emptyBody}>
          Book ahead for a set date and time, or have a car sent to you now.
        </Text>
        <Button label="Book a ride" size="lg" onPress={() => router.navigate('/reserve')} />
      </View>
    );
  }

  const live = ride.status === 'in-progress';

  return (
    <View style={styles.card}>
      <View style={styles.band}>
        <Text style={styles.eyebrow}>{live ? 'Ride in progress' : 'Next ride'}</Text>
        <RideStatusBadge status={ride.status} />
      </View>

      <View style={styles.body}>
        <View style={[styles.when, roomy ? styles.whenWide : null]}>
          <Text style={styles.distance}>{formatDayDistance(ride.pickupAt, now)}</Text>
          <Text style={styles.stamp}>
            {formatFullDate(ride.pickupAt)} · {formatClockTime(ride.pickupAt)}
          </Text>
        </View>

        <RideRoute pickup={ride.pickupLocation} destination={ride.destination} />

        <View style={styles.meta}>
          <Meta label="Ride no." value={ride.id} />
          <Meta label="Payment" value={PAYMENT_METHOD_LABELS[ride.paymentMethod]} />
          {ride.voucherNo ? <Meta label="Voucher" value={ride.voucherNo} /> : null}
        </View>

        <View style={[styles.actions, roomy ? styles.actionsWide : null]}>
          <Button label="View details" onPress={() => router.navigate('/reservation-info')} />
          <Button label="All rides" variant="outline" onPress={() => router.navigate('/rides')} />
        </View>
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
    borderColor: colors.primary[200],
    borderRadius: radii.xl,
    overflow: 'hidden',
    boxShadow: shadowValues.md,
  },

  band: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    backgroundColor: colors.surfaceSelected,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
    paddingHorizontal: space.lg,
    paddingVertical: space.md - 2,
  },
  eyebrow: {
    color: colors.primary[600],
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  body: { padding: space.lg, gap: space.lg },

  when: { gap: 2 },
  whenWide: { flexDirection: 'row', alignItems: 'baseline', gap: space.md },
  distance: { color: colors.textTitle, fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  stamp: { color: colors.textBody, fontSize: 14 },

  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space.md,
  },
  metaItem: { gap: 2, minWidth: 96 },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  metaValue: { color: colors.textStrong, fontSize: 14 },

  actions: { gap: space.md },
  actionsWide: { flexDirection: 'row', alignItems: 'center' },

  placeholder: { alignItems: 'center', gap: space.md, padding: space.xxl },
  placeholderText: { color: colors.textMuted, fontSize: 14 },

  empty: { alignItems: 'center', gap: space.md, padding: space.xl },
  emptyArt: { width: '100%', maxWidth: 320 },
  emptyTitle: { color: colors.textTitle, fontSize: 17, fontWeight: '700' },
  emptyBody: {
    color: colors.textBody,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 380,
  },
});
