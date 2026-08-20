import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, shadowValues, space } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  /** Grows to fill the row it sits in. */
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  fill,
  style,
}: ButtonProps) {
  const tone = disabled ? disabledTone : tones[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        tone.container,
        fill ? styles.fill : null,
        pressed && !disabled ? styles.pressed : null,
        style,
      ]}
    >
      <Text style={[styles.label, size === 'lg' ? styles.labelLg : null, tone.label]}>{label}</Text>
    </Pressable>
  );
}

type Tone = { container: ViewStyle; label: { color: string } };

const tones: Record<ButtonVariant, Tone> = {
  primary: {
    container: { backgroundColor: colors.primary[600], boxShadow: shadowValues.sm },
    label: { color: colors.textOnPrimary },
  },
  secondary: {
    container: { backgroundColor: colors.secondary, boxShadow: shadowValues.sm },
    label: { color: colors.textOnPrimary },
  },
  outline: {
    container: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    label: { color: colors.textStrong },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    label: { color: colors.textLink },
  },
  danger: {
    container: { backgroundColor: colors.danger, boxShadow: shadowValues.sm },
    label: { color: colors.textOnPrimary },
  },
};

const disabledTone: Tone = {
  container: { backgroundColor: colors.disabledBg, borderWidth: 1, borderColor: colors.disabledBorder },
  label: { color: colors.textDisabled },
};

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: radii.md },
  md: { paddingHorizontal: space.lg, paddingVertical: space.md - 2 },
  lg: { paddingHorizontal: space.xl, paddingVertical: space.lg - 2 },
  fill: { flex: 1 },
  pressed: { opacity: 0.85 },
  label: { fontSize: 14, fontWeight: '600' },
  labelLg: { fontSize: 15 },
});
