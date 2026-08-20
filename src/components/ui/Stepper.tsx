import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, space } from '@/theme';

import { Field } from './Field';

export type StepperProps = {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  /** Word beside the number; receives the value so it can be pluralised. */
  unit?: (value: number) => string;
  required?: boolean;
  hint?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Number input as a pair of buttons around a read-out.
 *
 * Small whole numbers only — it keeps the keyboard shut on a phone, and the
 * bounds make an impossible count unreachable rather than merely invalid.
 */
export function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  unit,
  required,
  hint,
  style,
}: StepperProps) {
  const clamped = Math.min(max, Math.max(min, value));
  const step = (delta: number) => onChange(Math.min(max, Math.max(min, clamped + delta)));

  return (
    <Field label={label} required={required} hint={hint} style={style}>
      <View style={styles.control}>
        <StepButton
          sign="minus"
          label={`Decrease ${label}`}
          disabled={clamped <= min}
          onPress={() => step(-1)}
        />
        <View style={styles.readout}>
          <Text style={styles.value}>{clamped}</Text>
          {unit ? <Text style={styles.unit}>{unit(clamped)}</Text> : null}
        </View>
        <StepButton
          sign="plus"
          label={`Increase ${label}`}
          disabled={clamped >= max}
          onPress={() => step(1)}
        />
      </View>
    </Field>
  );
}

function StepButton({
  sign,
  label,
  disabled,
  onPress,
}: {
  sign: 'minus' | 'plus';
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const bar = [styles.bar, disabled ? styles.barDisabled : null];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null,
      ]}
    >
      <View style={bar} />
      {sign === 'plus' ? <View style={[bar, styles.barVertical]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: space.sm - 1,
    minHeight: 50,
  },
  readout: { flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: space.sm - 2 },
  value: { color: colors.textStrong, fontSize: 17, fontWeight: '700' },
  unit: { color: colors.textMuted, fontSize: 13 },

  button: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { backgroundColor: colors.primary[100] },
  buttonDisabled: { backgroundColor: colors.disabledBg },
  bar: { position: 'absolute', width: 14, height: 2, borderRadius: 1, backgroundColor: colors.primary[600] },
  barVertical: { transform: [{ rotate: '90deg' }] },
  barDisabled: { backgroundColor: colors.textDisabled },
});
