import { Screen } from '@/components/layout/Screen';
import { WebsiteLinkList } from '@/components/website/WebsiteLinkList';
import { WEBSITE_MESSAGES } from '@/constants/messages';

/** The booking site's Rates menu, on the marketing site. */
export default function RatesScreen() {
  return (
    <Screen title="Rates">
      <WebsiteLinkList
        title={WEBSITE_MESSAGES.RATES_TITLE}
        links={[
          { label: WEBSITE_MESSAGES.SAMPLE_RATES, page: 'sampleRates' },
          { label: WEBSITE_MESSAGES.SERVICES_RATES, page: 'servicesRates' },
          { label: WEBSITE_MESSAGES.RATE_BOOK, page: 'rateBook' },
        ]}
      />
    </Screen>
  );
}
