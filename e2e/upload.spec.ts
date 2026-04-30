/**
 * Upload integration test — WRITES TO PRODUCTION.
 *
 * What this test does:
 *   1. Navigates to /sendyourphotos
 *   2. Fills the form with recognisable test data
 *   3. Attaches a 1×1 pixel JPEG (279 bytes — smallest valid JFIF)
 *   4. Submits — triggers a real UploadThing upload + Neon DB insert
 *   5. Asserts the success toast appears
 *
 * Side-effects:
 *   - Creates a real `photos` row in Neon (status='pending', is_visible=false)
 *   - Uploads a tiny file to UploadThing storage
 *   Both are invisible to guests until manually approved. Look for rows with
 *   uploader_name = 'E2E TestRunner' to identify and clean up test data.
 *
 * Guard: only runs when RUN_UPLOAD_TEST=1 to prevent unintended production
 * writes on every push.  Enable it in the GitHub Actions manual dispatch or
 * in your local shell:
 *
 *   RUN_UPLOAD_TEST=1 npx playwright test e2e/upload.spec.ts
 *
 * Also verifies the guestbook POST endpoint (/api/guestbook).
 */

import { test, expect } from '@playwright/test';

// Minimal valid 1×1 white JPEG (JFIF, 279 bytes)
const TINY_JPEG_B64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U' +
  'HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARC' +
  'AABAAEDASIA' +
  'AhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/' +
  'xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQAC' +
  'EQMRAID8AJQAB/9k=';

const SKIP_REASON =
  'Set RUN_UPLOAD_TEST=1 to run upload integration tests (writes to production DB)';

// ---------------------------------------------------------------------------
// Upload form e2e test
// ---------------------------------------------------------------------------

test(
  'fills upload form, submits, and receives success toast',
  async ({ page }) => {
    test.skip(!process.env.RUN_UPLOAD_TEST, SKIP_REASON);

    await page.goto('/sendyourphotos');

    // Attach test image via the visible file input (not the hidden camera one)
    const fileInput = page.locator('input[type="file"]:not([capture])');
    await fileInput.setInputFiles({
      name: 'e2e-test-photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from(TINY_JPEG_B64, 'base64'),
    });

    // Fill text fields
    await page
      .locator('input[placeholder="First name"]')
      .fill('E2E');
    await page
      .locator('input[placeholder*="Uncle Tony"]')
      .fill('TestRunner');
    await page
      .locator('input[placeholder*="Cutting the Cake"]')
      .fill('Automated integration test — safe to delete');

    // Submit
    await page.getByRole('button', { name: /upload|submit/i }).click();

    // UploadThing upload can take up to 30 s in CI
    await expect(
      page.getByText(/uploaded successfully/i),
    ).toBeVisible({ timeout: 45_000 });
  },
);

// ---------------------------------------------------------------------------
// Guestbook POST integration test
// ---------------------------------------------------------------------------

test(
  'POST /api/guestbook creates a pending entry',
  async ({ request }) => {
    test.skip(!process.env.RUN_UPLOAD_TEST, SKIP_REASON);

    const res = await request.post('/api/guestbook', {
      data: {
        weddingSlug: process.env.NEXT_PUBLIC_WEDDING_SLUG ?? 'may-collins-2026',
        displayName: 'E2E TestRunner',
        familyName: 'CI Bot',
        message: 'Automated integration test entry — safe to delete.',
        side: 'bride',
      },
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
  },
);
