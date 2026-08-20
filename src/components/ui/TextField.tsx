import { useState } from 'react';
import { StyleSheet, TextInput, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { colors, radii, space } from '@/theme';

import { Field } from './Field';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  required?: boolean;
  hint?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Single-line text input. Focus is drawn with a brand border plus a 3px
 * `--focus-ring` halo, the same treatment as the theme page's focused field.
 */
export function TextField({ label, required, hint, style, onFocus, onBlur, ...inputProps }: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <Field label={label} required={required} hint={hint} style={style}>
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
        style={[styles.input, focused ? styles.inputFocused : null]}
      />
    </Field>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    fontSize: 15,
    color: colors.textStrong,
    // Focus is drawn with our own ring, not the platform outline.
    outlineWidth: 0,
  },
  inputFocused: {
    borderColor: colors.primary[500],
    boxShadow: `0 0 0 3px ${colors.focusRing}`,
  },
});
