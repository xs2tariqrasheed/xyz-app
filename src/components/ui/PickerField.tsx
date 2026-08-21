import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, space } from '@/theme';

import { Field } from './Field';
import { ChevronGlyph } from './Glyph';

export type PickerFieldProps = {
  label: string;
  /** Formatted value; falls back to `placeholder` when empty. */
  value?: string;
  placeholder?: string;
  /** Secondary line under the value, e.g. "Today". */
  caption?: string;
  icon: React.ReactNode;
  onPress: () => void;
  required?: boolean;
  hint?: string;
  /** Validation message. Replaces `hint` and turns the border danger-red. */
  error?: string;
  tone?: 'primary' | 'accent';
  style?: StyleProp<ViewStyle>;
};

/** A read-only control that opens a picker sheet. Looks like a text input. */
export function PickerField({
  label,
  value,
  placeholder = 'Select',
  caption,
  icon,
  onPress,
  required,
  hint,
  error,
  tone = 'primary',
  style,
}: PickerFieldProps) {
  const iconWell =
    tone === 'accent'
      ? { backgroundColor: colors.accentSubtle }
      : { backgroundColor: colors.surfaceSelected };

  return (
    <Field label={label} required={required} hint={hint} error={error} style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ?? placeholder}`}
        onPress={onPress}
        style={({ pressed }) => [
          styles.control,
          error ? styles.controlError : null,
          pressed ? styles.pressed : null,
        ]}
      >
        <View style={[styles.iconWell, iconWell]}>{icon}</View>
        <View style={styles.text}>
          <Text style={[styles.value, value ? null : styles.placeholder]} numberOfLines={1}>
            {value ?? placeholder}
          </Text>
          {caption ? (
            <Text style={styles.caption} numberOfLines={1}>
              {caption}
            </Text>
          ) : null}
        </View>
        <ChevronGlyph direction="down" color={colors.textMuted} size={8} />
      </Pressable>
    </Field>
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
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 1,
    minHeight: 50,
  },
  controlError: { borderColor: colors.dangerBorder, backgroundColor: colors.dangerBg },
  pressed: { backgroundColor: colors.surfaceSunken },
  iconWell: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  value: { color: colors.textStrong, fontSize: 15, fontWeight: '600' },
  placeholder: { color: colors.textDisabled, fontWeight: '500' },
  caption: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
});
