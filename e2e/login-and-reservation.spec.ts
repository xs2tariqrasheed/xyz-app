import { expect, type Page, test } from '@playwright/test';

import { ACTION_CODES } from '../src/constants/actionCodes';
import { sandboxClientIpLookup, TEST_CLIENT_IP } from './support/clientIp';
import { gatewayRows, waitForGatewayAction } from './support/gateway';
import { DESTINATION, PICKUP, sandboxGoogleMaps } from './support/googleMaps';
import { fillLoginForm } from './support/login';

/**
 * Login → book a reservation → booking confirmation.
 *
 * Login and the profile read go through the real API gateway (both are
 * read-only stubs on its side). Google Maps is sandboxed with fixtures, and
 * billing stays on the corporate account, so no card is ever entered.
 */

const PASSENGER = { firstName: 'Erin', lastName: 'Tester' };

/** Where the test browser reports itself to be (Midtown Manhattan). */
const DEVICE_POSITION = { latitude: 40.7549, longitude: -73.984 };

test.use({ geolocation: DEVICE_POSITION, permissions: ['geolocation'] });

test.beforeEach(async ({ page }) => {
  await sandboxGoogleMaps(page);
  await sandboxClientIpLookup(page);
});

test('signs in, books a reservation and reaches the receipt', async ({ page }) => {
  // A protected page sends a signed-out visitor to login.
  await page.goto('/reserve');
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

  // ── Reservation ("checkout") on the original, unwired layout ─────────────
  // Home's "Book a ride" opens Reservation 2 (e2e/reservation-2.spec.ts);
  // this layout stays reachable from the menu.
  await page.goto('/reserve');
  await expect(page).toHaveURL(/\/reserve$/);

  // 1. Passenger & ride info
  await page.getByPlaceholder('e.g. Amara').fill(PASSENGER.firstName);
  await page.getByPlaceholder('e.g. Okafor').fill(PASSENGER.lastName);
  await continueTo(page, 'Ride Address Info');

  // 2. Addresses
  await chooseAddress(page, 'Pickup From', '350 5th', PICKUP);
  await chooseAddress(page, 'Going To', 'JFK', DESTINATION);
  await continueTo(page, 'Billing Method');

  // 3. Billing: the corporate account on file — no card details.
  await continueTo(page, 'Preferences');

  // 4. Preferences: defaults.
  await continueTo(page, 'Preview');

  // 5. Review shows what was entered.
  await expect(visibleText(page, PASSENGER.firstName, true)).toBeVisible();
  await expect(visibleText(page, PASSENGER.lastName, true)).toBeVisible();
  await expect(visibleText(page, PICKUP.primary)).toBeVisible();
  await expect(visibleText(page, DESTINATION.primary)).toBeVisible();

  await page.getByRole('button', { name: /^Book and Continue/ }).click();

  // 6. Booking confirmation
  await expect(sectionTitle(page, 'Ride Receipt')).toBeVisible();
  await expect(page.getByText(/your reservation number is\s+W\d{10}/i)).toBeVisible();

  // ── Log out ─────────────────────────────────────────────────────────────
  await logOut(page);
  await expect(page).toHaveURL(/\/login$/);
});

/** Labels repeat across the nav, step rail and hidden layouts; take a visible one. */
function visibleText(page: Page, text: string, exact = false) {
  return page.getByText(text, { exact }).filter({ visible: true }).first();
}

type GatewayEnvelope = {
  ActionCode: string;
  ViewName: string;
  ClientIP: string;
  JsonReq: { JHeader: Record<string, unknown>; JMetaData: object; JData: object };
};

function sectionTitle(page: Page, title: string) {
  return visibleText(page, title, true);
}

async function continueTo(page: Page, nextTitle: string) {
  await page.getByRole('button', { name: /^Continue/ }).click();
  await expect(sectionTitle(page, nextTitle)).toBeVisible();
}

async function chooseAddress(
  page: Page,
  label: string,
  query: string,
  place: { primary: string; secondary: string },
) {
  const field = page.getByLabel(label, { exact: true });
  await field.click();
  await field.fill(query);
  await page.getByRole('button', { name: `${place.primary}, ${place.secondary}` }).click();
  await expect(field).toHaveValue(new RegExp(place.primary));
}

/** The header shows Log out inline on wide screens, in the drawer otherwise. */
async function logOut(page: Page) {
  const menu = page.getByRole('button', { name: 'Open menu' });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('button', { name: 'Log out' }).click();
}
