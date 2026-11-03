import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadowValues, space } from '@/theme';
import {
  addDays,
  addMonths,
  buildMonthGrid,
  formatMonthTitle,
  isSameDay,
  isSameMonth,
  startOfDay,
  WEEKDAYS_MIN,
} from '@/utils/datetime';

import { ChevronGlyph } from './Glyph';

/** A chip that jumps the selection `offset` days from today. Negative reaches back. */
export type QuickPick = { label: string; offset: number };

export type CalendarPickerProps = {
  value: Date;
  onChange: (date: Date) => void;
  /** "Now", used to mark today in the grid. */
  today: Date;
  /** Earliest selectable day. Defaults to `today` — bookings never go backwards. */
  minDate?: Date;
  /** Latest selectable day. Unbounded when omitted. */
  maxDate?: Date;
  quickPicks?: readonly QuickPick[];
};

/** Booking default: forwards only. */
export const BOOKING_QUICK_PICKS: readonly QuickPick[] = [
  { label: 'Today', offset: 0 },
  { label: 'Tomorrow', offset: 1 },
  { label: 'In a week', offset: 7 },
];

/** Searching history: the same shortcuts, pointed the other way. */
export const HISTORY_QUICK_PICKS: readonly QuickPick[] = [
  { label: 'Today', offset: 0 },
  { label: 'A week ago', offset: -7 },
  { label: 'A month ago', offset: -30 },
];

/** Month grid with quick-pick shortcuts. Days outside the floor and ceiling are inert. */
export function CalendarPicker({
  value,
  onChange,
  today,
  minDate,
  maxDate,
  quickPicks = BOOKING_QUICK_PICKS,
}: CalendarPickerProps) {
  const [month, setMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));

  const floor = minDate ?? today;
  const days = buildMonthGrid(month, today, floor, maxDate);
  const atFloorMonth = isSameMonth(month, floor);
  const atCeilingMonth = maxDate ? isSameMonth(month, maxDate) : false;

  return (
    <View style={styles.root}>
      <View style={styles.quickRow}>
        {quickPicks.map((pick) => {
          const date = addDays(startOfDay(today), pick.offset);
          const active = isSameDay(date, value);
          return (
            <Pressable
              key={pick.label}
              accessibilityRole="button"
              onPress={() => {
                setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                onChange(date);
              }}
              style={({ pressed }) => [
                styles.quickChip,
                active ? styles.quickChipActive : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={[styles.quickLabel, active ? styles.quickLabelActive : null]}>
                {pick.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.monthRow}>
        <NavButton
          direction="left"
          label="Previous month"
          disabled={atFloorMonth}
          onPress={() => setMonth(addMonths(month, -1))}
        />
        <Text style={styles.monthTitle}>{formatMonthTitle(month)}</Text>
        <NavButton
          direction="right"
          label="Next month"
          disabled={atCeilingMonth}
          onPress={() => setMonth(addMonths(month, 1))}
        />
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS_MIN.map((day, index) => (
          <View key={index} style={styles.cell}>
            <Text style={styles.weekLabel}>{day}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day) => {
          const selected = isSameDay(day.date, value);
          const disabled = day.outOfRange;

          return (
            <Pressable
              key={day.key}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => onChange(day.date)}
              style={styles.cell}
            >
              {({ pressed }) => (
                <View
                  style={[
                    styles.day,
                    selected ? styles.daySelected : null,
                    !selected && day.isToday ? styles.dayToday : null,
                    pressed && !selected ? styles.pressed : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayLabel,
                      !day.inMonth ? styles.dayLabelOutside : null,
                      disabled ? styles.dayLabelDisabled : null,
                      !selected && day.isToday ? styles.dayLabelToday : null,
                      selected ? styles.dayLabelSelected : null,
                    ]}
                  >
                    {day.label}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function NavButton({
  direction,
  label,
  disabled,
  onPress,
}: {
  direction: 'left' | 'right';
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.nav, pressed ? styles.pressed : null]}
    >
      <ChevronGlyph
        direction={direction}
        color={disabled ? colors.textDisabled : colors.textStrong}
        size={8}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md },
  pressed: { opacity: 0.7 },

  quickRow: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  quickChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  quickChipActive: { backgroundColor: colors.surfaceSelected, borderColor: colors.primary[300] },
  quickLabel: { color: colors.textBody, fontSize: 13, fontWeight: '600' },
  quickLabelActive: { color: colors.primary[600] },

  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthTitle: { color: colors.textHeading, fontSize: 15, fontWeight: '700' },
  nav: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSunken,
  },

  weekRow: { flexDirection: 'row' },
  weekLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    maxHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  day: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 42,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: { backgroundColor: colors.primary[600], boxShadow: shadowValues.sm },
  dayToday: { borderWidth: 1, borderColor: colors.primary[300], backgroundColor: colors.surfaceSelected },
  dayLabel: { color: colors.textStrong, fontSize: 14, fontWeight: '500' },
  dayLabelOutside: { color: colors.textDisabled },
  dayLabelDisabled: { color: colors.textDisabled },
  dayLabelToday: { color: colors.primary[600], fontWeight: '700' },
  dayLabelSelected: { color: colors.textOnPrimary, fontWeight: '700' },
});
