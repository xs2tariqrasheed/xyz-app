import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadowValues, space } from '@/theme';

import { RESERVATION_SECTIONS } from './sections';

export type StepRailProps = {
  /** 0-based index of the section currently being filled in. */
  activeIndex: number;
  /** Jump back to an already-reached step. */
  onSelect?: (index: number) => void;
};

/** Vertical checklist for tablet/desktop, where there is a column to spare. */
export function StepRail({ activeIndex, onSelect }: StepRailProps) {
  return (
    <View style={styles.rail}>
      <Text style={styles.railHeading}>Reservation steps</Text>

      {RESERVATION_SECTIONS.map((section, index) => {
        const state = index === activeIndex ? 'active' : index < activeIndex ? 'done' : 'todo';
        const last = index === RESERVATION_SECTIONS.length - 1;

        const reachable = index <= activeIndex && index !== activeIndex;

        return (
          <Pressable
            key={section.id}
            accessibilityRole={reachable ? 'button' : undefined}
            accessibilityLabel={reachable ? `Go to ${section.title}` : undefined}
            disabled={!reachable || !onSelect}
            onPress={() => onSelect?.(index)}
            style={styles.railRow}
          >
            <View style={styles.railMarkerColumn}>
              <View
                style={[
                  styles.marker,
                  state === 'active' ? styles.markerActive : null,
                  state === 'done' ? styles.markerDone : null,
                ]}
              >
                <Text
                  style={[
                    styles.markerLabel,
                    state === 'active' ? styles.markerLabelActive : null,
                    state === 'done' ? styles.markerLabelDone : null,
                  ]}
                >
                  {index + 1}
                </Text>
              </View>
              {last ? null : <View style={styles.connector} />}
            </View>

            <View style={styles.railText}>
              <Text style={[styles.railTitle, state === 'active' ? styles.railTitleActive : null]}>
                {section.title}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Compact progress header for phones: a bar plus horizontally scrolling chips. */
export function StepProgress({ activeIndex, onSelect }: StepRailProps) {
  const total = RESERVATION_SECTIONS.length;
  const active = RESERVATION_SECTIONS[activeIndex];
  const percent = ((activeIndex + 1) / total) * 100;

  return (
    <View style={styles.progress}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressStep}>
          STEP {activeIndex + 1} OF {total}
        </Text>
        <Text style={styles.progressTitle} numberOfLines={1}>
          {active.title}
        </Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.trackFill, { width: `${percent}%` }]} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {RESERVATION_SECTIONS.map((section, index) => {
          const isActive = index === activeIndex;
          const reachable = index < activeIndex;

          return (
            <Pressable
              key={section.id}
              accessibilityRole={reachable ? 'button' : undefined}
              accessibilityLabel={reachable ? `Go to ${section.title}` : undefined}
              disabled={!reachable || !onSelect}
              onPress={() => onSelect?.(index)}
              style={[styles.chip, isActive ? styles.chipActive : null]}
            >
              <Text style={[styles.chipIndex, isActive ? styles.chipIndexActive : null]}>
                {index + 1}
              </Text>
              <Text style={[styles.chipLabel, isActive ? styles.chipLabelActive : null]}>
                {section.short}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: 260,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: space.lg,
    boxShadow: shadowValues.sm,
  },
  railHeading: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: space.md,
  },
  railRow: { flexDirection: 'row', gap: space.md },
  railMarkerColumn: { alignItems: 'center' },
  marker: {
    width: 26,
    height: 26,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  markerDone: { backgroundColor: colors.successBg, borderColor: colors.successBorder },
  markerLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  markerLabelActive: { color: colors.textOnPrimary },
  markerLabelDone: { color: colors.success },
  connector: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 4, minHeight: 18 },
  railText: { flex: 1, paddingBottom: space.lg },
  railTitle: { color: colors.textBody, fontSize: 14, fontWeight: '600' },
  railTitleActive: { color: colors.textHeading },

  progress: { gap: space.sm + 2 },
  progressHeader: { gap: 2 },
  progressStep: { color: colors.primary[500], fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  progressTitle: { color: colors.textTitle, fontSize: 18, fontWeight: '700' },
  track: {
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
  },
  trackFill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.primary[500] },
  chipRow: { flexDirection: 'row', gap: space.sm, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingLeft: 5,
    paddingRight: space.md,
    paddingVertical: 4,
  },
  chipActive: { borderColor: colors.primary[300], backgroundColor: colors.surfaceSelected },
  chipIndex: {
    width: 18,
    height: 18,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSunken,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },
  chipIndexActive: { backgroundColor: colors.primary[600], color: colors.textOnPrimary },
  chipLabel: { color: colors.textBody, fontSize: 13, fontWeight: '600' },
  chipLabelActive: { color: colors.primary[600] },
});
