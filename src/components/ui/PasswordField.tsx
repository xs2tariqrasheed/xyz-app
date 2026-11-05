import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { colors, focusedFieldStyle, nativeFocusRingReset, radii, space } from '@/theme';

import { Field } from './Field';
import { EyeGlyph } from './Glyph';

export type PasswordFieldProps = Omit<TextInputProps, 'style' | 'secureTextEntry'> & {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Password input with a reveal toggle.
 *
 * The border and focus halo live on the wrapper rather than the `TextInput`,
 * so the eye button sits inside the field instead of beside it.
 */
export function PasswordField({
  label,
  required,
  hint,
  error,
  style,
  onFocus,
  onBlur,
  ...inputProps
}: PasswordFieldProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <Field label={label} required={required} hint={hint} error={error} style={style}>
      <View
        style={[
          styles.wrapper,
          focused ? styles.wrapperFocused : null,
          error ? styles.wrapperError : null,
        ]}
      >
        <TextInput
          // The visible label is a separate Text, so name the input explicitly.
          accessibilityLabel={label}
          {...inputProps}
          secureTextEntry={!revealed}
          placeholderTextColor={colors.textDisabled}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={styles.input}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={revealed ? `Hide ${label}` : `Show ${label}`}
          accessibilityState={{ selected: revealed }}
          onPress={() => setRevealed((current) => !current)}
          style={({ pressed }) => [styles.toggle, pressed ? styles.togglePressed : null]}
        >
          <EyeGlyph off={revealed} color={revealed ? colors.primary[600] : colors.textMuted} />
        </Pressable>
      </View>
    </Field>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingRight: space.xs,
  },
  wrapperFocused: focusedFieldStyle,
  wrapperError: { borderColor: colors.danger },
  input: {
    ...nativeFocusRingReset,
    flex: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    fontSize: 15,
    color: colors.textStrong,
    backgroundColor: 'transparent',
  },
  toggle: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  togglePressed: { backgroundColor: colors.surfaceSunken },
});
