import { expect, test } from '@playwright/test';

import { ACTION_CODES } from '../src/constants/actionCodes';
import { waitForGatewayAction } from './support/gateway';
import { fillLoginForm } from './support/login';

/**
 * With no location permission and the IP service down, the JHeader still
 * carries the documented fallbacks (docs/DM.md §4) and login still works.
 */

test.use({ permissions: [] });

test('falls back to configured GPS and 0.0.0.0 when location and IP are unavailable', async ({
  page,
}) => {
  const ipLookup = process.env.EXPO_PUBLIC_CLIENT_IP_LOOKUP_URL;
  if (ipLookup) {
    await page.route(`${new URL(ipLookup).origin}/**`, (route) => route.fulfill({ status: 503 }));
  }

  await page.goto('/login');
  await fillLoginForm(page);

  const loginResponse = waitForGatewayAction(page, ACTION_CODES.CHECK_LOGIN_CREDENTIALS);
  await page.getByRole('button', { name: 'Log In' }).click();
  const login = await loginResponse;

  const { ClientIP, JsonReq } = login.request().postDataJSON() as {
    ClientIP: string;
    JsonReq: { JHeader: Record<string, string> };
  };
  expect(ClientIP).toBe('0.0.0.0');
  expect(JsonReq.JHeader.GPSLatitude).toBe(process.env.EXPO_PUBLIC_JHEADER_FALLBACK_LAT ?? '0');
  expect(JsonReq.JHeader.GPSLongitude).toBe(process.env.EXPO_PUBLIC_JHEADER_FALLBACK_LNG ?? '0');

  await expect(page).toHaveURL(/\/$/);
});
