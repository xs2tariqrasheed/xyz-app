import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { hasWebsiteUrl, type WebsitePage } from '@/config/website';
import { WEBSITE_MESSAGES } from '@/constants/messages';
import { openWebsitePage } from '@/services/website';
import { colors, space } from '@/theme';

/**
 * "By creating an account you agree to the Terms and Conditions and Privacy
 * Policy." above the registration submit (missing-screens 18 §3).
 */
export function TermsAgreement() {
  const [failure, setFailure] = useState<string | null>(null);

  if (!hasWebsiteUrl) return null;

  const link = (page: WebsitePage, label: string) => (
    <Text
      accessibilityRole="link"
      onPress={() => {
        setFailure(null);
        void openWebsitePage(page).then(setFailure);
      }}
      style={styles.link}
    >
      {label}
    </Text>
  );

  return (
    <View style={styles.root}>
      <Text style={styles.text}>
        {WEBSITE_MESSAGES.AGREE_LEAD} {link('terms', WEBSITE_MESSAGES.TERMS)} {WEBSITE_MESSAGES.AGREE_AND}{' '}
        {link('privacy', WEBSITE_MESSAGES.PRIVACY)}
        {WEBSITE_MESSAGES.AGREE_TAIL}
      </Text>
      {failure ? (
        <Text accessibilityRole="alert" style={styles.failure}>
          {failure}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.xs },
  text: { color: colors.textBody, fontSize: 13, lineHeight: 19 },
  link: { color: colors.textLink, fontWeight: '600' },
  failure: { color: colors.danger, fontSize: 12 },
});
