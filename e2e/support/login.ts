import type { Page } from '@playwright/test';

import { testCredentials } from './credentials';
import { tickRecaptcha } from './recaptcha';

/**
 * Fills the login form with the test account; the caller presses Log In.
 * `password` replaces the account's own, to try a wrong one.
 */
export async function fillLoginForm(
  page: Page,
  { password = testCredentials().password }: { password?: string } = {},
): Promise<{ email: string }> {
  const { email } = testCredentials();

  await page.getByPlaceholder('you@example.com').fill(email);
  await page.locator('input[type="password"]').fill(password);

  // The box counts only once its token is verified; submitting earlier fails
  // validation.
  await tickRecaptcha(page);

  return { email };
}
