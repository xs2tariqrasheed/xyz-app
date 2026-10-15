import { expect, type Locator, type Page, test } from '@playwright/test';

import { ACTION_CODES, type ActionCode } from '../src/constants/actionCodes';
import { sandboxClientIpLookup } from './support/clientIp';
import { gatewayRows, waitForGatewayAction } from './support/gateway';

/**
 * Login → Create an account → three-step registration wizard.
 *
 * The read-only lookups (unique email, company name, VIP, account
 * requirements) go through the real API gateway. `PROF.I.PROFILE` is
 * intercepted, so a run never creates a profile: the test checks the request
 * the app built and answers it itself. A test can also answer a lookup
 * itself, for answers the gateway stub cannot give (an account with
 * requirement fields, a refused account).
 */

/** Every parameter of PROF.I.PROFILE (docs/XYZ Action Codes.md). */
const PROFILE_PARAMETERS = [
  'P_LOGIN_ID', 'P_PASSWORD', 'P_CONFIRM_PASSWORD', 'P_FIRST_NAME', 'P_LAST_NAME',
  'P_PHONE_NUMBER', 'P_PHONE_EXT', 'P_PHONE_NUMBER_US', 'P_PHONE_EXT_US', 'P_FAX',
  'P_COUNTRY', 'P_STATE', 'P_CITY', 'P_ZIP', 'P_BUILDING_NUM', 'P_STREET_NAME',
  'P_CROSS_STREET1', 'P_CROSS_STREET2', 'P_ADDRESS_PHONE', 'P_ADDRESS_PHONE_US',
  'P_ADDRESS_TYPE', 'P_PAYMENT_TYPE', 'P_ACCOUNT_NUM', 'P_VIP_NUM', 'P_CC_TYPE',
  'P_CARD_HOLDER_NAME', 'P_CARD_NUMBER', 'P_VERIFY_CODE', 'P_CC_MONTH', 'P_CC_YEAR',
  'P_ACCOUNT_REQ1', 'P_ACCOUNT_REQ2', 'P_ACCOUNT_REQ3', 'P_ACCOUNT_REQ4',
  'P_CONFIRMATION_METHOD', 'P_PREFERRED_FLEET', 'P_CAR_YEAR', 'P_CAR_PHONE',
  'P_SPECIAL_OFFER', 'P_SMOKING_CAR', 'P_IVR_PIN',
];

/** The payment provider's published Visa test number. */
const TEST_CARD = '4111111111111111';
const PASSWORD = 'P@ssw0rd!2026';
const ACCOUNT = { number: 'ACCT10023', name: 'Acme Corp', vip: 'VIP4521' };

/**
 * The stack keeps the login screen mounted (hidden) under /register, so
 * lookups are limited to what is on screen.
 */
function visible(locator: Locator): Locator {
  return locator.filter({ visible: true });
}

function field(page: Page, label: string): Locator {
  return visible(page.getByLabel(label, { exact: true }));
}

type GatewayEnvelope = { ActionCode: string; JsonReq: { JData: Record<string, string> } };

/** The `JMetaData.Headings` + `JData` part of a gateway answer. */
type GatewayTable = { headings: string[]; rows: string[][] };

type ProfileInterceptor = {
  /** What the next PROF.I.PROFILE call is answered with. */
  answer: { o_code: string; o_message: string };
  /** Lookups answered with these tables instead of reaching the gateway. */
  lookups: Partial<Record<ActionCode, GatewayTable>>;
  /** Action code of every call the app made, in order, whoever answered it. */
  sent: string[];
  /** JData of every intercepted PROF.I.PROFILE call, oldest first. */
  calls: Record<string, string>[];
  /** JData of every call that went on to the real gateway. */
  forwarded: GatewayEnvelope[];
};

/**
 * Answers PROF.I.PROFILE, and any lookup given in `lookups`, in the browser;
 * every other action reaches the gateway.
 */
