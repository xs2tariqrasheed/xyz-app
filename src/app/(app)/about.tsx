import { Screen } from '@/components/layout/Screen';
import { WebsiteLinkList } from '@/components/website/WebsiteLinkList';
import { WEBSITE_MESSAGES } from '@/constants/messages';

/** The booking site's About menu and legal footer, on the marketing site. */
export default function AboutScreen() {
  return (
    <Screen title="About">
      <WebsiteLinkList
        title={WEBSITE_MESSAGES.ABOUT_TITLE}
        links={[
          { label: WEBSITE_MESSAGES.COMPANY_INFO, page: 'companyInfo' },
          { label: WEBSITE_MESSAGES.OUR_SERVICES, page: 'ourServices' },
          { label: WEBSITE_MESSAGES.OUR_POLICIES, page: 'ourPolicies' },
          { label: WEBSITE_MESSAGES.WEBSITE_HOME, page: 'home' },
        ]}
      />
      <WebsiteLinkList
        title={WEBSITE_MESSAGES.LEGAL_TITLE}
        links={[
          { label: WEBSITE_MESSAGES.TERMS, page: 'terms' },
          { label: WEBSITE_MESSAGES.PRIVACY, page: 'privacy' },
        ]}
      />
    </Screen>
  );
}
