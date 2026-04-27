import { NextRequest, NextResponse } from 'next/server';

// Known bad bot user-agent substrings (case-insensitive match)
const BAD_BOT_PATTERNS = [
  'ahrefsbot',
  'semrushbot',
  'dotbot',
  'mj12bot',
  'blexbot',
  'petalbot',
  'yandexbot',
  'baiduspider',
  'sogou',
  'exabot',
  'ia_archiver',
  'scrapy',
  'python-requests',
  'python-urllib',
  'go-http-client',
  'wget',
  'curl/',
  'libwww-perl',
  'java/',
  'masscan',
  'zgrab',
  'nikto',
  'nmap',
  'sqlmap',
];

export function middleware(request: NextRequest) {
  const ua = (request.headers.get('user-agent') ?? '').toLowerCase();

  // Block known bad bots immediately
  if (BAD_BOT_PATTERNS.some((pattern) => ua.includes(pattern))) {
    return new NextResponse(null, { status: 403 });
  }

  // Block completely empty user agents (most real browsers always send one)
  if (!ua.trim()) {
    return new NextResponse(null, { status: 403 });
  }

  const response = NextResponse.next();

  // Reinforce robots directive via HTTP header (supplements robots.txt)
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');

  return response;
}

export const config = {
  // Apply to all pages/routes except Next.js internals and static assets
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