async function interceptCreateProfile(page: Page): Promise<ProfileInterceptor> {
  const gatewayUrl = process.env.EXPO_PUBLIC_DBAPI_URL;
  if (!gatewayUrl) throw new Error('EXPO_PUBLIC_DBAPI_URL is not set (.env).');

  const interceptor: ProfileInterceptor = {
    answer: { o_code: '0', o_message: 'Profile created' },
    lookups: {},
    sent: [],
    calls: [],
    forwarded: [],
  };

  await page.route(
    (url) => url.href.startsWith(gatewayUrl),
    async (route) => {
      const envelope = route.request().postDataJSON() as GatewayEnvelope | null;
      const answer = (table: GatewayTable) =>
        route.fulfill({
          json: {
            JHeader: { ActionCode: 0, Message: 'Request is parsed and response is generated successfully' },
            JMetaData: { Headings: table.headings },
            JData: table.rows,
          },
        });

      if (envelope) interceptor.sent.push(envelope.ActionCode);

      if (envelope?.ActionCode === ACTION_CODES.CREATE_PROFILE) {
        interceptor.calls.push(envelope.JsonReq.JData);
        await answer({
          headings: ['o_code', 'o_message'],
          rows: [[interceptor.answer.o_code, interceptor.answer.o_message]],
        });
        return;
      }
      const lookup = envelope && interceptor.lookups[envelope.ActionCode as ActionCode];
      if (lookup) {
        await answer(lookup);
        return;
      }
      if (envelope) interceptor.forwarded.push(envelope);
      await route.continue();
    },
  );

  return interceptor;
}

/** A login that has never been registered, so each run starts clean. */
function uniqueEmail(): string {
  return `E2E.Register+${Date.now()}@Example.com`;
}

/** JData the app sent for the response's request. */
function jDataOf(response: Awaited<ReturnType<typeof waitForGatewayAction>>): Record<string, string> {
  return (response.request().postDataJSON() as GatewayEnvelope).JsonReq.JData;
}

/** Login → register link, then step 1 (with its validation) and step 2. */
async function completeAccountAndAddress(page: Page, email: string) {
  await page.goto('/login');
  await page.getByRole('link', { name: 'Create an account' }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByText('Account & Personal Info')).toBeVisible();

  // ── Step 1: Account & Personal Info ──────────────────────────────────────
  // Next on an empty step shows what is missing and stays put.
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Enter your email address.')).toBeVisible();
  await expect(page.getByText('Choose a password.')).toBeVisible();
  await expect(page.getByText('Enter your first name.')).toBeVisible();
  await expect(page.getByText('Add a callback number — US or international.')).toBeVisible();

  await field(page, 'Email address').fill(email);
  await field(page, 'Confirm email').fill(email);
  await field(page, 'Password').fill(PASSWORD);
  await field(page, 'Confirm password').fill(`${PASSWORD}x`);
  await field(page, 'First name').fill('John');
  await field(page, 'Last name').fill('Doe');
  await field(page, 'Callback phone (US)').fill('2125551234');
  await field(page, 'Callback phone (US) extension').fill('101');
  // PROF.I.PROFILE has nowhere to keep a fax extension, so none is asked for.
  await expect(field(page, 'Fax')).toBeVisible();
  await expect(field(page, 'Fax extension')).toHaveCount(0);

  // A mismatched confirmation is caught before anything is sent.
  await expect(page.getByText("The passwords don't match.")).toBeVisible();
  await field(page, 'Confirm password').fill(PASSWORD);
  await expect(page.getByText("The passwords don't match.")).toBeHidden();

  const uniqueEmailResponse = waitForGatewayAction(page, ACTION_CODES.IS_UNIQUE_EMAIL);
  await page.getByRole('button', { name: 'Next' }).click();
  const emailCheck = await uniqueEmailResponse;
  expect(jDataOf(emailCheck)).toEqual({ P_LOGIN_ID: email.toLowerCase() });
  expect((await gatewayRows(emailCheck))[0]?.o_code).toBe('0');

  // ── Step 2: Mailing Address ──────────────────────────────────────────────
  // Each step opens scrolled to its top, heading in view.
  await expect(page.getByText('Mailing Address', { exact: true })).toBeInViewport();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Pick a state.')).toBeVisible();

  await page.getByRole('button', { name: /^State:/ }).click();
  await field(page, 'Search State').fill('New York');
  await page.getByRole('radio', { name: 'New York', exact: true }).click();
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByRole('button', { name: 'State: New York' })).toBeVisible();
  await field(page, 'City').fill('New York');
  await field(page, 'ZIP').fill('10001');
  await field(page, 'Building no.').fill('350');
  await field(page, 'Street name').fill('5th Ave');
  await field(page, 'Cross street').fill('34th St');
  await field(page, 'Apt # / Mail stop').fill('Suite 200');
  await field(page, 'Phone at this address (US)').fill('2125559876');

  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Billing Info', { exact: true })).toBeInViewport();
}

async function tickHumanCheck(page: Page) {
  // The check "verifies" for a moment before it counts.
  const humanCheck = visible(page.getByRole('checkbox', { name: "I'm not a robot" }));
  await humanCheck.click();
  await expect(humanCheck).toBeChecked();
}

