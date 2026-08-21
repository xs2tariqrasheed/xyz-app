import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, space } from '@/theme';

import { Field } from './Field';

export type RadioOption<T extends string> = {
  value: T;
  label: string;
  /** Optional second line, for spelling out what the choice means. */
  description?: string;
};

export type RadioGroupProps<T extends string> = {
  label: string;
  value: T;
  options: readonly RadioOption<T>[];
  onChange: (value: T) => void;
  required?: boolean;
  hint?: string;
  error?: string;
  style?: StyleProp<ViewStyle>;
};

/** The ring on its own, so a row can lay out its own label. */
export function Radio({ checked }: { checked: boolean }) {
  return (
    <View style={[styles.ring, checked ? styles.ringChecked : null]}>
      {checked ? <View style={styles.dot} /> : null}
    </View>
  );
}

/**
 * Exclusive choice as a stack of full-width cards.
 *
 * Cards rather than bare radios: the whole row is the hit target, which is what
 * makes the control usable with a thumb.
 */
export function RadioGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  required,
  hint,
  error,
  style,
}: RadioGroupProps<T>) {
  return (
    <Field label={label} required={required} hint={hint} error={error} style={style}>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.group}>
        {options.map((option) => {
          const checked = option.value === value;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked }}
              // react-native-web no longer derives aria-checked from accessibilityState.
              aria-checked={checked}
              accessibilityLabel={option.label}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.card,
                checked ? styles.cardChecked : null,
                pressed && !checked ? styles.cardPressed : null,
              ]}
            >
              <Radio checked={checked} />
              <View style={styles.text}>
                <Text style={[styles.label, checked ? styles.labelChecked : null]}>
                  {option.label}
                </Text>
                {option.description ? (
                  <Text style={styles.description}>{option.description}</Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Field>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.sm },

  ring: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringChecked: { borderColor: colors.primary[600] },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary[600] },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    minHeight: 48,
  },
  cardChecked: { backgroundColor: colors.surfaceSelected, borderColor: colors.primary[200] },
  cardPressed: { backgroundColor: colors.surfaceSunken },
  text: { flex: 1, gap: 2 },
  label: { color: colors.textStrong, fontSize: 15, fontWeight: '600' },
  labelChecked: { color: colors.primary[600] },
  description: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
});
