import { expect, type Page, type Response, test } from '@playwright/test';

import { ACTION_CODES } from '../src/constants/actionCodes';
import { sandboxClientIpLookup } from './support/clientIp';
import { contractParams } from './support/contract';
import { gatewayRows, waitForGatewayAction } from './support/gateway';
import { DESTINATION, GEOCODED, PICKUP, sandboxGoogleMaps } from './support/googleMaps';
import { fillLoginForm } from './support/login';

/**
 * The reservation module on Reservation 2 (`/reserver-2`) and the ride
 * screens, end to end against the real API gateway — today a stub that
 * answers with dummy rows. Every assertion reads its expected values from the
 * gateway's own responses or from docs/XYZ Action Codes.md, never from the
 * stub's sample data. Google Maps is sandboxed with fixtures.
 *
 * Nothing here enters a card: billing stays on the account on file. The
 * card-authorisation case runs only with E2E_CARD_TESTS=1, because it sends
 * a payment network's published test number to the gateway.
 */

const DEVICE_POSITION = { latitude: 40.7549, longitude: -73.984 };
test.use({ geolocation: DEVICE_POSITION, permissions: ['geolocation'] });

test.beforeEach(async ({ page }) => {
  await sandboxGoogleMaps(page);
  await sandboxClientIpLookup(page);
});

type Envelope = { ActionCode: string; JsonReq: { JData: Record<string, string | number> } };

function jDataOf(response: Response): Record<string, string | number> {
  return (response.request().postDataJSON() as Envelope).JsonReq.JData;
}

/** The request carried exactly the contract's parameters — none missing, none extra. */
function expectContract(response: Response, actionCode: string) {
  expect(Object.keys(jDataOf(response)).sort()).toEqual([...contractParams(actionCode)].sort());
}

/** Collects every gateway call the page makes, by action code. */
function recordGatewayCalls(page: Page): string[] {
  const codes: string[] = [];
  page.on('request', (request) => {
    if (request.method() !== 'POST') return;
    try {
      const code = (request.postDataJSON() as { ActionCode?: string } | null)?.ActionCode;
      if (code) codes.push(code);
    } catch {
      /* not a gateway call */
    }
  });
  return codes;
}

async function logIn(page: Page) {
  await page.goto('/login');
  await fillLoginForm(page);
  const profileCall = waitForGatewayAction(page, ACTION_CODES.LOAD_PROFILE);
  const savedCall = waitForGatewayAction(page, ACTION_CODES.USER_ADDRESSES);
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page).toHaveURL(/\/$/);
  const [profile] = await gatewayRows(await profileCall);
  const saved = await gatewayRows(await savedCall);
  return { profile, saved };
}

/** Labels repeat across the nav, the steps and the summary; take a visible one. */
function visibleText(page: Page, text: string, exact = true) {
  return page.getByText(text, { exact }).filter({ visible: true }).first();
}

async function continueTo(page: Page, nextTitle: string) {
  await page.getByRole('button', { name: /^(Continue|Checking)/ }).click();
  await expect(visibleText(page, nextTitle)).toBeVisible();
}

