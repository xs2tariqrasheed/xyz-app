import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
} from 'react-native';

import { colors, focusedFieldStyle, nativeFocusRingReset, radii, space } from '@/theme';

export type InputProps = Omit<TextInputProps, 'style'> & {
  /** Paints the border with the danger tone and swaps the focus halo to match. */
  invalid?: boolean;
  style?: StyleProp<TextStyle>;
};

/**
 * The bare text control: box, focus treatment and invalid treatment, with no
 * label around it.
 *
 * `TextField` is the one to reach for. This exists for the rows that hold
 * several inputs under a single label — a phone number split into country
 * code, number and extension.
 */
export function Input({ invalid, style, onFocus, onBlur, ...inputProps }: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
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
      style={[
        styles.input,
        invalid ? styles.invalid : null,
        focused ? (invalid ? styles.invalidFocused : styles.focused) : null,
        style,
      ]}
    />
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
  focused: focusedFieldStyle,
  invalid: { borderColor: colors.danger, backgroundColor: colors.dangerBg },
  invalidFocused: { borderColor: colors.danger, boxShadow: `0 0 0 3px ${colors.dangerBorder}` },
});
