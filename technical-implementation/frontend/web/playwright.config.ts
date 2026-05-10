import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/demo',
  testMatch: /.*\.demo\.ts/,
  outputDir: './test-results',
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: {
    timeout: 10_000,
  },
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    headless: true,
    viewport: { width: 1440, height: 900 },
    launchOptions: {
      slowMo: 100,
    },
    video: {
      mode: 'on',
      size: { width: 1440, height: 900 },
    },
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'demo-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100/login',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
