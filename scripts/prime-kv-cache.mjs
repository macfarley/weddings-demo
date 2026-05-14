#!/usr/bin/env node
// scripts/prime-kv-cache.mjs
//
// One-time script to seed the Cloudflare KV cache with all existing posts.
// Run this after deploying the new KV-enabled Worker to pre-warm the cache
// so the first visitor doesn't trigger a cold Neon query.
//
// Prerequisites:
//   1. Deploy the updated Worker: cd worker && npx wrangler deploy
//   2. Set WEDDING_SLUG in Worker env if not already done
//   3. Run: node scripts/prime-kv-cache.mjs
//
// The script calls GET /photos/approved and GET /guestbook/approved on your
// Worker to trigger the KV-miss path and populate the cache from Neon.
// After this, Neon stays cold until the next scheduled cron.
//
// Env vars needed (can be in .env.local):
//   PRIME_WORKER_URL      — your Worker URL, e.g. https://worker.your-subdomain.workers.dev
//   PRIME_WEDDING_SLUG    — the active wedding slug, e.g. johncrysal-may2024

import { config } from 'dotenv';
config({ path: '.env.local' });

const workerUrl = (process.env.PRIME_WORKER_URL || '').trim().replace(/\/+$/, '');
const weddingSlug = (process.env.PRIME_WEDDING_SLUG || process.env.NEXT_PUBLIC_WEDDING_SLUG || '').trim();

if (!workerUrl) {
  console.error('❌  PRIME_WORKER_URL is required. Set it in .env.local.');
  process.exit(1);
}

async function prime(label, path) {
  const url = `${workerUrl}${path}`;
  console.log(`→ Priming ${label}: ${url}`);
  const res = await fetch(url, {
    headers: {
      // Use a browser-like UA to pass the worker's UA block check.
      'User-Agent': 'Mozilla/5.0 (compatible; KV-prime-script/1.0)',
      'Origin': workerUrl,
    },
  });
  const body = await res.json();
  if (!res.ok || body.error) {
    console.error(`  ❌  Failed (${res.status}):`, body.error ?? body);
    return;
  }
  const xCache = res.headers.get('x-cache') ?? 'unknown';
  const count = body.data?.length ?? body.total ?? '?';
  console.log(`  ✅  ${xCache === 'HIT' ? 'Served from KV (already warm)' : 'Fetched from Neon → KV written'} — ${count} records`);
}

const slug = weddingSlug ? `?wedding_slug=${encodeURIComponent(weddingSlug)}` : '';

console.log('\n📦  Priming KV cache…\n');
await prime('photos', `/photos/approved${slug}`);
await prime('guestbook', `/guestbook/approved${slug}`);

// Verify the status endpoint reflects the new timestamps.
const statusRes = await fetch(`${workerUrl}/cache/status`, {
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KV-prime-script/1.0)' },
});
const status = await statusRes.json();
console.log('\n📊  Cache status after priming:');
console.log('   last_change:', status.last_change ?? '(not set yet — run again or wait for cron)');
console.log('\n✅  Done. The KV cache is warm. Neon will stay cold until the next write.\n');
