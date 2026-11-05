import { Screen } from '@/components/layout/Screen';
import { WebsiteLinkList, type WebsiteLink } from '@/components/website/WebsiteLinkList';
import { hasRateRideUrl, rateRidePageUrl } from '@/config/rateRide';
import { WEBSITE_MESSAGES } from '@/constants/messages';

/** The booking site's Contact Us menu, on the marketing site. */
export default function ContactScreen() {
  const links: WebsiteLink[] = [
    { label: WEBSITE_MESSAGES.CUSTOMER_SERVICE, page: 'customerService' },
    { label: WEBSITE_MESSAGES.OPEN_ACCOUNT, page: 'openAccount' },
    { label: WEBSITE_MESSAGES.COMPLAINT, page: 'complaint' },
    // Rate a Ride keeps its own URL (EXPO_PUBLIC_RATE_A_RIDE_URL), shared with ride feedback.
    ...(hasRateRideUrl ? [{ label: WEBSITE_MESSAGES.RATE_A_RIDE, url: rateRidePageUrl() }] : []),
    { label: WEBSITE_MESSAGES.FAQS, page: 'faqs' },
    { label: WEBSITE_MESSAGES.DRIVERS_JOIN, page: 'driversJoin' },
  ];

  return (
    <Screen title={WEBSITE_MESSAGES.CONTACT_SCREEN_TITLE}>
      <WebsiteLinkList title={WEBSITE_MESSAGES.CONTACT_TITLE} links={links} />
    </Screen>
  );
}
