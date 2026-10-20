import type { Page } from '@playwright/test';

import { testCredentials } from './credentials';
import { tickRecaptcha } from './recaptcha';

/** Fills the login form with the test account; the caller presses Log In. */
export async function fillLoginForm(page: Page): Promise<{ email: string }> {
  const { email, password } = testCredentials();

  await page.getByPlaceholder('you@example.com').fill(email);
  await page.locator('input[type="password"]').fill(password);

  // The box counts only once its token is verified; submitting earlier fails
  // validation.
  await tickRecaptcha(page);

  return { email };
}
