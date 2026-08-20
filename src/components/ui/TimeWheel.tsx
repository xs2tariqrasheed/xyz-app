import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadowValues, space } from '@/theme';
import {
  HOUR_OPTIONS,
  MERIDIEM_OPTIONS,
  MINUTE_OPTIONS,
  formatTime,
  pad2,
  type Meridiem,
  type TimeValue,
} from '@/utils/datetime';

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const COLUMN_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

export type TimeWheelProps = {
  value: TimeValue;
  onChange: (time: TimeValue) => void;
  /** `accent` matches the amber live-call treatment. */
  tone?: 'primary' | 'accent';
};

/**
 * Hour / minute / meridiem columns.
 *
 * Tap-to-select rather than a free-spinning wheel: momentum snapping behaves
 * differently on each platform, and tapping is unambiguous on all three.
 */
export function TimeWheel({ value, onChange, tone = 'primary' }: TimeWheelProps) {
  const accent = tone === 'accent' ? colors.accent : colors.primary[600];

  return (
    <View style={styles.root}>
      <View style={[styles.preview, tone === 'accent' ? styles.previewAccent : null]}>
        <Text style={[styles.previewValue, { color: accent }]}>{formatTime(value)}</Text>
        <Text style={styles.previewCaption}>Selected pickup time</Text>
      </View>

      <View style={styles.columns}>
        <WheelColumn
          label="Hour"
          options={HOUR_OPTIONS}
          selected={value.hour}
          format={pad2}
          accent={accent}
          onSelect={(hour) => onChange({ ...value, hour })}
        />
        <WheelColumn
          label="Minute"
          options={MINUTE_OPTIONS}
          selected={value.minute}
          format={pad2}
          accent={accent}
          onSelect={(minute) => onChange({ ...value, minute })}
        />
        <WheelColumn
          label="AM / PM"
          options={MERIDIEM_OPTIONS}
          selected={value.meridiem}
          format={(meridiem: Meridiem) => meridiem}
          accent={accent}
          onSelect={(meridiem) => onChange({ ...value, meridiem })}
        />
      </View>
    </View>
  );
}

type WheelColumnProps<T extends string | number> = {
  label: string;
  options: readonly T[];
  selected: T;
  format: (option: T) => string;
  accent: string;
  onSelect: (option: T) => void;
};

function WheelColumn<T extends string | number>({
  label,
  options,
  selected,
  format,
  accent,
  onSelect,
}: WheelColumnProps<T>) {
  const scrollRef = useRef<ScrollView>(null);
  // Captured once: the column scrolls to the incoming value on open, then the
  // user drives it. Re-scrolling on every tap would fight their finger.
  const [initialIndex] = useState(() => options.indexOf(selected));

  useEffect(() => {
    const centred = Math.max(0, (initialIndex - Math.floor(VISIBLE_ITEMS / 2)) * ITEM_HEIGHT);
    scrollRef.current?.scrollTo({ y: centred, animated: false });
  }, [initialIndex]);

  return (
    <View style={styles.column}>
      <Text style={styles.columnLabel}>{label}</Text>
      <View style={styles.columnBody}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          contentContainerStyle={styles.columnContent}
        >
          {options.map((option) => {
            const active = option === selected;
            return (
              <Pressable
                key={String(option)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => onSelect(option)}
                style={({ pressed }) => [
                  styles.option,
                  active ? { backgroundColor: accent, boxShadow: shadowValues.sm } : null,
                  pressed && !active ? styles.optionPressed : null,
                ]}
              >
                <Text style={[styles.optionLabel, active ? styles.optionLabelActive : null]}>
                  {format(option)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg },

  preview: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSelected,
    borderWidth: 1,
    borderColor: colors.primary[100],
    borderRadius: radii.lg,
    paddingVertical: space.md,
  },
  previewAccent: { backgroundColor: colors.accentSubtle, borderColor: colors.warningBorder },
  previewValue: { fontSize: 28, fontWeight: '700', letterSpacing: 0.5 },
  previewCaption: { color: colors.textMuted, fontSize: 12, marginTop: 2 },

  columns: { flexDirection: 'row', gap: space.sm },
  column: { flex: 1, gap: 6 },
  columnLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  columnBody: {
    height: COLUMN_HEIGHT,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
  },
  columnContent: { padding: 4, gap: 2 },
  option: {
    height: ITEM_HEIGHT - 6,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionPressed: { backgroundColor: colors.surface },
  optionLabel: { color: colors.textStrong, fontSize: 15, fontWeight: '600' },
  optionLabelActive: { color: colors.textOnPrimary },
});
