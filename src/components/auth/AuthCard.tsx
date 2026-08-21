import { StyleSheet, Text, View } from 'react-native';

import { colors, formMaxWidth, radii, shadowValues, space } from '@/theme';

export type AuthCardProps = {
  /** Copy for the navy bar across the top of the card. */
  title: string;
  children: React.ReactNode;
};

/**
 * The framed panel the auth screens sit in: a navy caption bar over a white
 * body, capped at `formMaxWidth` and centred in the page column.
 */
export function AuthCard({ title, children }: AuthCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.titleBar}>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: formMaxWidth,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary[500],
    borderRadius: radii.xl,
    // Clips the title bar's square corners to the card's rounded ones.
    overflow: 'hidden',
    boxShadow: shadowValues.md,
  },
  titleBar: {
    backgroundColor: colors.headerBg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  title: { color: colors.headerFg, fontSize: 15, fontWeight: '700', lineHeight: 21 },
  body: { padding: space.lg, gap: space.lg },
});