/** Values every profile in these tests shares, whatever the billing choice. */
function expectedPersonAndAddress(email: string): Record<string, string> {
  return {
    P_LOGIN_ID: email.toLowerCase(),
    P_PASSWORD: PASSWORD,
    P_CONFIRM_PASSWORD: PASSWORD,
    P_FIRST_NAME: 'John',
    P_LAST_NAME: 'Doe',
    P_PHONE_NUMBER: '',
    P_PHONE_EXT: '',
    P_PHONE_NUMBER_US: '2125551234',
    P_PHONE_EXT_US: '101',
    P_FAX: '',
    P_COUNTRY: 'US',
    P_STATE: 'NY',
    P_CITY: 'New York',
    P_ZIP: '10001',
    P_BUILDING_NUM: '350',
    P_STREET_NAME: '5th Ave',
    P_CROSS_STREET1: '34th St',
    P_CROSS_STREET2: 'Suite 200',
    P_ADDRESS_PHONE: '',
    P_ADDRESS_PHONE_US: '2125559876',
    P_ADDRESS_TYPE: 'H',
  };
}

/** What a profile carries when no car preference was filled in. */
const NO_CAR_PREFERENCES = {
  P_PREFERRED_FLEET: '',
  P_CAR_YEAR: '',
  P_CAR_PHONE: '',
  P_SMOKING_CAR: 'N',
  P_IVR_PIN: '',
};

const NO_ACCOUNT_REQUIREMENTS = {
  P_ACCOUNT_REQ1: '',
  P_ACCOUNT_REQ2: '',
  P_ACCOUNT_REQ3: '',
  P_ACCOUNT_REQ4: '',
};

// Each run walks the whole wizard with up to six real gateway round trips;
// on a busy machine that brushes the default two-minute budget.
test.describe.configure({ timeout: 180_000 });

test.beforeEach(async ({ page }) => {
  await sandboxClientIpLookup(page);
});

