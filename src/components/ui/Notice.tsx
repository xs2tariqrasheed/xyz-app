import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, space, status, type StatusName } from '@/theme';

export type NoticeProps = {
  tone: StatusName;
  title: string;
  message?: string;
  style?: StyleProp<ViewStyle>;
};

/** Inline status strip: the saved confirmation and the "check these" summary. */
export function Notice({ tone, title, message, style }: NoticeProps) {
  const palette = status[tone];

  return (
    <View
      accessibilityRole="alert"
      style={[styles.root, { backgroundColor: palette.bg, borderColor: palette.border }, style]}
    >
      <View style={[styles.rule, { backgroundColor: palette.base }]} />
      <View style={styles.text}>
        <Text style={[styles.title, { color: palette.base }]}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    gap: space.md,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: space.md,
  },
  rule: { width: 3, borderRadius: 2 },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontWeight: '700' },
  message: { color: colors.textBody, fontSize: 13, lineHeight: 18 },
});
