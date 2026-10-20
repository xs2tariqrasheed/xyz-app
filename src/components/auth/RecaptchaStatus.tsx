import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { CAPTCHA_MESSAGES } from '@/constants/messages';
import { colors, space } from '@/theme';

type Props = { verifying: boolean; error: string | null };

/** The line under the Google widget: the server check in progress, or why it failed. */
export function RecaptchaStatus({ verifying, error }: Props) {
  if (verifying) {
    return (
      <View style={styles.row} accessibilityLiveRegion="polite">
        <ActivityIndicator size="small" color={colors.primary[600]} />
        <Text style={styles.verifying}>{CAPTCHA_MESSAGES.VERIFYING}</Text>
      </View>
    );
  }
  if (error) {
    return (
      <Text style={styles.error} accessibilityRole="alert">
        {error}
      </Text>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  verifying: { color: colors.textMuted, fontSize: 13 },
  error: { color: colors.danger, fontSize: 13 },
});
