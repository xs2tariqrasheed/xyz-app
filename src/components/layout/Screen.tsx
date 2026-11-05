import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { AppHeader, type AppHeaderProps } from '@/components/nav/AppHeader';
import { colors, contentMaxWidth, space } from '@/theme';

export type ScreenProps = AppHeaderProps & {
  children: React.ReactNode;
  /** For screens that move the page themselves, e.g. back to the top on a new step. */
  scrollRef?: React.Ref<ScrollView>;
};

/**
 * Standard page: app header over a scrolling, width-capped content column.
 *
 * Screens with their own sticky footer (the reservation form) compose
 * `AppHeader` directly instead.
 */
export function Screen({ children, scrollRef, ...header }: ScreenProps) {
  return (
    <View style={styles.root}>
      <AppHeader {...header} />
      {/* Only the scroller lifts for the keyboard — the header stays put. */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <View style={styles.page}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: space.lg, paddingTop: space.xl, paddingBottom: space.xxl },
  page: { width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center', gap: space.lg },
});
