import { existsSync } from 'node:fs';

import { defineConfig, devices } from '@playwright/test';

// Test credentials and URLs live in a git-ignored file (see e2e/e2e.env.example).
const E2E_ENV_FILE = 'e2e/e2e.local.env';
if (existsSync(E2E_ENV_FILE)) process.loadEnvFile(E2E_ENV_FILE);
// The app's own config, so specs can check the JHeader values it sends.
if (existsSync('.env')) process.loadEnvFile('.env');

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:8081';
const port = new URL(baseURL).port || '8081';

export default defineConfig({
  testDir: './e2e',
  // The first web bundle from a cold Expo server takes a while.
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    // Runs on the installed Google Chrome, so no browser download is needed.
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: 'chrome' } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `npx expo start --web --port ${port}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
