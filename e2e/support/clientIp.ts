import type { Page } from '@playwright/test';

/** Documentation-range address (RFC 5737) the IP lookup answers with. */
export const TEST_CLIENT_IP = '203.0.113.10';

/** Answers the public-IP lookup locally, so a run never calls the real service. */
export async function sandboxClientIpLookup(page: Page): Promise<void> {
  const url = process.env.EXPO_PUBLIC_CLIENT_IP_LOOKUP_URL;
  if (!url) return;
  const { origin } = new URL(url);
  await page.route(`${origin}/**`, (route) => route.fulfill({ json: { ip: TEST_CLIENT_IP } }));
}
