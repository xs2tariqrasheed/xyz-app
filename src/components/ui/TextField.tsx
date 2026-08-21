import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, focusedFieldStyle, nativeFocusRingReset, radii, space } from '@/theme';

import { Field } from './Field';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  required?: boolean;
  hint?: string;
  /** Shown under the field and reddens the border. */
  error?: string;
  /** Lays the label out beside the input on tablet-and-wider viewports. */
  inline?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Applied to the input itself, e.g. a `minHeight` for a multi-line box. */
  inputStyle?: StyleProp<TextStyle>;
};

/**
 * Text input. Focus is drawn with a brand border plus a 3px `--focus-ring`
 * halo, the same treatment as the theme page's focused field.
 *
 * Single line by default; pass `multiline` with an `inputStyle` height for a
 * box that takes a sentence or two.
 */
export function TextField({
  label,
  required,
  hint,
  error,
  inline,
  style,
  inputStyle,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <Field label={label} required={required} hint={hint} error={error} inline={inline} style={style}>
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
          inputProps.multiline ? styles.multiline : null,
          error ? styles.inputInvalid : null,
          focused ? (error ? styles.inputFocusedInvalid : styles.inputFocused) : null,
          inputStyle,
        ]}
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
  inputInvalid: { borderColor: colors.dangerBorder, backgroundColor: colors.dangerBg },
  inputFocused: focusedFieldStyle,
  // Focus on an errored field keeps the danger tint but swaps the brand halo
  // for a danger one, so the ring never contradicts the message below.
  inputFocusedInvalid: {
    borderColor: colors.danger,
    boxShadow: `0 0 0 3px ${colors.dangerBorder}`,
  },
  // `textAlignVertical` is the Android-only knob that keeps the caret on the
  // first line; iOS and web already top-align a multiline input.
  multiline: { minHeight: 96, textAlignVertical: 'top' },
});
