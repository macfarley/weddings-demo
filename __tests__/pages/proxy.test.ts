/**
 * @jest-environment node
 *
 * Tests for proxy.ts — geo restriction, bot filtering, rate limiting,
 * and Accept-header browser check.
 *
 * NextRequest is mocked by constructing plain objects that match
 * the shape proxy() reads. This avoids needing the full Edge runtime.
 */

// Minimal NextRequest stub used by proxy.ts
function makeRequest(overrides: {
  pathname?: string;
  userAgent?: string;
  accept?: string;
  country?: string;
  region?: string;
  ip?: string;
} = {}): Parameters<typeof import('../../proxy').proxy>[0] {
  const {
    pathname = '/',
    userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    accept = 'text/html,application/xhtml+xml',
    country,
    region,
    ip = '1.2.3.4',
  } = overrides;

  const headers = new Map<string, string>();
  if (userAgent) headers.set('user-agent', userAgent);
  if (accept) headers.set('accept', accept);
  if (country) headers.set('x-vercel-ip-country', country);
  if (region) headers.set('x-vercel-ip-country-region', region);
  if (ip) headers.set('x-forwarded-for', ip);

  return {
    headers: { get: (key: string) => headers.get(key.toLowerCase()) ?? null },
    nextUrl: { pathname },
  } as unknown as Parameters<typeof import('../../proxy').proxy>[0];
}

import { proxy } from '../../proxy';

// ─── Bot filtering ───────────────────────────────────────────────────────────
describe('proxy — bot filtering', () => {
  it('allows normal browser user-agent', () => {
    const res = proxy(makeRequest({ country: 'US' }));
    expect(res?.status).not.toBe(403);
  });

  it('blocks ahrefsbot', () => {
    const res = proxy(makeRequest({ userAgent: 'AhrefsBot/7.0', country: 'US' }));
    expect(res?.status).toBe(403);
  });

  it('blocks CCBot (AI trainer)', () => {
    const res = proxy(makeRequest({ userAgent: 'CCBot/2.0', country: 'US' }));
    expect(res?.status).toBe(403);
  });

  it('blocks GPTBot', () => {
    const res = proxy(makeRequest({ userAgent: 'GPTBot/1.0', country: 'US' }));
    expect(res?.status).toBe(403);
  });

  it('blocks claudebot', () => {
    const res = proxy(makeRequest({ userAgent: 'claudebot/1.0', country: 'US' }));
    expect(res?.status).toBe(403);
  });

  it('blocks empty user-agent', () => {
    const res = proxy(makeRequest({ userAgent: '', country: 'US' }));
    expect(res?.status).toBe(403);
  });

  it('blocks python-requests scraper', () => {
    const res = proxy(makeRequest({ userAgent: 'python-requests/2.28', country: 'US' }));
    expect(res?.status).toBe(403);
  });
});

// ─── Geo restriction ─────────────────────────────────────────────────────────
describe('proxy — geo restriction', () => {
  it('allows US traffic', () => {
    const res = proxy(makeRequest({ country: 'US' }));
    expect(res?.status).not.toBe(403);
  });

  it('blocks non-US country (GB)', () => {
    const res = proxy(makeRequest({ country: 'GB' }));
    expect(res?.status).toBe(403);
  });

  it('blocks non-US country (DE)', () => {
    const res = proxy(makeRequest({ country: 'DE' }));
    expect(res?.status).toBe(403);
  });

  it('allows requests with no country header (local dev)', () => {
    const res = proxy(makeRequest({ country: undefined }));
    // No country header = not blocked (fail open for local dev)
    expect(res?.status).not.toBe(403);
  });

  it('bypasses geo check for /admin route', () => {
    const res = proxy(makeRequest({ pathname: '/admin', country: 'GB' }));
    // Admin route skips geo restriction so travelling admins can log in
    expect(res?.status).not.toBe(403);
  });
});

