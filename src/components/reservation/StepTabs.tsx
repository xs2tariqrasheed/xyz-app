import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadowValues, space } from '@/theme';

import { RESERVATION_SECTIONS } from './sections';

/** One marker on the bar. */
export type StepTab = {
  /** Full heading shown above the markers for the active step. */
  title: string;
  /** Label beside the marker, where space is tight. */
  short: string;
};

export type StepTabsProps = {
  /** Defaults to the reservation sections. */
  steps?: readonly StepTab[];
  /** 0-based index of the section currently being filled in. */
  activeIndex: number;
  /** Jump back to an already-reached step. */
  onSelect?: (index: number) => void;
  /** Phones drop the titles and keep the numbered markers only. */
  compact?: boolean;
};

/**
 * Horizontal step navigation for the `/reserve-2` layout, where the rail moved
 * from the left column to the top of the page, and for the registration wizard.
 *
 * It scrolls horizontally rather than wrapping, so the markers keep their
 * order and their connectors on any width.
 */
export function StepTabs({
  steps = RESERVATION_SECTIONS,
  activeIndex,
  onSelect,
  compact = false,
}: StepTabsProps) {
  const total = steps.length;
  const percent = ((activeIndex + 1) / total) * 100;

  return (
    <View style={styles.bar}>
      <View style={styles.heading}>
        <Text style={styles.headingStep}>
          STEP {activeIndex + 1} OF {total}
        </Text>
        <Text style={styles.headingTitle} numberOfLines={1}>
          {steps[activeIndex].title}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {steps.map((section, index) => {
          const state = index === activeIndex ? 'active' : index < activeIndex ? 'done' : 'todo';
          const reachable = index < activeIndex;
          const last = index === total - 1;

          return (
            <View key={section.title} style={styles.item}>
              <Pressable
                accessibilityRole={reachable ? 'button' : undefined}
                accessibilityLabel={reachable ? `Go to ${section.title}` : undefined}
                accessibilityState={{ selected: state === 'active' }}
                disabled={!reachable || !onSelect}
                onPress={() => onSelect?.(index)}
                style={styles.tab}
              >
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

                {compact ? null : (
                  <Text
                    numberOfLines={1}
                    style={[styles.tabLabel, state === 'active' ? styles.tabLabelActive : null]}
                  >
                    {section.short}
                  </Text>
                )}
              </Pressable>

              {last ? null : (
                <View style={[styles.connector, state === 'done' ? styles.connectorDone : null]} />
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.track}>
        <View style={[styles.trackFill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: space.lg,
    gap: space.md,
    boxShadow: shadowValues.sm,
  },
  heading: { gap: 2 },
  headingStep: { color: colors.primary[500], fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  headingTitle: { color: colors.textTitle, fontSize: 18, fontWeight: '700' },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  item: { flexDirection: 'row', alignItems: 'center' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
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
  tabLabel: { color: colors.textBody, fontSize: 13, fontWeight: '600' },
  tabLabelActive: { color: colors.primary[600] },
  connector: {
    height: 2,
    width: 28,
    backgroundColor: colors.border,
    marginHorizontal: space.sm,
    borderRadius: radii.pill,
  },
  connectorDone: { backgroundColor: colors.successBorder },

  track: {
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
  },
  trackFill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.primary[500] },
});
