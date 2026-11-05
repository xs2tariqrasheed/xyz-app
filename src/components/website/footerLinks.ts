import { WEBSITE_MESSAGES } from '@/constants/messages';

/** The booking site's footer: shown under the login, register and reset forms. */
export const AUTH_FOOTER_LINKS = [
  { label: WEBSITE_MESSAGES.TERMS, page: 'terms' },
  { label: WEBSITE_MESSAGES.PRIVACY, page: 'privacy' },
  { label: WEBSITE_MESSAGES.FAQS, page: 'faqs' },
  { label: WEBSITE_MESSAGES.CONTACT_US, page: 'customerService' },
] as const;

/** Legal links at the foot of the menu drawer. */
export const LEGAL_LINKS = [
  { label: WEBSITE_MESSAGES.TERMS, page: 'terms' },
  { label: WEBSITE_MESSAGES.PRIVACY, page: 'privacy' },
] as const;
