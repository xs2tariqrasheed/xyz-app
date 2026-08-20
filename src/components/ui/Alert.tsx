import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, space, status, type StatusName } from '@/theme';

export type AlertProps = {
  tone?: StatusName;
  /** Optional bold first line. */
  title?: string;
  message: string;
  style?: StyleProp<ViewStyle>;
};

/** Inline status message — form-level errors, confirmations, notices. */
export function Alert({ tone = 'info', title, message, style }: AlertProps) {
  const palette = status[tone];

  return (
    <View
      // `alert` announces the message the moment it appears, which is the
      // point: it is usually rendered in response to a failed submit.
      accessibilityRole="alert"
      style={[styles.root, { backgroundColor: palette.bg, borderColor: palette.border }, style]}
    >
      <View style={[styles.stripe, { backgroundColor: palette.base }]} />
      <View style={styles.text}>
        {title ? <Text style={[styles.title, { color: palette.base }]}>{title}</Text> : null}
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: space.md,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: space.md,
  },
  stripe: { width: 3, borderRadius: 2 },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 13, fontWeight: '700' },
  message: { color: colors.textBody, fontSize: 13, lineHeight: 19 },
});
