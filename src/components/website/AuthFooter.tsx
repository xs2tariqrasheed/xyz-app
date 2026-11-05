import { StyleSheet } from 'react-native';

import { space } from '@/theme';

import { AUTH_FOOTER_LINKS } from './footerLinks';
import { WebsiteTextLinks } from './WebsiteTextLinks';

/** Terms · Privacy · FAQs · Contact Us under the signed-out forms. */
export function AuthFooter() {
  return <WebsiteTextLinks links={AUTH_FOOTER_LINKS} style={styles.footer} />;
}

const styles = StyleSheet.create({
  footer: { paddingTop: space.sm },
});