/** "666 5 Ave, Manhattan, NY 10019" — how a saved address row is offered. */
function savedLabel(row: Record<string, string>): string {
  const street = [row.building_num, row.street_name].filter(Boolean).join(' ');
  const locality = [row.city, [row.state, row.zip_code].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return street ? `${street}, ${locality}` : locality;
}

test('books a reservation on Reservation 2 through the gateway', async ({ page }) => {
  const { profile, saved } = await logIn(page);
  const calls = recordGatewayCalls(page);

  const vehicleTypesCall = waitForGatewayAction(page, ACTION_CODES.VEHICLE_TYPE);
  await page.getByRole('button', { name: 'Book a ride' }).first().click();
  await expect(page).toHaveURL(/\/reserver-2$/);
  const vehicleTypes = await gatewayRows(await vehicleTypesCall);
  expect(Object.keys(jDataOf(await vehicleTypesCall))).toEqual([]);

  // 1. Passenger — pre-filled from the profile the gateway returned.
  await expect(page.getByPlaceholder('e.g. Amara')).toHaveValue(profile.first_name);
  await expect(page.getByPlaceholder('e.g. Okafor')).toHaveValue(profile.last_name);
  await continueTo(page, 'Ride Address Info');

  // 2. Pickup from a saved address (zoned by street), drop-off from a Google search (zoned by coordinates).
  expect(saved.length).toBeGreaterThan(0);
  const pickupField = page.getByLabel('Pickup From', { exact: true });
  await pickupField.click();
  await expect(visibleText(page, 'Your places')).toBeVisible();
  const streetZone = waitForGatewayAction(page, ACTION_CODES.ZONE_THE_LOCATION);
  await page.getByRole('button', { name: savedLabel(saved[0]) }).click();
  const streetZoneCall = await streetZone;
  expectContract(streetZoneCall, ACTION_CODES.ZONE_THE_LOCATION);
  expect(jDataOf(streetZoneCall)).toMatchObject({ P_STREET_NAME: saved[0].street_name, P_PU_DO_TYPE: 'P' });

  const googleZone = waitForGatewayAction(page, ACTION_CODES.GOOGLE_ZONE_NUM);
  const destinationField = page.getByLabel('Going To', { exact: true });
  await destinationField.click();
  await destinationField.fill('JFK');
  await page.getByRole('button', { name: `${DESTINATION.primary}, ${DESTINATION.secondary}` }).click();
  const googleZoneCall = await googleZone;
  expectContract(googleZoneCall, ACTION_CODES.GOOGLE_ZONE_NUM);
  expect(jDataOf(googleZoneCall)).toMatchObject({ P_ZIP: '11430' });
  // The route is drawn on an interactive map the customer can zoom.
  await expect(page.locator('[data-e2e-map="ready"]')).toBeAttached();
  const zoomBefore = await page.evaluate(() => (window as unknown as { __e2eMap: { zoom: number } }).__e2eMap.zoom);
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await page.getByRole('button', { name: 'Zoom out' }).click();
  expect(await page.evaluate(() => (window as unknown as { __e2eMap: { zoom: number } }).__e2eMap.zoom)).toBe(zoomBefore + 1);

  // An airport drop-off offers the flight fields.
  await expect(page.getByLabel('Airline').filter({ visible: true }).first()).toBeVisible();

  // 3. Billing — the account on file, checked with the server.
  const billingMethod = waitForGatewayAction(page, ACTION_CODES.BILLING_METHOD);
  await continueTo(page, 'Billing Method');
  const billingMethodCall = await billingMethod;
  expectContract(billingMethodCall, ACTION_CODES.BILLING_METHOD);
  const account = String(jDataOf(billingMethodCall).P_ACCOUNT_NUM);
  expect(account).not.toBe('');

  const verify = waitForGatewayAction(page, ACTION_CODES.VERIFY_ACCOUNT_REQUIREMENTS);
  await continueTo(page, 'Preferences');
  const verifyCall = await verify;
  expectContract(verifyCall, ACTION_CODES.VERIFY_ACCOUNT_REQUIREMENTS);
  expect(jDataOf(verifyCall)).toMatchObject({ P_ACCOUNT_NUMBER: account, P_IS_RES: 'Y' });

  // 4. Preferences — the gateway's car types, the first one chosen.
  expect(vehicleTypes.length).toBeGreaterThan(0);
  await expect(page.getByRole('radio', { name: new RegExp(`^${vehicleTypes[0].car_type_name}\\b`) })).toBeChecked();
  await continueTo(page, 'Preview');

  // 5. Preview → book.
  await expect(visibleText(page, profile.last_name)).toBeVisible();
  const booking = waitForGatewayAction(page, ACTION_CODES.CREATE_RESERVATION);
  await page.getByRole('button', { name: 'Book reservation' }).click();
  const bookingCall = await booking;
  expectContract(bookingCall, ACTION_CODES.CREATE_RESERVATION);
  const sent = jDataOf(bookingCall);
  expect(sent).toMatchObject({
    P_FIRST_NAME: profile.first_name,
    P_LAST_NAME: profile.last_name,
    P_CALL_SOURCE: 'WEB',
    P_ACCOUNT_NUMBER: account,
    P_PU_STREET_NAME: saved[0].street_name,
    P_DO_AIRPORT_NAME: DESTINATION.primary,
    P_DO_ZIP_CODE: '11430',
    P_CAR_TYPE: vehicleTypes[0].car_type,
    P_CARD_NUMBER: '',
  });
  // A saved address arrives without coordinates; they are geocoded so dispatch gets them.
  expect(sent).toMatchObject({
    P_PICKUP_LAT: String(GEOCODED.lat),
    P_PICKUP_LON: String(GEOCODED.lng),
    P_PU_COUNTRY: 'US',
    P_DO_COUNTRY: 'US',
  });
  expect(String(sent.P_DROPOFF_LAT)).not.toBe('');
  expect(String(sent.P_RESERVATION_DATE)).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  expect(String(sent.P_RESERVATION_TIME)).toMatch(/^\d{2}:\d{2}$/);
  // A booking is sent once, never retried.
  expect(calls.filter((code) => code === ACTION_CODES.CREATE_RESERVATION)).toHaveLength(1);

  // 6. Receipt — the number the server issued, or none at all; never a made-up one.
  await expect(visibleText(page, 'Ride Receipt')).toBeVisible();
  const [result] = await gatewayRows(bookingCall);
  expect(result.o_code).toBe('0');
  const issued = result.o_reservation_num || result.reservation_num || '';
  if (issued) await expect(page.getByText(issued)).toBeVisible();
  else await expect(page.getByRole('link', { name: 'View upcoming rides' })).toBeVisible();
});

test('express checkout opens a zoned ready-now ride on the preview and books nothing', async ({ page }) => {
  const { saved } = await logIn(page);
  expect(saved.length).toBeGreaterThan(1);
  const calls = recordGatewayCalls(page);

  await page.getByRole('radiogroup', { name: 'Select your pickup location' })
    .getByRole('radio', { name: savedLabel(saved[0]) }).click();
  await page.getByRole('radiogroup', { name: 'Select your dropoff location' })
    .getByRole('radio', { name: savedLabel(saved[1]) }).click();

  await page.getByRole('button', { name: 'Express Checkout' }).click();
  await expect(page).toHaveURL(/\/reserver-2$/);
  await expect(visibleText(page, 'Preview')).toBeVisible();
  await expect(visibleText(page, 'LIVE CALL')).toBeVisible();
  await expect(visibleText(page, 'Live call — ready now')).toBeVisible();

  await expect.poll(() => calls.filter((code) => code === ACTION_CODES.ZONE_THE_LOCATION).length).toBe(2);
  expect(calls).not.toContain(ACTION_CODES.CREATE_RESERVATION);
});

test('lists open reservations and cancels one with a reason', async ({ page }) => {
  await logIn(page);
  const upcoming = waitForGatewayAction(page, ACTION_CODES.UPDATABLE_ORDERS);
  await page.goto('/rides');
  const upcomingCall = await upcoming;
  expectContract(upcomingCall, ACTION_CODES.UPDATABLE_ORDERS);
  const rows = await gatewayRows(upcomingCall);
  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) await expect(page.getByRole('button', { name: row.reservation_num }).first()).toBeVisible();

  // Cancel the first ride the list still offers to cancel.
  await page.getByRole('button', { name: /^Cancel( ride)?$/ }).first().click();
  await expect(visibleText(page, 'Cancel this reservation?')).toBeVisible();
  await page.getByRole('button', { name: 'Yes, cancel it' }).click();
  await expect(visibleText(page, 'Tell us why the ride is being cancelled.')).toBeVisible();

  await page.getByPlaceholder('e.g. Change of plans').fill('Plans changed');
  const cancel = waitForGatewayAction(page, ACTION_CODES.CANCEL_RESERVATION);
  await page.getByRole('button', { name: 'Yes, cancel it' }).click();
  const cancelCall = await cancel;
  expectContract(cancelCall, ACTION_CODES.CANCEL_RESERVATION);
  expect(jDataOf(cancelCall)).toMatchObject({ P_CANCEL_REASON: 'Plans changed' });
  expect(rows.map((row) => row.reservation_num)).toContain(jDataOf(cancelCall).P_RESERVATION_NUM);
  await expect(visibleText(page, 'The reservation has been cancelled.')).toBeVisible();
});

