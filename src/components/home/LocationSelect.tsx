import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Field } from '@/components/ui/Field';
import { PinGlyph, TickGlyph } from '@/components/ui/Glyph';
import type { AddressSuggestion } from '@/services/places';
import { colors, radii, space } from '@/theme';

export type LocationSelectProps = {
  label: string;
  options: readonly AddressSuggestion[];
  value: AddressSuggestion | null;
  onChange: (option: AddressSuggestion) => void;
  /** Pin colour, matching the marker this end of the ride uses on the map. */
  markerColor?: string;
  hint?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Saved addresses as a compact scroll box — the express flow's stand-in for
 * the full autocomplete field, so a frequent rider picks in one tap.
 *
 * `nestedScrollEnabled` lets the box scroll inside the page ScrollView on
 * Android; web and iOS handle the nesting on their own.
 */
export function LocationSelect({
  label,
  options,
  value,
  onChange,
  markerColor = colors.primary[600],
  hint,
  style,
}: LocationSelectProps) {
  return (
    <Field label={label} hint={hint} style={style}>
      <View style={styles.box}>
        <ScrollView
          nestedScrollEnabled
          style={styles.list}
          contentContainerStyle={styles.listContent}
          accessibilityRole="radiogroup"
          accessibilityLabel={label}
        >
          {options.map((option) => {
            const selected = option.placeId === value?.placeId;

            return (
              <Pressable
                key={option.placeId}
                accessibilityRole="radio"
                accessibilityState={{ selected, checked: selected }}
                // react-native-web no longer derives aria-checked from accessibilityState.
                aria-checked={selected}
                accessibilityLabel={`${option.primary}, ${option.secondary}`}
                onPress={() => onChange(option)}
                style={({ pressed }) => [
                  styles.row,
                  selected ? styles.rowSelected : null,
                  pressed && !selected ? styles.rowPressed : null,
                ]}
              >
                <PinGlyph color={selected ? markerColor : colors.textDisabled} size={16} />

                <View style={styles.rowText}>
                  <Text style={[styles.primary, selected ? styles.primarySelected : null]} numberOfLines={1}>
                    {option.primary}
                  </Text>
                  <Text style={styles.secondary} numberOfLines={1}>
                    {option.secondary}
                  </Text>
                </View>

                {selected ? <TickGlyph size={12} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Field>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  // Caps the box at roughly three rows, so both ends of the ride stay on
  // screen together without the panel growing with the address book.
  list: { maxHeight: 168 },
  listContent: { padding: space.xs },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderRadius: radii.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space.sm + 1,
  },
  rowPressed: { backgroundColor: colors.surfaceSunken },
  rowSelected: { backgroundColor: colors.surfaceSelected },

  rowText: { flex: 1 },
  primary: { color: colors.textStrong, fontSize: 14, fontWeight: '600' },
  primarySelected: { color: colors.primary[600] },
  secondary: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
});
