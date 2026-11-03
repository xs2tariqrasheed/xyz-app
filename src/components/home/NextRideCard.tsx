import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { RideRoute } from '@/components/rides/RideRoute';
import { RideStatusBadge } from '@/components/rides/RideStatusBadge';
import { Button } from '@/components/ui/Button';
import { HOME_MESSAGES } from '@/constants/messages';
import { paymentLabel, type Ride } from '@/services/rides';
import { breakpoints, colors, radii, shadowValues, space } from '@/theme';
import { formatClockTime, formatDayDistance, formatFullDate } from '@/utils/datetime';

import { SedanIllustration } from './SedanIllustration';

export type NextRideCardProps = {
  /** The ride in progress if there is one, otherwise the next booked pickup. */
  ride: Ride | null;
  now: Date;
  loading: boolean;
  /** Starts a new booking from the empty state. */
  onBook: () => void;
};

/**
 * The one ride the customer most likely opened the app for.
 *
 * A car already on the road outranks a future booking; with neither, the card
 * becomes the booking prompt rather than an empty slot.
 */
export function NextRideCard({ ride, now, loading, onBook }: NextRideCardProps) {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const roomy = width >= breakpoints.sm;

  if (loading) {
    return (
      <View style={[styles.card, styles.placeholder]}>
        <ActivityIndicator color={colors.primary[600]} />
        <Text style={styles.placeholderText}>{HOME_MESSAGES.NEXT_LOADING}</Text>
      </View>
    );
  }

  if (!ride) {
    return (
      <View style={[styles.card, styles.empty]}>
        <SedanIllustration style={styles.emptyArt} />
        <Text style={styles.emptyTitle}>{HOME_MESSAGES.NEXT_EMPTY_TITLE}</Text>
        <Text style={styles.emptyBody}>{HOME_MESSAGES.NEXT_EMPTY_BODY}</Text>
        <Button label={HOME_MESSAGES.BOOK_RIDE} size="lg" onPress={onBook} />
      </View>
    );
  }

  const live = ride.status === 'in-progress';

  return (
    <View style={styles.card}>
      <View style={styles.band}>
        <Text style={styles.eyebrow}>{live ? HOME_MESSAGES.NEXT_LIVE : HOME_MESSAGES.NEXT_UPCOMING}</Text>
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
          <Meta label={HOME_MESSAGES.RIDE_NO} value={ride.id} />
          <Meta label={HOME_MESSAGES.PAYMENT} value={paymentLabel(ride)} />
        </View>

        <View style={[styles.actions, roomy ? styles.actionsWide : null]}>
          <Button
            label={HOME_MESSAGES.VIEW_DETAILS}
            onPress={() => router.navigate({ pathname: '/reservation-info', params: { rideno: ride.id } })}
          />
          <Button label={HOME_MESSAGES.ALL_RIDES} variant="outline" onPress={() => router.navigate('/rides')} />
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