test('changes an open reservation and saves it with RES.U.RESERVATION', async ({ page }) => {
  await logIn(page);
  const upcoming = waitForGatewayAction(page, ACTION_CODES.UPDATABLE_ORDERS);
  await page.goto('/rides');
  await upcoming;

  const load = waitForGatewayAction(page, ACTION_CODES.LOAD_RESERVATION);
  await page.getByRole('button', { name: /^Modify( ride)?$/ }).first().click();
  const loadCall = await load;
  expectContract(loadCall, ACTION_CODES.LOAD_RESERVATION);
  const [record] = await gatewayRows(loadCall);
  await expect(page).toHaveURL(/\/reserver-2$/);
  await expect(visibleText(page, 'Change reservation')).toBeVisible();
  await expect(page.getByPlaceholder('e.g. Okafor')).toHaveValue(record.last_name);

  // Walk the steps; answer whatever the record leaves required and blank.
  await continueTo(page, 'Ride Address Info');
  const pickupOption = page.getByRole('button', { name: /^Pickup option: Select$/ });
  if (await pickupOption.isVisible()) {
    await pickupOption.click();
    await page.getByRole('radio', { name: 'Outside the terminal' }).click();
    await page.getByRole('button', { name: 'Apply' }).click();
  }
  await continueTo(page, 'Billing Method');
  await continueTo(page, 'Preferences');
  await continueTo(page, 'Preview');

  const update = waitForGatewayAction(page, ACTION_CODES.UPDATE_RESERVATION);
  const email = waitForGatewayAction(page, ACTION_CODES.FORMAT_EMAIL_MESSAGE);
  await page.getByRole('button', { name: 'Save changes' }).click();
  const updateCall = await update;
  expectContract(updateCall, ACTION_CODES.UPDATE_RESERVATION);
  expect(jDataOf(updateCall)).toMatchObject({
    P_RESERVATION_NUM: record.reservation_num,
    P_LAST_NAME: record.last_name,
  });
  // A card kept on file goes back masked — never a full number.
  expect(String(jDataOf(updateCall).P_CARD_NUMBER)).not.toMatch(/^\d{13,19}$/);

  const emailCall = await email;
  expectContract(emailCall, ACTION_CODES.FORMAT_EMAIL_MESSAGE);
  expect(jDataOf(emailCall).P_RES1).toBe(record.reservation_num);
  expect(String(jDataOf(emailCall).P_CC_NUMBER1)).toMatch(/^(\*{12}\d{4})?$/);

  await expect(visibleText(page, 'Your reservation has been updated.', false)).toBeVisible();
});

