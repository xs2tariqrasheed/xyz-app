import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Alert } from '@/components/ui/Alert';
import { ChevronGlyph } from '@/components/ui/Glyph';
import { hasWebsiteUrl, type WebsitePage } from '@/config/website';
import { WEBSITE_MESSAGES } from '@/constants/messages';
import { openExternalUrl, openWebsitePage } from '@/services/website';
import { colors, radii, shadowValues, space } from '@/theme';

/** A website page, or a full URL for links with their own config (Rate a Ride). */
export type WebsiteLink = { label: string } & ({ page: WebsitePage } | { url: string });

export type WebsiteLinkListProps = {
  title: string;
  links: readonly WebsiteLink[];
  style?: StyleProp<ViewStyle>;
};

/**
 * A card of links that leave the app for the marketing site. Page links are
 * dropped while `EXPO_PUBLIC_WEBSITE_URL` is unset, and the card with them
 * when none is left.
 */
export function WebsiteLinkList({ title, links, style }: WebsiteLinkListProps) {
  const [failure, setFailure] = useState<string | null>(null);

  const shown = links.filter((link) => 'url' in link || hasWebsiteUrl);
  if (shown.length === 0) return null;

  const open = (link: WebsiteLink) => {
    setFailure(null);
    const opening =
      'url' in link ? openExternalUrl(link.url, WEBSITE_MESSAGES.OPEN_FAILED) : openWebsitePage(link.page);
    void opening.then(setFailure);
  };

  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title}>{title}</Text>

      {failure ? <Alert tone="danger" message={failure} style={styles.alert} /> : null}

      {shown.map((link, index) => (
        <Pressable
          key={link.label}
          accessibilityRole="link"
          accessibilityLabel={link.label}
          onPress={() => open(link)}
        >
          {({ pressed }) => (
            <View style={[styles.row, index > 0 ? styles.rowDivided : null, pressed ? styles.pressed : null]}>
              <Text style={styles.label}>{link.label}</Text>
              <ChevronGlyph direction="right" color={colors.textMuted} size={7} />
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    boxShadow: shadowValues.sm,
  },
  title: {
    color: colors.textTitle,
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: space.md,
  },
  alert: { marginBottom: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingVertical: space.md,
  },
  rowDivided: { borderTopWidth: 1, borderTopColor: colors.border },
  pressed: { opacity: 0.6 },
  label: { flex: 1, color: colors.textStrong, fontSize: 14, fontWeight: '500' },
});
