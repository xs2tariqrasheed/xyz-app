import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { SearchGlyph } from '@/components/ui/Glyph';
import type { Ride } from '@/services/rides';
import { breakpoints, colors, radii, shadowValues, space } from '@/theme';
import { formatSlashDate } from '@/utils/datetime';

import { RideCard } from './RideCard';
import type { RideActionHandler } from './RideActionLink';
import { RideResultsTable } from './RideResultsTable';

export type RideResultsProps = {
  rides: readonly Ride[];
  /** The range the listed rides were fetched for — not the live form values. Omit for an undated list. */
  range?: { from: Date; to: Date };
  /** Heading; "Ride history" by default. */
  title?: string;
  /** Shown when the list is empty after a load. */
  emptyTitle?: string;
  /** Title when the load failed. */
  failedTitle?: string;
  /** Offered beside a failed load. */
  onRetry?: () => void;
  now: Date;
  loading: boolean;
  /** False until the first search has run. */
  searched: boolean;
  /** The last search errored — distinct from it returning nothing. */
  failed?: boolean;
  onAction: RideActionHandler;
};

/**
 * Result set with its own header. Tabular once there is room for ten columns,
 * a stack of cards below that — same data either way.
 */
export function RideResults({
  rides,
  range,
  title = 'Ride history',
  emptyTitle,
  failedTitle,
  onRetry,
  now,
  loading,
  searched,
  failed,
  onAction,
}: RideResultsProps) {
  const { width } = useWindowDimensions();
  const tabular = width >= breakpoints.lg;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.count}>
            {loading
              ? 'Searching…'
              : `${rides.length} ${rides.length === 1 ? 'ride' : 'rides'}${range ? ', newest first' : ''}`}
          </Text>
        </View>
        {range ? (
          <Text style={styles.range}>
            {formatSlashDate(range.from)} – {formatSlashDate(range.to)}
          </Text>
        ) : null}
      </View>

      {loading ? (
        <Placeholder>
          <ActivityIndicator color={colors.primary[600]} />
          <Text style={styles.placeholderTitle}>Looking up your rides</Text>
        </Placeholder>
      ) : failed ? (
        <Placeholder>
          <SearchGlyph color={colors.danger} size={26} />
          <Text style={styles.placeholderTitle}>{failedTitle ?? 'We could not load your rides'}</Text>
          {onRetry ? (
            <Button label="Try again" variant="outline" onPress={onRetry} />
          ) : (
            <Text style={styles.placeholderBody}>Tap Search to try again.</Text>
          )}
        </Placeholder>
      ) : rides.length === 0 ? (
        <Placeholder>
          <SearchGlyph color={colors.textMuted} size={26} />
          <Text style={styles.placeholderTitle}>
            {emptyTitle ?? (searched ? 'No rides in this range' : 'No search run yet')}
          </Text>
        </Placeholder>
      ) : tabular ? (
        <RideResultsTable rides={rides} now={now} onAction={onAction} />
      ) : (
        <View style={styles.cards}>
          {rides.map((ride) => (
            <RideCard key={ride.id} ride={ride} now={now} onAction={onAction} />
          ))}
        </View>
      )}
    </View>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return <View style={styles.placeholder}>{children}</View>;
}

const styles = StyleSheet.create({
  root: { gap: space.md },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    flexWrap: 'wrap',
  },
  headerText: { flex: 1, gap: 2, minWidth: 180 },
  title: { color: colors.textHeading, fontSize: 17, fontWeight: '700' },
  count: { color: colors.textMuted, fontSize: 13 },
  range: {
    color: colors.primary[600],
    fontSize: 13,
    fontWeight: '700',
    backgroundColor: colors.surfaceSelected,
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: radii.pill,
    paddingHorizontal: space.md,
    paddingVertical: 5,
  },

  cards: { gap: space.md },

  placeholder: {
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    paddingHorizontal: space.lg,
    paddingVertical: space.xxl,
    boxShadow: shadowValues.sm,
  },
  placeholderTitle: { color: colors.textHeading, fontSize: 15, fontWeight: '700' },
  placeholderBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 320,
  },
});
