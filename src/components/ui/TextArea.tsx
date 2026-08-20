import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { colors, focusedFieldStyle, nativeFocusRingReset, radii, space } from '@/theme';

import { Field } from './Field';

export type TextAreaProps = Omit<TextInputProps, 'style' | 'multiline'> & {
  label: string;
  required?: boolean;
  hint?: string;
  /** Visible rows before the box starts scrolling. */
  rows?: number;
  style?: StyleProp<ViewStyle>;
};

const LINE_HEIGHT = 20;

/**
 * Multi-line text input. Same border, radius and focus halo as {@link TextField},
 * sized by `rows` rather than a fixed height so it scales with the layout.
 *
 * `textAlignVertical: 'top'` is what keeps Android from centring the first line;
 * iOS and web already start at the top.
 */
export function TextArea({
  label,
  required,
  hint,
  rows = 3,
  maxLength,
  value,
  style,
  accessibilityLabel,
  onFocus,
  onBlur,
  ...inputProps
}: TextAreaProps) {
  const [focused, setFocused] = useState(false);
  const used = value?.length ?? 0;

  // The hint is rendered here, not by `Field`, so it can share a baseline with
  // the counter instead of being pushed a line below it.
  return (
    <Field label={label} required={required} style={style}>
      <TextInput
        {...inputProps}
        value={value}
        maxLength={maxLength}
        accessibilityLabel={accessibilityLabel ?? label}
        multiline
        textAlignVertical="top"
        placeholderTextColor={colors.textDisabled}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          { minHeight: rows * LINE_HEIGHT + space.md * 2 },
          focused ? styles.inputFocused : null,
        ]}
      />
      {hint || maxLength ? (
        <View style={styles.footer}>
          <Text style={styles.hint}>{hint ?? ''}</Text>
          {maxLength ? (
            <Text style={styles.counter}>
              {used} / {maxLength}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Field>
  );
}

const styles = StyleSheet.create({
  input: {
    ...nativeFocusRingReset,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    fontSize: 15,
    lineHeight: LINE_HEIGHT,
    color: colors.textStrong,
  },
  inputFocused: focusedFieldStyle,

  footer: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  hint: { flex: 1, color: colors.textMuted, fontSize: 12, lineHeight: 16 },
  counter: { color: colors.textMuted, fontSize: 12, lineHeight: 16, fontVariant: ['tabular-nums'] },
});
