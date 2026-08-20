import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, space } from '@/theme';

export type FieldProps = {
  label: string;
  /** Renders the muted asterisk after the label. */
  required?: boolean;
  /** Small helper line under the control. */
  hint?: string;
  /** Validation message. Replaces `hint` while it is set. */
  error?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/** Label + control + hint. Every input in the reservation form sits in one. */
export function Field({ label, required, hint, error, style, children }: FieldProps) {
  const footnote = error ?? hint;

  return (
    <View style={[styles.root, style]}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {children}
      {footnote ? (
        <Text style={[styles.hint, error ? styles.errorText : null]} accessibilityRole={error ? 'alert' : undefined}>
          {footnote}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm - 2 },
  label: { color: colors.textStrong, fontSize: 13, fontWeight: '600', letterSpacing: 0.1 },
  required: { color: colors.textMuted, fontWeight: '400' },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 16 },
  errorText: { color: colors.danger, fontWeight: '600' },
});
