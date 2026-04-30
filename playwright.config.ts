import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'https://weddings-demo.vercel.app';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,        // run serially — rate limit is 20 req/min per IP
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,                  // single worker to stay under rate limit
  reporter: process.env.CI ? 'github' : 'list',
  outputDir: 'test-results',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    // Playwright's APIRequestContext (request.get/post) sends no User-Agent by
    // default. The Worker blocks empty UAs with 403. Setting this here applies
    // to all request fixture calls; browser pages ignore it (Chromium overrides).
    extraHTTPHeaders: {
      'User-Agent': 'Mozilla/5.0 (WeddingSiteE2E; Playwright)',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
