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
