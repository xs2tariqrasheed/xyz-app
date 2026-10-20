import { absoluteHttpUrl } from '@/utils/url';

/**
 * The marketing site (reverse-engineer-external-redirects/), read from `.env`:
 *
 *     EXPO_PUBLIC_WEBSITE_URL=https://xyzcar.com/
 *
 * The booking site's header and footer link out to these pages; the app links
 * to the same ones from About, Rates, Contact Us, Receipts and the auth
 * screens' footer.
 *
 * Expo inlines `EXPO_PUBLIC_*` variables at build time, so the reference
 * below must stay static dot notation — `process.env['...']` is not
 * substituted.
 */
const rawUrl = process.env.EXPO_PUBLIC_WEBSITE_URL;

const baseUrl = absoluteHttpUrl(rawUrl);

/** False until the URL is set — the website links are then hidden. */
export const hasWebsiteUrl = baseUrl.length > 0;

/**
 * Each page's path on the site. These are the final URLs the booking site's
 * links redirect to (apex host, trailing slash), so no redirect is followed.
 */
export const WEBSITE_PAGES = {
  home: '',
  companyInfo: 'about-xyz/',
  ourServices: 'our-services/',
  ourPolicies: 'our-policies/',
  sampleRates: 'sample-rates/',
  servicesRates: 'services-rates/',
  rateBook: 'wp-content/uploads/XYZ_Rate_Book.pdf',
  downloadReceipt: 'download-receipt/',
  downloadInvoice: 'download-invoice/',
  customerService: 'contact-us/',
  openAccount: 'open-an-account/',
  complaint: 'complaint/',
  faqs: 'faqs/',
  driversJoin: 'drivers-join-xyz/',
  terms: 'terms-and-conditions/',
  privacy: 'privacy-policy/',
} as const;

export type WebsitePage = keyof typeof WEBSITE_PAGES;

/** Absolute URL of a website page. Only call it when `hasWebsiteUrl`. */
export function websiteUrl(page: WebsitePage): string {
  // A base without a trailing slash would drop its last segment on resolve.
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return new URL(WEBSITE_PAGES[page], base).toString();
}

if (__DEV__ && !hasWebsiteUrl) {
  console.warn(
    '[Website] The About, Rates, Contact Us and legal links are hidden — set EXPO_PUBLIC_WEBSITE_URL (an absolute URL) in .env, then restart Expo.',
  );
}
