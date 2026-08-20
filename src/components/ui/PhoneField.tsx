import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  MAX_INTL_DIGITS,
  US_PHONE_DIGITS,
  formatIntlPhone,
  formatUsPhone,
  toDigits,
  toExtension,
} from '@/utils/phone';
import { breakpoints, colors, focusedFieldStyle, nativeFocusRingReset, radii, space } from '@/theme';

import { CountryCodePicker } from './CountryCodePicker';
import { Field } from './Field';

export type PhoneValue = {
  /** ISO alpha-2. Always `null` on the US variant, which is fixed to +1. */
  country: string | null;
  /** Digits only — formatting is applied for display, never stored. */
  number: string;
  /** Digits only. */
  ext: string;
};

export type PhoneFieldProps = {
  label: string;
  value: PhoneValue;
  onChange: (next: PhoneValue) => void;
  /** `us` pins the code to +1 and formats as (000) 000-0000. */
  variant: 'us' | 'international';
  required?: boolean;
  hint?: string;
  error?: string;
  /** Fires when the number input loses focus, for touch-then-validate. */
  onBlur?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Phone number plus extension, on one row where the form column allows it.
 *
 * The extension carries its own inline "Ext" prefix instead of a second field
 * label, which keeps the pair reading as one control on a phone screen.
 */
export function PhoneField({
  label,
  value,
  onChange,
  variant,
  required,
  hint,
  error,
  onBlur,
  style,
}: PhoneFieldProps) {
  const { width } = useWindowDimensions();
  const inline = width >= breakpoints.sm;

  const [numberFocused, setNumberFocused] = useState(false);
  const [extFocused, setExtFocused] = useState(false);

  const isUs = variant === 'us';
  const maxDigits = isUs ? US_PHONE_DIGITS : MAX_INTL_DIGITS;
  const display = isUs ? formatUsPhone(value.number) : formatIntlPhone(value.number);

  return (
    <Field label={label} required={required} hint={hint} error={error} style={style}>
      <View style={[styles.row, inline ? styles.rowInline : null]}>
        <View
          style={[
            styles.shell,
            styles.numberShell,
            error ? styles.shellInvalid : null,
            numberFocused ? styles.shellFocused : null,
          ]}
        >
          {isUs ? (
            <View style={styles.usCode}>
              <Text style={styles.usCodeText}>+1</Text>
            </View>
          ) : (
            <CountryCodePicker
              value={value.country}
              onChange={(country) => onChange({ ...value, country })}
              fieldName={label.toLowerCase()}
            />
          )}
          <TextInput
            value={display}
            onChangeText={(text) => onChange({ ...value, number: toDigits(text, maxDigits) })}
            onFocus={() => setNumberFocused(true)}
            onBlur={() => {
              setNumberFocused(false);
              onBlur?.();
            }}
            placeholder={isUs ? '(555) 010-0199' : '20 7946 0958'}
            placeholderTextColor={colors.textDisabled}
            keyboardType="phone-pad"
            inputMode="tel"
            autoComplete="tel"
            textContentType="telephoneNumber"
            accessibilityLabel={label}
            style={styles.input}
          />
        </View>

        <View
          style={[
            styles.shell,
            inline ? styles.extShellInline : null,
            extFocused ? styles.shellFocused : null,
          ]}
        >
          <View style={styles.extLabel}>
            <Text style={styles.extLabelText}>Ext</Text>
          </View>
          <TextInput
            value={value.ext}
            onChangeText={(text) => onChange({ ...value, ext: toExtension(text) })}
            onFocus={() => setExtFocused(true)}
            onBlur={() => setExtFocused(false)}
            placeholder="000"
            placeholderTextColor={colors.textDisabled}
            keyboardType="number-pad"
            inputMode="numeric"
            accessibilityLabel={`${label} extension`}
            style={styles.input}
          />
        </View>
      </View>
    </Field>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.sm },
  rowInline: { flexDirection: 'row' },

  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    minHeight: 50,
    overflow: 'hidden',
  },
  numberShell: { flex: 1 },
  // Room for "Ext" plus four digits, and no more — the number keeps the rest.
  extShellInline: { width: 122 },
  shellFocused: focusedFieldStyle,
  shellInvalid: { borderColor: colors.dangerBorder, backgroundColor: colors.dangerBg },

  usCode: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  usCodeText: { color: colors.textStrong, fontSize: 15, fontWeight: '600' },

  extLabel: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: space.md,
    backgroundColor: colors.surfaceSunken,
  },
  extLabelText: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },

  input: {
    ...nativeFocusRingReset,
    flex: 1,
    // A web <input> has an intrinsic min-content width, and `min-width: auto`
    // would let it push the "Ext" prefix out of the shell rather than shrink.
    minWidth: 0,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    fontSize: 15,
    color: colors.textStrong,
    backgroundColor: 'transparent',
  },
});
