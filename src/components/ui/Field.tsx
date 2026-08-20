import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, space } from '@/theme';

export type FieldProps = {
  label: string;
  /** Renders the muted asterisk after the label. */
  required?: boolean;
  /** Small helper line under the control. */
  hint?: string;
  /** Validation message. Takes the hint's place while it is set. */
  error?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/** Label + control + hint. Every input in the reservation form sits in one. */
export function Field({ label, required, hint, error, style, children }: FieldProps) {
  return (
    <View style={[styles.root, style]}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {children}
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm - 2 },
  label: { color: colors.textStrong, fontSize: 13, fontWeight: '600', letterSpacing: 0.1 },
  required: { color: colors.textMuted, fontWeight: '400' },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 16 },
  error: { color: colors.danger, fontSize: 12, lineHeight: 16, fontWeight: '500' },
});