test('opens a ride from history: details, messages, tracking, voucher, return trip and a question', async ({ page }) => {
  await logIn(page);
  await page.goto('/rides');
  const history = waitForGatewayAction(page, ACTION_CODES.ALL_ORDERS);
  await page.getByRole('tab', { name: 'History' }).click();
  const historyCall = await history;
  expectContract(historyCall, ACTION_CODES.ALL_ORDERS);
  expect(typeof jDataOf(historyCall).P_TOTAL_RECORDS).toBe('number');
  const rides = await gatewayRows(historyCall);
  expect(rides.length).toBeGreaterThan(0);

  // Details of the newest ride in the default range (the last three months up to today).
  const newest = rides
    .filter((ride) => Date.parse(ride.pickup_date) <= Date.now())
    .sort((a, b) => Date.parse(b.pickup_date) - Date.parse(a.pickup_date))[0];
  expect(newest).toBeTruthy();
  const details = waitForGatewayAction(page, ACTION_CODES.LOAD_RESERVATION);
  const messages = waitForGatewayAction(page, ACTION_CODES.COMMUNICATION_LOG);
  const extra = waitForGatewayAction(page, ACTION_CODES.LOAD_RESERVATION_COLUMN_SINGLE_VALUE);
  await page.getByRole('button', { name: newest.reservation_num }).first().click();
  await expect(page).toHaveURL(/\/reservation-info/);
  expectContract(await details, ACTION_CODES.LOAD_RESERVATION);
  expectContract(await messages, ACTION_CODES.COMMUNICATION_LOG);
  expectContract(await extra, ACTION_CODES.LOAD_RESERVATION_COLUMN_SINGLE_VALUE);
  const [record] = await gatewayRows(await details);
  await expect(visibleText(page, record.reservation_num)).toBeVisible();

  // Ask about this ride: the predefined questions load with the sheet.
  const questions = waitForGatewayAction(page, ACTION_CODES.ALL_PREDEFINED_QUESTIONS);
  await page.getByRole('button', { name: 'Ask about this ride' }).click();
  expectContract(await questions, ACTION_CODES.ALL_PREDEFINED_QUESTIONS);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  // Return trip: a new booking with the two ends swapped.
  if (await page.getByRole('button', { name: 'Book return trip' }).isVisible()) {
    await page.getByRole('button', { name: 'Book return trip' }).click();
    await expect(page).toHaveURL(/\/reserver-2$/);
    await expect(visibleText(page, 'Make a reservation')).toBeVisible();
    await page.goBack();
  }

  // Tracking and the voucher, opened directly for the same ride.
  const log = waitForGatewayAction(page, ACTION_CODES.VEHICLE_LOG);
  await page.goto(`/track-ride?rideno=${encodeURIComponent(record.reservation_num)}`);
  expectContract(await log, ACTION_CODES.VEHICLE_LOG);
  await expect(visibleText(page, 'Route detail')).toBeVisible();

  const voucher = waitForGatewayAction(page, ACTION_CODES.LOAD_RESERVATION);
  await page.goto(`/voucher?rideno=${encodeURIComponent(record.reservation_num)}`);
  await voucher;
  await expect(visibleText(page, 'Voucher')).toBeVisible();
});

