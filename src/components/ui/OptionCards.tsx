import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, focusedFieldStyle, radii, shadowValues, space } from '@/theme';

import { Field } from './Field';

export type OptionCard<T extends string> = {
  value: T;
  label: string;
  /** Second line, e.g. a capacity. */
  caption?: string;
  /** Given the selected state so the artwork can pick up the brand colour. */
  renderIcon?: (selected: boolean) => React.ReactNode;
};

export type OptionCardsProps<T extends string> = {
  label: string;
  options: readonly OptionCard<T>[];
  value: T;
  onChange: (next: T) => void;
  /** Lines a label may run to before it is ellipsised. One-word labels want 1. */
  labelLines?: number;
  required?: boolean;
  hint?: string;
  error?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * A radio group drawn as icon tiles.
 *
 * Tiles carry a `flexBasis`, not a percentage width, so the row reflows on its
 * own: two up on a phone, four across once the form column has the room.
 */
export function OptionCards<T extends string>({
  label,
  options,
  value,
  onChange,
  labelLines = 1,
  required,
  hint,
  error,
  style,
}: OptionCardsProps<T>) {
  return (
    <Field label={label} required={required} hint={hint} error={error} style={style}>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.grid}>
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected, checked: selected }}
              // react-native-web no longer derives aria-checked from accessibilityState.
              aria-checked={selected}
              accessibilityLabel={
                option.caption ? `${option.label}, ${option.caption}` : option.label
              }
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.card,
                selected ? styles.cardSelected : null,
                pressed && !selected ? styles.cardPressed : null,
              ]}
            >
              <View style={[styles.radio, selected ? styles.radioSelected : null]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>

              {option.renderIcon ? (
                <View style={styles.icon}>{option.renderIcon(selected)}</View>
              ) : null}

              <Text
                style={[styles.label, selected ? styles.labelSelected : null]}
                numberOfLines={labelLines}
              >
                {option.label}
              </Text>
              {option.caption ? (
                <Text style={styles.caption} numberOfLines={2}>
                  {option.caption}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Field>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  card: {
    flexGrow: 1,
    flexBasis: 132,
    minWidth: 132,
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: space.md,
    paddingTop: space.md,
    paddingBottom: space.md,
    boxShadow: shadowValues.sm,
  },
  // Ringed rather than thickened, so selecting a tile never nudges the grid.
  cardSelected: { backgroundColor: colors.surfaceSelected, ...focusedFieldStyle },
  cardPressed: { backgroundColor: colors.surfaceSunken },

  radio: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.primary[600] },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary[600] },

  icon: { height: 34, justifyContent: 'center', marginTop: space.sm - 2, marginBottom: space.sm - 2 },
  label: { color: colors.textStrong, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  labelSelected: { color: colors.primary[600] },
  caption: { color: colors.textMuted, fontSize: 12, lineHeight: 16, textAlign: 'center' },
});
