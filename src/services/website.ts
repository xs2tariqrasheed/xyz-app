import * as WebBrowser from 'expo-web-browser';

import { websiteUrl, type WebsitePage } from '@/config/website';
import { WEBSITE_MESSAGES } from '@/constants/messages';
import { colors } from '@/theme';

/**
 * Opens a page outside the app: an in-app browser on iOS / Android, a new tab
 * on web. Call it straight from the press handler — mobile browsers block
 * `window.open` that comes too long after the tap.
 *
 * Resolves to `failureMessage` when the page could not be opened, else null.
 */
export async function openExternalUrl(url: string, failureMessage: string): Promise<string | null> {
  try {
    await WebBrowser.openBrowserAsync(url, {
      toolbarColor: colors.headerBg,
      controlsColor: colors.headerFg,
    });
    return null;
  } catch {
    return failureMessage;
  }
}

/** Opens a page of the marketing site (reverse-engineer-external-redirects/). */
export function openWebsitePage(page: WebsitePage): Promise<string | null> {
  return openExternalUrl(websiteUrl(page), WEBSITE_MESSAGES.OPEN_FAILED);
}
