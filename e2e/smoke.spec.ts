/**
 * Smoke tests — GET-only, zero side-effects, always run in CI.
 *
 * Tests:
 *   1. Worker /health endpoint
 *   2. Worker /gallery/approved endpoint returns valid JSON
 *   3. Worker /guestbook endpoint returns valid JSON
 *   4. Gallery page loads without errors (browser)
 *   5. Gallery page fires a request to the Worker (network assertion)
 */

import { test, expect } from '@playwright/test';

const WORKER_BASE =
  process.env.E2E_WORKER_BASE_URL ??
  'https://worker.therealmccoyster.workers.dev';

const WEDDING_SLUG =
  process.env.NEXT_PUBLIC_WEDDING_SLUG ?? 'may-collins-2026';

// ---------------------------------------------------------------------------
// Worker API smoke tests
// ---------------------------------------------------------------------------

test('worker /health returns { ok: true, db: true }', async ({ request }) => {
  const res = await request.get(`${WORKER_BASE}/health`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(body.db).toBe(true);
});

test('worker /photos/approved returns a valid JSON envelope', async ({ request }) => {
  const res = await request.get(
    `${WORKER_BASE}/photos/approved?wedding_slug=${WEDDING_SLUG}`,
  );
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toHaveProperty('data');
  expect(Array.isArray(body.data)).toBe(true);
});

test('worker /guestbook/approved returns a valid JSON envelope', async ({ request }) => {
  const res = await request.get(
    `${WORKER_BASE}/guestbook/approved?wedding_slug=${WEDDING_SLUG}`,
  );
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toHaveProperty('data');
  expect(Array.isArray(body.data)).toBe(true);
});

// ---------------------------------------------------------------------------
// Gallery page browser tests
// ---------------------------------------------------------------------------

test('gallery page loads and renders without a crash', async ({ page }) => {
  await page.goto('/gallery');

  // Must not be an error page
  await expect(page.locator('body')).not.toContainText('Application error');
  await expect(page.locator('body')).not.toContainText('Internal Server Error');

  // Page title should mention the couple or "gallery"
  const title = await page.title();
  expect(title.length).toBeGreaterThan(0);
});

test('gallery page fires a request to the Worker', async ({ page }) => {
  // page.on('request') fires for every request the page makes, including
  // cross-origin fetch() calls from React components. We collect all non-asset
  // URLs so we can both assert and diagnose failures with actionable output.
  const nonAssetRequests: string[] = [];

  page.on('request', (req) => {
    const url = req.url();
    if (!/\.(js|css|woff2?|png|jpg|ico|svg)(\?|$)/.test(url)) {
      nonAssetRequests.push(url);
    }
  });

  await page.goto('/gallery');
  await page.waitForLoadState('networkidle', { timeout: 30_000 });

  const workerRequest = nonAssetRequests.find((url) =>
    url.includes('photos/approved'),
  );

  expect(
    workerRequest,
    `Gallery made no /photos/approved request.\n` +
      `Requests seen:\n  ${nonAssetRequests.join('\n  ')}\n\n` +
      `→ Ensure NEXT_PUBLIC_WORKER_BASE_URL is set in Vercel env vars and redeploy.`,
  ).toBeTruthy();
});
