import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors, shadowValues } from '@/theme';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello World</Text>
      <Link href="/theme" style={styles.link}>
        View color theme →
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    padding: 24,
    gap: 16,
  },
  title: { color: colors.textTitle, fontSize: 24, fontWeight: '700' },
  link: {
    color: colors.textOnPrimary,
    backgroundColor: colors.primary[600],
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    boxShadow: shadowValues.sm,
  },
});
