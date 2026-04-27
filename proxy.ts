import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Bot user-agent blocklist (case-insensitive substring match)
// ---------------------------------------------------------------------------
const BAD_BOT_PATTERNS = [
  'ahrefsbot', 'semrushbot', 'dotbot', 'mj12bot', 'blexbot', 'petalbot',
  'yandexbot', 'baiduspider', 'sogou', 'exabot', 'ia_archiver', 'scrapy',
  'python-requests', 'python-urllib', 'go-http-client', 'wget', 'curl/',
  'libwww-perl', 'java/', 'masscan', 'zgrab', 'nikto', 'nmap', 'sqlmap',
  'serpstatbot', 'bytespider', 'gptbot', 'ccbot', 'claudebot', 'anthropic',
];

// ---------------------------------------------------------------------------
// Geo restriction
// ---------------------------------------------------------------------------
// Vercel injects x-vercel-ip-country / x-vercel-ip-country-region headers.
// These are absent in local dev — the checks fail open so development is unaffected.
const ALLOWED_COUNTRIES = new Set(['US']);

// Preferred Midwest + nearby states. When RESTRICT_TO_MIDWEST=true in env,
// requests from US states outside this set receive 403. Default: US-only (no state check).
const MIDWEST_STATES = new Set(['OH', 'IN', 'MI', 'KY', 'PA', 'WI', 'IL', 'MN', 'MO', 'IA', 'WV']);

// Admin routes bypass geo restriction (admins may be travelling).
const ADMIN_PATH_PREFIX = '/admin';

// ---------------------------------------------------------------------------
// Routes that serve gallery content — require a browser-like Accept header
// ---------------------------------------------------------------------------
const GALLERY_PATHS = ['/gallery', '/sendyourphotos', '/upload'];

// ---------------------------------------------------------------------------
// Per-IP rate limiting (in-memory, best-effort)
// Effective within a single Vercel Edge Function instance.
// For cross-instance enforcement, use Upstash Redis or Vercel KV.
// ---------------------------------------------------------------------------
interface RateWindow { count: number; resetAt: number }
interface IpEntry { minute: RateWindow; hour: RateWindow }
const rateLimits = new Map<string, IpEntry>();
const RATE_LIMIT_PER_MINUTE = 20;
const RATE_LIMIT_PER_HOUR = 200;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  let entry = rateLimits.get(ip);
  if (!entry) {
    entry = {
      minute: { count: 0, resetAt: now + 60_000 },
      hour:   { count: 0, resetAt: now + 3_600_000 },
    };
    rateLimits.set(ip, entry);
  }
  if (now > entry.minute.resetAt) entry.minute = { count: 0, resetAt: now + 60_000 };
  if (now > entry.hour.resetAt)   entry.hour   = { count: 0, resetAt: now + 3_600_000 };
  entry.minute.count++;
  entry.hour.count++;
  // Prune the map periodically to avoid unbounded growth.
  if (rateLimits.size > 5_000) {
    const oldest = [...rateLimits.entries()]
      .sort((a, b) => a[1].hour.resetAt - b[1].hour.resetAt)
      .slice(0, 1_000);
    for (const [k] of oldest) rateLimits.delete(k);
  }
  return entry.minute.count > RATE_LIMIT_PER_MINUTE || entry.hour.count > RATE_LIMIT_PER_HOUR;
}

function block403(message: string): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Access Restricted</title>`
    + `<style>body{font-family:sans-serif;max-width:480px;margin:4rem auto;padding:1rem;text-align:center}`
    + `h1{font-size:1.5rem}p{color:#555}</style></head>`
    + `<body><h1>403 — Access Restricted</h1><p>${message}</p></body></html>`,
    { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

export function proxy(request: NextRequest) {
  const ua = (request.headers.get('user-agent') ?? '').toLowerCase();
  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname.startsWith(ADMIN_PATH_PREFIX);

  // 1. Block known bad bots.
  if (BAD_BOT_PATTERNS.some((pattern) => ua.includes(pattern))) {
    return new NextResponse(null, { status: 403 });
  }
  // 2. Block empty user-agents.
  if (!ua.trim()) {
    return new NextResponse(null, { status: 403 });
  }

  // 3. Geo restriction (skip for admin routes so admins can log in while travelling).
  if (!isAdminRoute) {
    const country = request.headers.get('x-vercel-ip-country');
    if (country && !ALLOWED_COUNTRIES.has(country)) {
      return block403('This site is only available in the United States.');
    }
    // Optional Midwest-only mode. Enable by setting RESTRICT_TO_MIDWEST=true.
    if (process.env.RESTRICT_TO_MIDWEST === 'true' && country === 'US') {
      const region = request.headers.get('x-vercel-ip-country-region');
      if (region && !MIDWEST_STATES.has(region)) {
        return block403('This site is only available to guests in the Midwest region.');
      }
    }
  }

  // 4. Per-IP rate limiting.
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
    || request.headers.get('x-real-ip')
    || '';
  if (ip && isRateLimited(ip)) {
    return new NextResponse(null, { status: 429, headers: { 'Retry-After': '60' } });
  }

  // 5. Gallery/upload routes: require a browser-like Accept header.
  if (GALLERY_PATHS.some((p) => pathname.startsWith(p))) {
    const accept = request.headers.get('accept') ?? '';
    if (!accept.includes('text/html') && !accept.includes('*/*')) {
      return new NextResponse(null, { status: 403 });
    }
  }

  const response = NextResponse.next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  return response;
}

export const config = {
  // Apply to all pages/routes except Next.js internals and static assets.
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
