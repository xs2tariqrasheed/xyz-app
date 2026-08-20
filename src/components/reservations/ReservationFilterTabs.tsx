import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  RESERVATION_FILTERS,
  type ReservationFilterId,
} from '@/data/reservations';
import { colors, radii, space } from '@/theme';

export type ReservationFilterTabsProps = {
  value: ReservationFilterId;
  onChange: (next: ReservationFilterId) => void;
  /** How many reservations sit behind each tab. */
  counts: Record<ReservationFilterId, number>;
};

/**
 * Status tabs. Scrolls sideways on a phone rather than wrapping, so the row
 * keeps its shape at every width.
 */
export function ReservationFilterTabs({ value, onChange, counts }: ReservationFilterTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {RESERVATION_FILTERS.map((filter) => {
        const selected = filter.id === value;

        return (
          <Pressable
            key={filter.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`${filter.label}, ${counts[filter.id]} reservations`}
            onPress={() => onChange(filter.id)}
            style={({ pressed }) => [
              styles.tab,
              selected ? styles.tabSelected : null,
              pressed && !selected ? styles.tabPressed : null,
            ]}
          >
            <Text style={[styles.label, selected ? styles.labelSelected : null]}>
              {filter.label}
            </Text>
            <View style={[styles.count, selected ? styles.countSelected : null]}>
              <Text style={[styles.countLabel, selected ? styles.countLabelSelected : null]}>
                {counts[filter.id]}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 2 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm - 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.sm,
  },
  tabSelected: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  tabPressed: { backgroundColor: colors.surfaceSunken },
  label: { color: colors.textBody, fontSize: 13, fontWeight: '600' },
  labelSelected: { color: colors.textOnPrimary },
  count: {
    minWidth: 20,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
  },
  countSelected: { backgroundColor: colors.primary[500] },
  countLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  countLabelSelected: { color: colors.textOnPrimary },
});
