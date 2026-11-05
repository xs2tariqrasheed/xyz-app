import { expect, type FrameLocator, type Page } from '@playwright/test';

/**
 * The "I'm not a robot" box is Google's reCAPTCHA v2 widget. Runs use Google's
 * published test site key (set in e2e/e2e.local.env), whose checkbox always
 * passes without a challenge. The server-side verify call is answered here, so
 * a run needs no deployed `api/verify-recaptcha` function.
 */

/** The widget on screen — the stack keeps hidden screens (and their widgets) mounted. */
function widget(page: Page): FrameLocator {
  return page.locator('iframe[title="reCAPTCHA"]').filter({ visible: true }).first().contentFrame();
}

/** Ticks the box and waits until the app has had the token verified. */
export async function tickRecaptcha(page: Page): Promise<void> {
  const verifyUrl = process.env.EXPO_PUBLIC_RECAPTCHA_VERIFY_URL;
  if (!verifyUrl) throw new Error('Set EXPO_PUBLIC_RECAPTCHA_VERIFY_URL in e2e/e2e.local.env');
  await page.route(verifyUrl, (route) => route.fulfill({ json: { success: true, errorCodes: [] } }));

  const verified = page.waitForResponse(verifyUrl);
  const box = widget(page).getByRole('checkbox', { name: "I'm not a robot" });
  await box.click();
  await expect(box).toHaveAttribute('aria-checked', 'true');
  await verified;
}

/** After a refused submit the app resets the widget, so it must be ticked again. */
export async function expectRecaptchaUnticked(page: Page): Promise<void> {
  await expect(widget(page).getByRole('checkbox', { name: "I'm not a robot" })).toHaveAttribute('aria-checked', 'false');
}
