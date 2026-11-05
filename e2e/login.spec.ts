import { expect, test } from '@playwright/test';

import { ACTION_CODES } from '../src/constants/actionCodes';
import { sandboxClientIpLookup } from './support/clientIp';
import { gatewayRows, waitForGatewayAction } from './support/gateway';
import { fillLoginForm } from './support/login';
import { expectRecaptchaUnticked } from './support/recaptcha';

/**
 * Login against the real gateway (docs/XYZ_INTEGRATION_GUIDE.md §7, §10).
 * Read-only on the backend: only PROF.S.CHECK_LOGIN_CREDENTIALS and the
 * reads Home makes after it are sent.
 */

test.beforeEach(async ({ page }) => {
  await sandboxClientIpLookup(page);
  await page.goto('/login');
});

test('signs in with the test account and lands on Home', async ({ page }) => {
  await fillLoginForm(page);

  const loginResponse = waitForGatewayAction(page, ACTION_CODES.CHECK_LOGIN_CREDENTIALS);
  await page.getByRole('button', { name: 'Log In' }).click();

  const [result] = await gatewayRows(await loginResponse);
  expect(result?.o_code).toBe('0');
  // On success the procedure returns the profile's VIP number here.
  expect(result?.o_message.trim()).not.toBe('');

  await expect(page).toHaveURL(/\/$/);
});

test('shows the gateway’s refusal for a wrong password and stays on login', async ({ page }) => {
  await fillLoginForm(page, { password: `wrong-${Date.now()}` });

  const loginResponse = waitForGatewayAction(page, ACTION_CODES.CHECK_LOGIN_CREDENTIALS);
  await page.getByRole('button', { name: 'Log In' }).click();

  const [result] = await gatewayRows(await loginResponse);
  expect(result?.o_code).not.toBe('0');
  expect(result?.o_message).toBeTruthy();

  await expect(page.getByText(result.o_message, { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await expectRecaptchaUnticked(page);
});
