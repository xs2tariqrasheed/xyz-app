import { useState } from 'react';
import { StyleSheet, TextInput, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { colors, focusedFieldStyle, nativeFocusRingReset, radii, space } from '@/theme';

import { Field } from './Field';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Single-line text input. Focus is drawn with a brand border plus a 3px
 * `--focus-ring` halo, the same treatment as the theme page's focused field.
 */
export function TextField({ label, required, hint, error, style, onFocus, onBlur, ...inputProps }: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <Field label={label} required={required} hint={hint} error={error} style={style}>
      <TextInput
        {...inputProps}
        placeholderTextColor={colors.textDisabled}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[styles.input, focused ? styles.inputFocused : null, error ? styles.inputError : null]}
      />
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
    color: colors.textStrong,
  },
  inputFocused: focusedFieldStyle,
  // Applied last: a rejected value keeps the focus halo but reads as danger.
  inputError: { borderColor: colors.danger },
});
