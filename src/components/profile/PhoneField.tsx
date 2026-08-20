import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { colors, space } from '@/theme';

export type PhonePart = {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  /** Small line under this input, e.g. `Country + city code`. */
  caption?: string;
  invalid?: boolean;
};

export type PhoneFieldProps = {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  /** Country + city code. Omitted for a domestic number. */
  code?: PhonePart;
  number: PhonePart;
  extension?: PhonePart;
  style?: StyleProp<ViewStyle>;
};

/**
 * One phone number under one label, split across the inputs it needs: an
 * optional country/city code, the number itself and an optional extension.
 *
 * The row wraps rather than shrinking, so on a phone the extension drops to
 * its own line instead of squeezing the number into a few characters.
 */
export function PhoneField({
  label,
  required,
  hint,
  error,
  code,
  number,
  extension,
  style,
}: PhoneFieldProps) {
  return (
    <Field label={label} required={required} hint={hint} error={error} style={style}>
      <View style={styles.row}>
        {code ? (
          <Part part={code} style={styles.code} accessibilityLabel={`${label} country and city code`} />
        ) : null}

        <Part part={number} style={styles.number} accessibilityLabel={label} />

        {extension ? (
          <View style={styles.extension}>
            <Text style={styles.extensionLabel}>Ext</Text>
            <Part
              part={extension}
              style={styles.extensionInput}
              accessibilityLabel={`${label} extension`}
            />
          </View>
        ) : null}
      </View>
    </Field>
  );
}

function Part({
  part,
  style,
  accessibilityLabel,
}: {
  part: PhonePart;
  style: StyleProp<ViewStyle>;
  accessibilityLabel: string;
}) {
  return (
    <View style={style}>
      <Input
        value={part.value}
        onChangeText={part.onChangeText}
        placeholder={part.placeholder}
        invalid={part.invalid}
        accessibilityLabel={accessibilityLabel}
        inputMode="tel"
        autoComplete="off"
      />
      {part.caption ? <Text style={styles.caption}>{part.caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: space.sm },
  // Weights, not widths: the parts keep their proportions from a 320pt phone
  // up to the capped form column, and wrap once they cannot.
  code: { flexGrow: 1, flexBasis: 112, maxWidth: 140 },
  number: { flexGrow: 4, flexBasis: 180 },
  extension: { flexGrow: 1, flexBasis: 128, maxWidth: 168, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  extensionLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  extensionInput: { flex: 1 },
  caption: { color: colors.textMuted, fontSize: 11, lineHeight: 15, marginTop: space.xs },
});
