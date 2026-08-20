import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ComingSoon } from '@/components/layout/ComingSoon';
import { Screen } from '@/components/layout/Screen';
import { ChevronGlyph } from '@/components/ui/Glyph';
import { colors, radii, shadowValues, space } from '@/theme';

export default function ProfileScreen() {
  return (
    <Screen title="Profile" subtitle="Your details, addresses and saved contacts.">
      <Link href="/change-password" asChild>
        <Pressable accessibilityRole="link" accessibilityLabel="Change password">
          {({ pressed }) => (
            <View style={[styles.row, pressed ? styles.rowPressed : null]}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Change password</Text>
                <Text style={styles.rowDetail}>Update the password you use to sign in.</Text>
              </View>
              <ChevronGlyph direction="right" color={colors.textMuted} size={8} />
            </View>
          )}
        </Pressable>
      </Link>

      <ComingSoon
        blurb="The account area: personal details, saved pickup and drop-off addresses, and the contacts a ride can be booked for."
        points={['Name, phone and email', 'Saved addresses', 'Contacts and payment methods']}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: space.lg,
    boxShadow: shadowValues.sm,
  },
  rowPressed: { backgroundColor: colors.surfaceSelected, borderColor: colors.primary[200] },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: colors.textHeading, fontSize: 16, fontWeight: '700' },
  rowDetail: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
});
