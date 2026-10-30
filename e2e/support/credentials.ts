/** Test account from `e2e/e2e.local.env`; never hardcoded in the specs. */
export function testCredentials(): { email: string; password: string } {
  const email = process.env.E2E_LOGIN_EMAIL?.trim();
  const password = process.env.E2E_LOGIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'Set E2E_LOGIN_EMAIL and E2E_LOGIN_PASSWORD in e2e/e2e.local.env (see e2e/e2e.env.example).',
    );
  }
  return { email, password };
}

/**
 * A corporate account the gateway accepts (number, its company name and a VIP
 * number on it), from `e2e/e2e.local.env`; never hardcoded in the specs.
 */
export function testAccount(): { number: string; name: string; vip: string } {
  const number = process.env.E2E_ACCOUNT_NUMBER?.trim();
  const name = process.env.E2E_ACCOUNT_NAME?.trim();
  const vip = process.env.E2E_ACCOUNT_VIP?.trim();
  if (!number || !name || !vip) {
    throw new Error(
      'Set E2E_ACCOUNT_NUMBER, E2E_ACCOUNT_NAME and E2E_ACCOUNT_VIP in e2e/e2e.local.env (see e2e/e2e.env.example).',
    );
  }
  return { number, name, vip };
}
