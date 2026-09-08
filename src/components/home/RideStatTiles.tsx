import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { CarGlyph } from '@/components/ui/CarGlyph';
import { CalendarGlyph, CheckGlyph, ClockGlyph } from '@/components/ui/Glyph';
import type { RideOverview } from '@/services/rides';
import { breakpoints, colors, radii, shadowValues, space } from '@/theme';
import { formatDayDistance } from '@/utils/datetime';

export type RideStatTilesProps = {
  overview: RideOverview | null;
  now: Date;
  loading: boolean;
};

type Tile = {
  key: string;
  label: string;
  value: number;
  caption: string;
  tone: 'primary' | 'accent' | 'success' | 'neutral';
  icon: React.ReactNode;
};

const TONES = {
  primary: { bg: colors.surfaceSelected, fg: colors.primary[600] },
  accent: { bg: colors.accentSubtle, fg: colors.accent },
  success: { bg: colors.successBg, fg: colors.success },
  neutral: { bg: colors.surfaceSunken, fg: colors.textStrong },
} as const;

/**
 * The four headline numbers: what is booked, what is moving, and what the
 * account has run through in total.
 *
 * Every tile opens the ride list, so the numbers are a way in rather than
 * decoration.
 */
export function RideStatTiles({ overview, now, loading }: RideStatTilesProps) {
  const { width } = useWindowDimensions();
  const router = useRouter();
  // Four across only once each tile still fits its number and caption.
  const fourUp = width >= breakpoints.md;

  const counts = overview?.counts;
  const nextRide = overview?.upcoming[0];

  const tiles: readonly Tile[] = [
    {
      key: 'upcoming',
      label: 'Upcoming',
      value: counts?.upcoming ?? 0,
      caption: nextRide ? `Next ${formatDayDistance(nextRide.pickupAt, now).toLowerCase()}` : 'Nothing booked',
      tone: 'primary',
      icon: <CalendarGlyph color={TONES.primary.fg} size={17} />,
    },
    {
      key: 'in-progress',
      label: 'In progress',
      value: counts?.inProgress ?? 0,
      caption: counts?.inProgress ? 'Car on the road' : 'No car out now',
      tone: 'accent',
      icon: <CarGlyph variant="sedan" color={TONES.accent.fg} size={22} />,
    },
    {
      key: 'completed',
      label: 'Completed',
      value: counts?.completed ?? 0,
      caption: 'Rides finished',
      tone: 'success',
      icon: <CheckGlyph color={TONES.success.fg} size={14} />,
    },
    {
      key: 'total',
      label: 'Total rides',
      value: counts?.total ?? 0,
      caption: 'On this account',
      tone: 'neutral',
      icon: <ClockGlyph color={TONES.neutral.fg} size={17} />,
    },
  ];

  return (
    <View style={styles.grid}>
      {tiles.map((tile) => {
        const palette = TONES[tile.tone];

        return (
          <Pressable
            key={tile.key}
            accessibilityRole="link"
            accessibilityLabel={`${tile.label}: ${loading ? 'loading' : tile.value}`}
            onPress={() => router.navigate('/rides')}
            // Two per row on a phone, one row of four from tablet up.
            style={({ pressed }) => [
              styles.tile,
              fourUp ? styles.tileWide : styles.tileNarrow,
              pressed ? styles.pressed : null,
            ]}
          >
            <View style={styles.tileTop}>
              <View style={[styles.iconBox, { backgroundColor: palette.bg }]}>{tile.icon}</View>
              <Text style={styles.label}>{tile.label}</Text>
            </View>

            <Text style={[styles.value, { color: palette.fg }]}>
              {loading ? '—' : tile.value}
            </Text>
            <Text numberOfLines={1} style={styles.caption}>
              {loading ? 'Loading…' : tile.caption}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },

  tile: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 2,
    gap: space.xs,
    boxShadow: shadowValues.sm,
  },
  // `flexBasis: 0` splits the row evenly; a percentage basis wraps to two rows.
  tileWide: { flexGrow: 1, flexBasis: 0 },
  tileNarrow: { flexGrow: 1, flexBasis: '44%' },
  pressed: { opacity: 0.75 },

  tileTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  value: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  caption: { color: colors.textMuted, fontSize: 12 },
});
