import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthCard } from '@/components/auth/AuthCard';
import { Button } from '@/components/ui/Button';
import { colors, space } from '@/theme';

export type StatusAction = {
  label: string;
  onPress: () => void;
};

export type StatusScreenProps = {
  title: string;
  message: string;
  /** A second, smaller line: a countdown or a contact hint. */
  detail?: string;
  /** The first is the primary button; a second sits beside it as an outline. */
  actions: readonly [StatusAction] | readonly [StatusAction, StatusAction];
};

/**
 * Full-page outcome for a flow that cannot continue (reverse-engineer-guide/25):
 * session timed out, unexpected error, page not found.
 *
 * Uses no context, so the root error boundary can render it outside the
 * providers. It needs a `SafeAreaProvider` above it for the insets.
 */
export function StatusScreen({ title, message, detail, actions }: StatusScreenProps) {
  const insets = useSafeAreaInsets();
  const [primary, secondary] = actions;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xxl },
      ]}
    >
      <AuthCard title={title}>
        <View accessibilityRole="alert" style={styles.text}>
          <Text style={styles.message}>{message}</Text>
          {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        </View>
        <View style={styles.actions}>
          <Button label={primary.label} onPress={primary.onPress} />
          {secondary ? (
            <Button label={secondary.label} onPress={secondary.onPress} variant="outline" />
          ) : null}
        </View>
      </AuthCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: space.lg },
  text: { gap: space.sm },
  message: { color: colors.textStrong, fontSize: 15, lineHeight: 22 },
  detail: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
});
