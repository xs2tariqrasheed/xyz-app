import { Fragment, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { hasWebsiteUrl, type WebsitePage } from '@/config/website';
import { openWebsitePage } from '@/services/website';
import { colors, space } from '@/theme';

export type WebsiteTextLinksProps = {
  links: readonly { label: string; page: WebsitePage }[];
  /** `dark` on the navy menu drawer, `light` on the page background. */
  tone?: 'light' | 'dark';
  style?: StyleProp<ViewStyle>;
};

/**
 * A footer row of website links split by "·", like the booking site's footer
 * (Terms · Privacy · FAQs · Contact Us). Wraps on narrow screens; hidden while
 * `EXPO_PUBLIC_WEBSITE_URL` is unset.
 */
export function WebsiteTextLinks({ links, tone = 'light', style }: WebsiteTextLinksProps) {
  const [failure, setFailure] = useState<string | null>(null);

  if (!hasWebsiteUrl || links.length === 0) return null;

  const dark = tone === 'dark';

  return (
    <View style={[styles.root, style]}>
      <View style={styles.row}>
        {links.map((link, index) => (
          <Fragment key={link.page}>
            {index > 0 ? (
              <Text style={[styles.separator, dark ? styles.separatorDark : null]} aria-hidden>
                ·
              </Text>
            ) : null}
            <Text
              accessibilityRole="link"
              onPress={() => {
                setFailure(null);
                void openWebsitePage(link.page).then(setFailure);
              }}
              style={[styles.link, dark ? styles.linkDark : null]}
            >
              {link.label}
            </Text>
          </Fragment>
        ))}
      </View>
      {failure ? (
        <Text accessibilityRole="alert" style={[styles.failure, dark ? styles.failureDark : null]}>
          {failure}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.xs },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: space.sm,
    rowGap: space.xs,
  },
  link: { color: colors.textLink, fontSize: 13, fontWeight: '600' },
  linkDark: { color: colors.headerFg },
  separator: { color: colors.textMuted, fontSize: 13 },
  separatorDark: { color: colors.headerFgMuted },
  failure: { color: colors.danger, fontSize: 12, textAlign: 'center' },
  failureDark: { color: colors.headerFg },
});
