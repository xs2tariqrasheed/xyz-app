import { ScrollView, StyleSheet, View } from 'react-native';

import { AppHeader, type AppHeaderProps } from '@/components/nav/AppHeader';
import { colors, contentMaxWidth, space } from '@/theme';

export type ScreenProps = AppHeaderProps & {
  children: React.ReactNode;
};

/**
 * Standard page: app header over a scrolling, width-capped content column.
 *
 * Screens with their own sticky footer (the reservation form) compose
 * `AppHeader` directly instead.
 */
export function Screen({ children, ...header }: ScreenProps) {
  return (
    <View style={styles.root}>
      <AppHeader {...header} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.page}>{children}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.lg, paddingTop: space.xl, paddingBottom: space.xxl },
  page: { width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center', gap: space.lg },
});
