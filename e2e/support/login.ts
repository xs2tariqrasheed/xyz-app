import { expect, type Page } from '@playwright/test';

import { testCredentials } from './credentials';

/** Fills the login form with the test account; the caller presses Log In. */
export async function fillLoginForm(page: Page): Promise<{ email: string }> {
  const { email, password } = testCredentials();

  await page.getByPlaceholder('you@example.com').fill(email);
  await page.locator('input[type="password"]').fill(password);

  // The check "verifies" for a moment before it counts; submitting earlier
  // fails validation.
  const humanCheck = page.getByRole('checkbox', { name: "I'm not a robot" });
  await humanCheck.click();
  await expect(humanCheck).toBeChecked();

  return { email };
}
