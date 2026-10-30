import { expect, type Page, test } from '@playwright/test';

import { ACTION_CODES } from '../src/constants/actionCodes';
import { sandboxClientIpLookup, TEST_CLIENT_IP } from './support/clientIp';
import { gatewayRows, waitForGatewayAction } from './support/gateway';
import { sandboxGoogleMaps } from './support/googleMaps';
import { fillLoginForm } from './support/login';

/**
 * Protected-page redirect → login → Home greeting → log out.
 *
 * Login and the profile read go through the real API gateway (both are
 * read-only on its side). Google Maps is sandboxed with fixtures.
 */

/** Where the test browser reports itself to be (Midtown Manhattan). */
const DEVICE_POSITION = { latitude: 40.7549, longitude: -73.984 };

test.use({ geolocation: DEVICE_POSITION, permissions: ['geolocation'] });

test.beforeEach(async ({ page }) => {
  await sandboxGoogleMaps(page);
  await sandboxClientIpLookup(page);
});

test('signs in, greets the customer from the profile and logs out', async ({ page }) => {
  // A protected page sends a signed-out visitor to login.
  await page.goto('/reserver-2');
  await expect(page).toHaveURL(/\/login$/);

  // ── Log in ──────────────────────────────────────────────────────────────
  const { email } = await fillLoginForm(page);

  const loginResponse = waitForGatewayAction(page, ACTION_CODES.CHECK_LOGIN_CREDENTIALS);
  const profileResponse = waitForGatewayAction(page, ACTION_CODES.LOAD_PROFILE);
  await page.getByRole('button', { name: 'Log In' }).click();

  const login = await loginResponse;
  const envelope = login.request().postDataJSON() as GatewayEnvelope;
  expect(envelope).toMatchObject({
    ActionCode: ACTION_CODES.CHECK_LOGIN_CREDENTIALS,
    ViewName: envelope.JsonReq.JHeader.ViewName,
    ClientIP: TEST_CLIENT_IP,
    JsonReq: {
      JHeader: {
        ActionCode: ACTION_CODES.CHECK_LOGIN_CREDENTIALS,
        Client: process.env.EXPO_PUBLIC_DBAPI_CLIENT ?? '',
        Source: process.env.EXPO_PUBLIC_DBAPI_SOURCE,
        Target: process.env.EXPO_PUBLIC_DBAPI_TARGET,
        DeviceType: 'Web',
        ClientVersion: process.env.EXPO_PUBLIC_DBAPI_CLIENT_VERSION,
        APIVersion: process.env.EXPO_PUBLIC_DBAPI_API_VERSION ?? '',
        APILogin: process.env.EXPO_PUBLIC_DBAPI_LOGIN,
        RequestedURL: process.env.EXPO_PUBLIC_DBAPI_REQUESTED_URL ?? '',
        Debug: 'false',
        // No coordinates in the login JData, so the device position is used.
        GPSLatitude: String(DEVICE_POSITION.latitude),
        GPSLongitude: String(DEVICE_POSITION.longitude),
        GPSSpeed: '',
        GPSBearing: '',
      },
      JMetaData: {},
      JData: { P_LOGIN_ID: email.toLowerCase() },
    },
  });
  const header = envelope.JsonReq.JHeader;
  expect(header.APIPassword).toBe(process.env.EXPO_PUBLIC_DBAPI_PASSWORD);
  expect(header.DeviceID).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(header.DeviceInfo).not.toBe('');
  expect(Object.values(header).every((value) => typeof value === 'string')).toBe(true);
  const [loginResult] = await gatewayRows(login);
  expect(loginResult?.o_code).toBe('0');

  await expect(page).toHaveURL(/\/$/);

  // The greeting comes from the profile the gateway returned for this login.
  const profileCall = await profileResponse;
  // One install id for every call from this device.
  expect((profileCall.request().postDataJSON() as GatewayEnvelope).JsonReq.JHeader.DeviceID).toBe(
    header.DeviceID,
  );
  const [profile] = await gatewayRows(profileCall);
  expect(profile?.first_name).toBeTruthy();
  await expect(page.getByText(`Welcome back, ${profile.first_name}`)).toBeVisible();

  // ── Log out ─────────────────────────────────────────────────────────────
  await logOut(page);
  await expect(page).toHaveURL(/\/login$/);
});

type GatewayEnvelope = {
  ActionCode: string;
  ViewName: string;
  ClientIP: string;
  JsonReq: { JHeader: Record<string, unknown>; JMetaData: object; JData: object };
};

/** The header shows Log out inline on wide screens, in the drawer otherwise. */
async function logOut(page: Page) {
  const menu = page.getByRole('button', { name: 'Open menu' });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('button', { name: 'Log out' }).click();
}