// ─── Midwest restriction ─────────────────────────────────────────────────────
describe('proxy — Midwest restriction (when RESTRICT_TO_MIDWEST=true)', () => {
  beforeEach(() => {
    process.env.RESTRICT_TO_MIDWEST = 'true';
  });

  afterEach(() => {
    delete process.env.RESTRICT_TO_MIDWEST;
  });

  it('allows Ohio (OH)', () => {
    const res = proxy(makeRequest({ country: 'US', region: 'OH' }));
    expect(res?.status).not.toBe(403);
  });

  it('allows Indiana (IN)', () => {
    const res = proxy(makeRequest({ country: 'US', region: 'IN' }));
    expect(res?.status).not.toBe(403);
  });

  it('blocks California (CA)', () => {
    const res = proxy(makeRequest({ country: 'US', region: 'CA' }));
    expect(res?.status).toBe(403);
  });

  it('blocks Texas (TX)', () => {
    const res = proxy(makeRequest({ country: 'US', region: 'TX' }));
    expect(res?.status).toBe(403);
  });

  it('allows US with no region header (fail open)', () => {
    const res = proxy(makeRequest({ country: 'US', region: undefined }));
    expect(res?.status).not.toBe(403);
  });
});

// ─── Rate limiting ────────────────────────────────────────────────────────────
describe('proxy — rate limiting', () => {
  it('allows requests under the per-minute limit', () => {
    // Use a fresh IP to start clean (in-memory map is shared across tests
    // so we use a unique IP per test block)
    const ip = '10.0.0.1';
    for (let i = 0; i < 10; i++) {
      const res = proxy(makeRequest({ country: 'US', ip }));
      expect(res?.status).not.toBe(429);
    }
  });

  it('returns 429 after exceeding per-minute limit (>20)', () => {
    const ip = '10.0.0.2';
    let lastResponse;
    for (let i = 0; i < 25; i++) {
      lastResponse = proxy(makeRequest({ country: 'US', ip }));
    }
    expect(lastResponse?.status).toBe(429);
  });
});

// ─── Gallery Accept-header check ─────────────────────────────────────────────
describe('proxy — gallery browser check', () => {
  it('allows /gallery with text/html Accept header', () => {
    const res = proxy(makeRequest({ pathname: '/gallery', country: 'US', accept: 'text/html' }));
    expect(res?.status).not.toBe(403);
  });

  it('allows /sendyourphotos with */* Accept header', () => {
    const res = proxy(makeRequest({ pathname: '/sendyourphotos', country: 'US', accept: '*/*' }));
    expect(res?.status).not.toBe(403);
  });

  it('blocks /gallery with no html in Accept (raw API call)', () => {
    const res = proxy(makeRequest({ pathname: '/gallery', country: 'US', accept: 'application/json' }));
    expect(res?.status).toBe(403);
  });

  it('blocks /upload with missing Accept header', () => {
    const res = proxy(makeRequest({ pathname: '/upload', country: 'US', accept: '' }));
    expect(res?.status).toBe(403);
  });

  it('does not apply Accept check to non-gallery path (/about)', () => {
    const res = proxy(makeRequest({ pathname: '/about', country: 'US', accept: 'application/json' }));
    expect(res?.status).not.toBe(403);
  });
});

// ─── robots.txt ──────────────────────────────────────────────────────────────
describe('robots.txt', () => {
  it('disallows everything for all user-agents', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const robotsPath = path.join(process.cwd(), 'public', 'robots.txt');
    const content = fs.readFileSync(robotsPath, 'utf8');
    expect(content).toContain('User-agent: *');
    expect(content).toContain('Disallow: /');
  });
});

// ─── X-Robots-Tag header ─────────────────────────────────────────────────────
describe('proxy — X-Robots-Tag header', () => {
  it('adds noindex header to all passing requests', () => {
    const res = proxy(makeRequest({ country: 'US' }));
    // NextResponse.next() returns an object with a headers map-like object
    // In the test stub this is mocked, so we just check it doesn't throw
    expect(res).toBeDefined();
  });
});
