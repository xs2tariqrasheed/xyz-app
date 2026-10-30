import { expect, type Page, test } from '@playwright/test';

import { ACTION_CODES } from '../src/constants/actionCodes';
import { MAILING_ADDRESS_MESSAGES, PROFILE_MESSAGES } from '../src/constants/messages';
import { sandboxClientIpLookup } from './support/clientIp';
import { gatewayRows, waitForGatewayAction } from './support/gateway';
import { sandboxGoogleMaps } from './support/googleMaps';
import { fillLoginForm } from './support/login';

/**
 * Personal Info and Update Mailing Address against the real gateway
 * (reverse-engineer-implemented/guide/07, 08; docs/XYZ_INTEGRATION_GUIDE.md §10).
 *
 * `PROF.S.LOAD_PROFILE` is read for real. `PROF.U.PROFILE` must never leave
 * the app while that response has values past its last heading: any that
 * does is intercepted (never reaching the gateway) and fails the test.
 *
 * Today's `first_name` heading pairs with the password, so values are
 * compared without being printed.
 */

test.beforeEach(async ({ page }) => {
  await sandboxGoogleMaps(page);
  await sandboxClientIpLookup(page);
});

test('shows Personal Info as LOAD_PROFILE pairs it, validates, and refuses the update', async ({ page }) => {
  const updates = await interceptProfileUpdates(page);
  const profile = await logIn(page);

  await page.goto('/profile');
  const firstName = page.getByRole('textbox', { name: PROFILE_MESSAGES.FIRST_NAME_LABEL, exact: true });
  const lastName = page.getByRole('textbox', { name: PROFILE_MESSAGES.LAST_NAME_LABEL, exact: true });
  const usPhone = page.getByRole('textbox', { name: PROFILE_MESSAGES.US_PHONE_LABEL, exact: true });
  await expect(lastName).toBeVisible();

  // Each field shows what its own heading pairs with (shifted today, §10).
  expect((await firstName.inputValue()) === profile.first_name.trim(), 'first name = first_name').toBe(true);
  expect((await lastName.inputValue()) === profile.last_name.trim(), 'last name = last_name').toBe(true);

  // Module 07 validation: an empty last name is refused on the client.
  await lastName.fill('');
  await page.getByRole('button', { name: PROFILE_MESSAGES.UPDATE, exact: true }).click();
  await expect(page.getByText(PROFILE_MESSAGES.LAST_NAME_REQUIRED)).toBeVisible();

  // Malformed input is refused too, before anything is sent.
  await lastName.fill('Doe2');
  await usPhone.fill('1125550100');
  await expect(page.getByText(PROFILE_MESSAGES.LAST_NAME_INVALID)).toBeVisible();
  await expect(page.getByText(PROFILE_MESSAGES.US_PHONE_INVALID)).toBeVisible();

  // A valid form is still not sent: LOAD_PROFILE has values past its last heading.
  await firstName.fill('');
  await lastName.fill('Doe');
  await usPhone.fill('2125550100');
  await page.getByRole('button', { name: PROFILE_MESSAGES.UPDATE, exact: true }).click();
  await expect(page.getByText(PROFILE_MESSAGES.UPDATE_UNAVAILABLE)).toBeVisible();
  expect(updates).toHaveLength(0);
});

test('Update Mailing Address shows "not available" without address headings', async ({ page }) => {
  const updates = await interceptProfileUpdates(page);
  await logIn(page);

  await page.goto('/mailing-address');
  await expect(page.getByText(MAILING_ADDRESS_MESSAGES.UNAVAILABLE)).toBeVisible();
  expect(updates).toHaveLength(0);
});

/** Signs in with the test login and returns its `LOAD_PROFILE` row, by heading. */
async function logIn(page: Page): Promise<Record<string, string>> {
  await page.goto('/login');
  await fillLoginForm(page);
  const profileResponse = waitForGatewayAction(page, ACTION_CODES.LOAD_PROFILE);
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page).toHaveURL(/\/$/);
  const [profile] = await gatewayRows(await profileResponse);
  expect(profile, 'LOAD_PROFILE returned a row').toBeDefined();
  return profile;
}

/** Answers any `PROF.U.PROFILE` locally, so it never reaches the gateway, and records it. */
async function interceptProfileUpdates(page: Page): Promise<unknown[]> {
  const calls: unknown[] = [];
  await page.route(
    (url) => url.href.startsWith(process.env.EXPO_PUBLIC_DBAPI_URL ?? '\0'),
    async (route) => {
      const envelope = route.request().postDataJSON() as { ActionCode?: string } | null;
      if (envelope?.ActionCode !== ACTION_CODES.UPDATE_PROFILE) {
        await route.continue();
        return;
      }
      calls.push(envelope);
      await route.fulfill({
        json: {
          JHeader: { ActionCode: 0, Message: 'Intercepted by the spec' },
          JMetaData: { Headings: ['o_code', 'o_message'] },
          JData: [['1', 'Intercepted by the spec']],
        },
      });
    },
  );
  return calls;
}