test('registers with a corporate account and returns to login', async ({ page }) => {
  const profile = await interceptCreateProfile(page);
  const email = uniqueEmail();

  await completeAccountAndAddress(page, email);

  // ── Step 3: Billing Info (corporate account is the default) ──────────────
  // Car preferences are optional, but half-filled ones are caught.
  await field(page, 'Car year').fill('19');
  await field(page, 'IVR PIN').fill('45');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Enter the account number.')).toBeVisible();
  await expect(page.getByText('Confirm you are not a robot.')).toBeVisible();
  await expect(page.getByText('Enter a 4-digit year.')).toBeVisible();
  await expect(page.getByText('Use 4 digits.')).toBeVisible();
  expect(profile.calls).toHaveLength(0);

  await field(page, 'Preferred fleet').fill('ABC Fleet');
  await field(page, 'Car year').fill('2023');
  await field(page, 'Car phone').fill('2125550000');
  await field(page, 'IVR PIN').fill('4521');
  await page.getByRole('checkbox', { name: 'Smoking car', exact: true }).click();

  // Leaving the account number asks the real gateway whether the account
  // needs requirement fields. Its stub answers with only a result code — no.
  await field(page, 'Account number').fill(ACCOUNT.number);
  const requirementsResponse = waitForGatewayAction(page, ACTION_CODES.ACCOUNT_REQUIREMENTS);
  await field(page, 'Account name').fill(ACCOUNT.name);
  const requirements = await requirementsResponse;
  expect(jDataOf(requirements)).toEqual({ P_ACCOUNT_NUM: ACCOUNT.number });
  expect((await gatewayRows(requirements))[0]?.o_code).toBe('0');

  await field(page, 'VIP number').fill(ACCOUNT.vip);
  await page.getByRole('checkbox', { name: 'Phone', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Send me special offers' }).click();
  await tickHumanCheck(page);

  const companyResponse = waitForGatewayAction(page, ACTION_CODES.IS_VALID_COMPANY_NAME);
  const vipResponse = waitForGatewayAction(page, ACTION_CODES.IS_VALID_VIP);
  const createResponse = waitForGatewayAction(page, ACTION_CODES.CREATE_PROFILE);
  await page.getByRole('button', { name: 'Create account' }).click();

  const company = await companyResponse;
  expect(jDataOf(company)).toEqual({ P_ACCOUNT_NUM: ACCOUNT.number, P_COMPANY_NAME: ACCOUNT.name });
  expect((await gatewayRows(company))[0]?.o_code).toBe('0');

  const vip = await vipResponse;
  expect(jDataOf(vip)).toEqual({ P_ACCOUNT_NUM: ACCOUNT.number, P_VIP_NUM: ACCOUNT.vip });
  expect((await gatewayRows(vip))[0]?.o_code).toBe('0');

  await createResponse;
  // No requirements, so the list was never asked for; the answer from
  // leaving the field was reused rather than asked again.
  expect(profile.sent).not.toContain(ACTION_CODES.ACCOUNT_REQUIREMENTS_RS);
  expect(profile.sent.filter((code) => code === ACTION_CODES.ACCOUNT_REQUIREMENTS)).toHaveLength(1);
  expect(profile.calls).toHaveLength(1);
  const sent = profile.calls[0];
  expect(Object.keys(sent).sort()).toEqual([...PROFILE_PARAMETERS].sort());
  expect(sent).toEqual({
    ...expectedPersonAndAddress(email),
    // The gateway stub names no requirement fields, so none were asked for.
    ...NO_ACCOUNT_REQUIREMENTS,
    P_PREFERRED_FLEET: 'ABC Fleet',
    P_CAR_YEAR: '2023',
    P_CAR_PHONE: '2125550000',
    P_SMOKING_CAR: 'Y',
    P_IVR_PIN: '4521',
    P_PAYMENT_TYPE: 'CA',
    P_ACCOUNT_NUM: ACCOUNT.number,
    P_VIP_NUM: ACCOUNT.vip,
    P_CC_TYPE: '',
    P_CARD_HOLDER_NAME: '',
    P_CARD_NUMBER: '',
    P_VERIFY_CODE: '',
    P_CC_MONTH: '',
    P_CC_YEAR: '',
    P_CONFIRMATION_METHOD: 'PHONE',
    P_SPECIAL_OFFER: 'Y',
  });

  await expect(page.getByText('Registration complete')).toBeVisible();
  await page.getByRole('link', { name: 'Go to log in' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('shows a refused card registration, then succeeds on retry', async ({ page }) => {
  const profile = await interceptCreateProfile(page);
  const email = uniqueEmail();

  await completeAccountAndAddress(page, email);

  // ── Step 3: Billing Info, by credit card ─────────────────────────────────
  await page.getByRole('radio', { name: /^Credit card/ }).click();
  await field(page, 'Name on card').fill('John Doe');
  await field(page, 'Card number').fill(TEST_CARD);
  await field(page, 'Expiry').fill('1230');
  await field(page, 'Security code').fill('123');
  await tickHumanCheck(page);

  // The server refuses the first attempt with its own message.
  profile.answer = { o_code: '1', o_message: 'Card could not be verified.' };
  const refused = waitForGatewayAction(page, ACTION_CODES.CREATE_PROFILE);
  await page.getByRole('button', { name: 'Create account' }).click();
  await refused;

  // The alert sits above the fields; the page scrolls up to it.
  await expect(page.getByText('Registration not completed')).toBeInViewport();
  await expect(page.getByText('Card could not be verified.')).toBeVisible();
  await expect(page.getByText('Billing Info', { exact: true })).toBeVisible();
  // A refusal resets the captcha, as on login.
  await expect(visible(page.getByRole('checkbox', { name: "I'm not a robot" }))).not.toBeChecked();

  expect(profile.calls).toHaveLength(1);
  expect(profile.calls[0]).toEqual({
    ...expectedPersonAndAddress(email),
    ...NO_ACCOUNT_REQUIREMENTS,
    ...NO_CAR_PREFERENCES,
    P_PAYMENT_TYPE: 'CC',
    P_ACCOUNT_NUM: '',
    P_VIP_NUM: '',
    P_CC_TYPE: 'VISA',
    P_CARD_HOLDER_NAME: 'John Doe',
    P_CARD_NUMBER: TEST_CARD,
    P_VERIFY_CODE: '123',
    P_CC_MONTH: '12',
    P_CC_YEAR: '2030',
    P_CONFIRMATION_METHOD: 'EMAIL',
    P_SPECIAL_OFFER: 'N',
  });

  // Card billing skips the corporate-account lookups entirely.
  const forwardedCodes = profile.forwarded.map((envelope) => envelope.ActionCode);
  expect(forwardedCodes).not.toContain(ACTION_CODES.IS_VALID_COMPANY_NAME);
  expect(forwardedCodes).not.toContain(ACTION_CODES.ACCOUNT_REQUIREMENTS_RS);

  // Retry once the server accepts.
  profile.answer = { o_code: '0', o_message: 'Profile created' };
  await tickHumanCheck(page);
  const accepted = waitForGatewayAction(page, ACTION_CODES.CREATE_PROFILE);
  await page.getByRole('button', { name: 'Create account' }).click();
  await accepted;
  await expect(page.getByText('Registration complete')).toBeVisible();

  // The card number never left the browser: only intercepted calls carried it.
  expect(profile.calls).toHaveLength(2);
  expect(JSON.stringify(profile.forwarded)).not.toContain(TEST_CARD);
});

test('asks for the fields a corporate account requires', async ({ page }) => {
  const profile = await interceptCreateProfile(page);
  profile.lookups = {
    [ACTION_CODES.ACCOUNT_REQUIREMENTS]: {
      headings: ['o_code', 'o_message', 'requirement_count'],
      rows: [['0', '', '2']],
    },
    [ACTION_CODES.ACCOUNT_REQUIREMENTS_RS]: {
      headings: ['o_code', 'o_message', 'requirement_num', 'requirement_label'],
      rows: [
        ['0', '', '1', 'Cost center'],
        ['0', '', '2', 'Employee ID'],
      ],
    },
  };
  const email = uniqueEmail();

  await completeAccountAndAddress(page, email);

  // Leaving the account number asks whether it has requirements, then lists them.
  await field(page, 'Account number').fill(ACCOUNT.number);
  const summaryResponse = waitForGatewayAction(page, ACTION_CODES.ACCOUNT_REQUIREMENTS);
  const listResponse = waitForGatewayAction(page, ACTION_CODES.ACCOUNT_REQUIREMENTS_RS);
  await field(page, 'Account name').click();
  expect(jDataOf(await summaryResponse)).toEqual({ P_ACCOUNT_NUM: ACCOUNT.number });
  expect(jDataOf(await listResponse)).toEqual({ P_ACCOUNT_NUM: ACCOUNT.number });
  await expect(field(page, 'Cost center')).toBeVisible();
  await expect(field(page, 'Employee ID')).toBeVisible();

  await field(page, 'Account name').fill(ACCOUNT.name);
  await tickHumanCheck(page);

  // Unanswered requirements stop the profile from being sent.
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Fill this in for your account.')).toHaveCount(2);
  expect(profile.calls).toHaveLength(0);

  await field(page, 'Cost center').fill('CC-100');
  await field(page, 'Employee ID').fill('E-7');
  const createResponse = waitForGatewayAction(page, ACTION_CODES.CREATE_PROFILE);
  await page.getByRole('button', { name: 'Create account' }).click();
  await createResponse;

  expect(profile.calls).toHaveLength(1);
  expect(profile.calls[0]).toMatchObject({
    P_ACCOUNT_NUM: ACCOUNT.number,
    P_ACCOUNT_REQ1: 'CC-100',
    P_ACCOUNT_REQ2: 'E-7',
    P_ACCOUNT_REQ3: '',
    P_ACCOUNT_REQ4: '',
  });
  await expect(page.getByText('Registration complete')).toBeVisible();

  // Each requirements code went out once, on leaving the field; both
  // Create account presses reused that answer.
  const sentOnce = (code: string) => profile.sent.filter((sent) => sent === code).length;
  expect(sentOnce(ACTION_CODES.ACCOUNT_REQUIREMENTS)).toBe(1);
  expect(sentOnce(ACTION_CODES.ACCOUNT_REQUIREMENTS_RS)).toBe(1);
});

test('stops at an account the server refuses', async ({ page }) => {
  const profile = await interceptCreateProfile(page);
  profile.lookups = {
    [ACTION_CODES.ACCOUNT_REQUIREMENTS]: {
      headings: ['o_code', 'o_message'],
      rows: [['1', 'This account is closed.']],
    },
  };
  const email = uniqueEmail();

  await completeAccountAndAddress(page, email);

  // The refusal shows on the field as soon as it is left.
  await field(page, 'Account number').fill(ACCOUNT.number);
  const refusal = waitForGatewayAction(page, ACTION_CODES.ACCOUNT_REQUIREMENTS);
  await field(page, 'Account name').fill(ACCOUNT.name);
  await refusal;
  await expect(page.getByText('This account is closed.')).toBeVisible();
  expect(profile.sent).not.toContain(ACTION_CODES.ACCOUNT_REQUIREMENTS_RS);

  // Create account asks again, reports it above the form and sends nothing.
  await tickHumanCheck(page);
  const retried = waitForGatewayAction(page, ACTION_CODES.ACCOUNT_REQUIREMENTS);
  await page.getByRole('button', { name: 'Create account' }).click();
  await retried;
  await expect(page.getByText('Registration not completed')).toBeInViewport();
  await expect(page.getByText('This account is closed.')).toHaveCount(2);
  expect(profile.calls).toHaveLength(0);

  // A different account number clears the refusal.
  await field(page, 'Account number').fill('ACCT20001');
  await expect(page.getByText('This account is closed.')).toHaveCount(1);
});