test('authorises a card before booking with it', async ({ page }) => {
  test.skip(process.env.E2E_CARD_TESTS !== '1', 'Set E2E_CARD_TESTS=1 to send a published test card number to the gateway.');
  await logIn(page);
  await page.getByRole('button', { name: 'Book a ride' }).first().click();
  await continueTo(page, 'Ride Address Info');

  for (const [label, query, place] of [
    ['Pickup From', '350 5th', PICKUP],
    ['Going To', 'JFK', DESTINATION],
  ] as const) {
    const field = page.getByLabel(label, { exact: true });
    await field.click();
    await field.fill(query);
    await page.getByRole('button', { name: `${place.primary}, ${place.secondary}` }).click();
  }
  await continueTo(page, 'Billing Method');

  await page.getByRole('radio', { name: /^Credit card/ }).click();
  await page.getByPlaceholder('e.g. Amara Okafor').fill('Test Rider');
  await page.getByLabel('Card number').fill('4111111111111111');
  await page.getByLabel('Expiry').fill('1230');
  await page.getByLabel('Security code').fill('123');
  await page.getByLabel('Billing ZIP / postal code').fill('10001');

  const approval = waitForGatewayAction(page, ACTION_CODES.START_CREDIT_CARD_APPROVAL);
  await continueTo(page, 'Preferences');
  const approvalCall = await approval;
  expectContract(approvalCall, ACTION_CODES.START_CREDIT_CARD_APPROVAL);
  expect(jDataOf(approvalCall)).toMatchObject({ P_CARD_TYPE: 'VISA', P_EXPIRATION_DATE: '12/2030' });
});
