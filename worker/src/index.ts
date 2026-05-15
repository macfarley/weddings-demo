import { neon } from '@neondatabase/serverless';

type WorkerEnv = {
	DATABASE_URL: string;
	ADMIN_PASSWORD?: string;
	CLIENT_PASSWORD?: string;
	ADMIN_ORIGIN?: string;
	SITE_ORIGIN?: string;
	HF_TOKEN?: string;
	SLACK_WEBHOOK_URL?: string;
	RESTRICT_TO_MIDWEST?: string;
	UPLOADTHING_TOKEN?: string;
	// KV namespace for serving cached data without waking Neon.
	// Binding name must match wrangler.jsonc → kv_namespaces[].binding
	CACHE?: KVNamespace;
	// Optional: the active wedding slug, used by the scheduled cache refresh.
	// Set this as a secret/var: npx wrangler secret put WEDDING_SLUG
	WEDDING_SLUG?: string;
};

// ---------------------------------------------------------------------------
// Cloudflare request.cf properties (subset we actually use)
// ---------------------------------------------------------------------------
interface CfProperties {
	country?: string;   // ISO 3166-1 alpha-2 (e.g. "US")
	region?: string;    // State/province code for US (e.g. "OH")
	asn?: number;       // Autonomous System Number
	botManagement?: {
		score?: number;       // 1 (bot) – 99 (human)
		verifiedBot?: boolean; // Cloudflare-verified legitimate crawlers
	};
}

// ---------------------------------------------------------------------------
// Cloud provider ASNs — block scrapers running on shared infra.
// Sources: bgp.he.net, ipinfo.io/AS lookups (updated 2026-04).
// ---------------------------------------------------------------------------
const CLOUD_ASNS = new Set([
	14618, 16509,  // AWS EC2
	15169, 396982, // Google Cloud / GCP
	8075,  8074,   // Microsoft Azure
	14061,         // DigitalOcean
	63949,         // Linode / Akamai
	24940,         // Hetzner
	16276,         // OVH
	20473,         // Vultr
	60781,         // Leaseweb
	132203,        // Tencent Cloud
	45090,         // Tencent / Shenzhen
]);

// Midwest + adjacent US states allowed when RESTRICT_TO_MIDWEST=true.
const MIDWEST_STATES = new Set(['OH', 'IN', 'MI', 'KY', 'PA', 'WI', 'IL', 'MN', 'MO', 'IA', 'WV', 'TN', 'VA']);

// ---------------------------------------------------------------------------
// KV cache helpers
// Neon only wakes on scheduled writes; all reads come from KV.
// Keys are scoped by wedding_slug to support multi-tenant deployments.
// ---------------------------------------------------------------------------

const KV_LAST_CHANGE_KEY = 'cache:last_change';

function kvPhotosKey(weddingSlug: string): string {
	return `photos:approved:${weddingSlug || 'all'}`;
}

function kvGuestbookKey(weddingSlug: string): string {
	return `guestbook:approved:${weddingSlug || 'all'}`;
}

// Shape stored in KV for the photos cache.
interface PhotosKvCache {
	photos: Array<Record<string, unknown>>;
	total: number;
	updated_at: string;
}

// Shape stored in KV for the guestbook cache.
interface GuestbookKvCache {
	entries: Array<Record<string, unknown>>;
	total: number;
	updated_at: string;
}

// Bump the global last-change timestamp so clients know to refetch.
// Called after every successful write (approve/reject/delete) and after
// each scheduled cache refresh.  Fails silently so writes are never blocked.
async function bumpLastChange(env: WorkerEnv): Promise<void> {
	if (!env.CACHE) return;
	try {
		await env.CACHE.put(KV_LAST_CHANGE_KEY, new Date().toISOString());
	} catch {
		// fail silently
	}
}

// Read all approved photos from Neon and write them to KV.
// Called by the scheduled cron.  Gracefully no-ops when CACHE is unbound.
async function refreshPhotosCache(env: WorkerEnv): Promise<void> {
	if (!env.CACHE) return;
	const weddingSlug = (env.WEDDING_SLUG || '').trim();
	try {
		const sql = getDb(env);
		type PhotoRow = {
			id: string; wedding_slug?: string | null; storage_path: string;
			file_url?: string | null; label_raw?: string | null; label_slug?: string | null;
			original_filename?: string | null; uploader_name?: string | null;
			caption?: string | null; created_at: string; status: string;
			is_visible: boolean; love_count?: number | null;
		};
		const rows: PhotoRow[] = weddingSlug
			? await sql`SELECT id, wedding_slug, storage_path, file_url, label_raw, label_slug, original_filename, uploader_name, caption, created_at, status, is_visible, love_count FROM photos WHERE status='approved' AND is_visible=true AND wedding_slug=${weddingSlug} ORDER BY created_at DESC LIMIT 1000` as PhotoRow[]
			: await sql`SELECT id, wedding_slug, storage_path, file_url, label_raw, label_slug, original_filename, uploader_name, caption, created_at, status, is_visible, love_count FROM photos WHERE status='approved' AND is_visible=true ORDER BY created_at DESC LIMIT 1000` as PhotoRow[];

		const mapped = rows.map((row) => {
			const fileUrl = row.file_url?.trim() || null;
			const slug = toDownloadSlug(row);
			const downloadUrl = fileUrl ? `${fileUrl}?filename=${encodeURIComponent(slug + '.jpg')}` : null;
			return { ...row, filename: getFilename(row.storage_path), image_url: fileUrl, view_url: fileUrl, download_url: downloadUrl };
		});

		const cache: PhotosKvCache = { photos: mapped, total: mapped.length, updated_at: new Date().toISOString() };
		await env.CACHE.put(kvPhotosKey(weddingSlug), JSON.stringify(cache));
	} catch {
		// fail silently — cache miss will fall through to DB
	}
}

// Read all visible guestbook entries from Neon and write them to KV.
async function refreshGuestbookCache(env: WorkerEnv): Promise<void> {
	if (!env.CACHE) return;
	const weddingSlug = (env.WEDDING_SLUG || '').trim();
	try {
		const sql = getDb(env);
		type GbRow = {
			id: string; wedding_slug?: string | null; display_name?: string | null;
			family_name?: string | null; message: string;
			side?: 'bride' | 'groom' | null; created_at: string;
		};
		const rows: GbRow[] = weddingSlug
			? await sql`SELECT id, wedding_slug, display_name, family_name, message, side, created_at FROM guestbook_entries WHERE is_visible=true AND wedding_slug=${weddingSlug} ORDER BY created_at DESC LIMIT 500` as GbRow[]
			: await sql`SELECT id, wedding_slug, display_name, family_name, message, side, created_at FROM guestbook_entries WHERE is_visible=true ORDER BY created_at DESC LIMIT 500` as GbRow[];

		const cache: GuestbookKvCache = { entries: rows, total: rows.length, updated_at: new Date().toISOString() };
		await env.CACHE.put(kvGuestbookKey(weddingSlug), JSON.stringify(cache));
	} catch {
		// fail silently
	}
}

// Refresh both caches and bump last_change.  Called from the scheduled cron.
async function refreshAllCaches(env: WorkerEnv): Promise<void> {
	await Promise.all([refreshPhotosCache(env), refreshGuestbookCache(env)]);
	await bumpLastChange(env);
}

// ---------------------------------------------------------------------------
// In-memory rate limiter (per CF-Connecting-IP, per Worker isolate)
// Effective against burst traffic; resets on cold start.
// ---------------------------------------------------------------------------
interface RateWindow { count: number; resetAt: number }
interface IpRateEntry { minute: RateWindow; hour: RateWindow }
const workerRateLimits = new Map<string, IpRateEntry>();
const WORKER_RATE_PER_MINUTE = 30;
const WORKER_RATE_PER_HOUR = 300;

function workerIsRateLimited(ip: string): boolean {
	const now = Date.now();
	let entry = workerRateLimits.get(ip);
	if (!entry) {
		entry = {
			minute: { count: 0, resetAt: now + 60_000 },
			hour:   { count: 0, resetAt: now + 3_600_000 },
		};
		workerRateLimits.set(ip, entry);
	}
	if (now > entry.minute.resetAt) entry.minute = { count: 0, resetAt: now + 60_000 };
	if (now > entry.hour.resetAt)   entry.hour   = { count: 0, resetAt: now + 3_600_000 };
	entry.minute.count++;
	entry.hour.count++;
	if (workerRateLimits.size > 10_000) {
		// Prune oldest 2000 entries to avoid memory growth.
		const sorted = [...workerRateLimits.entries()]
			.sort((a, b) => a[1].hour.resetAt - b[1].hour.resetAt)
			.slice(0, 2_000);
		for (const [k] of sorted) workerRateLimits.delete(k);
	}
	return entry.minute.count > WORKER_RATE_PER_MINUTE || entry.hour.count > WORKER_RATE_PER_HOUR;
}

// Routes requiring full admin password (permanent destructive operations)
const ADMIN_ONLY_ROUTES = new Set([
	'POST /photos/purge',
	'POST /delete',
	'POST /guestbook/delete',
	'GET /report',
]);

// Routes accessible to both admin and client passwords
const CLIENT_ROUTES = new Set([
	'GET /photos/pending',
	'GET /photos/trash',
	'POST /photos/approve',
	'POST /photos/reject',
	'GET /guestbook/pending',
	'GET /guestbook/all',
	'POST /guestbook/approve',
	'POST /guestbook/trash',
	'GET /admin/stats',
	'GET /auth/role',
	'GET /list-uploads',
	'POST /approve',
	'GET /guestbook',
]);

export default {
	async scheduled(event: ScheduledController, env: WorkerEnv): Promise<void> {
		if (event.cron === '*/2 * * * *') {
			// Auto-moderate pending photos only.  KV cache is NOT refreshed here
			// to stay within the free-tier 1,000 writes/day limit.
			// KV is self-primed on first read (KV miss → Neon → KV write) and
			// invalidated on every admin write via bumpLastChange().
			// A full cache refresh runs once per day via the Sunday cron.
			await autoModeratePending(env);
		} else if (event.cron === '0 4 * * *') {
			// Daily 4:00 UTC cache refresh — primes KV so morning visitors get a
			// cache HIT instead of a cold Neon query.  3 KV writes/day max.
			await refreshAllCaches(env);
		} else if (event.cron === '0 10 * * 0') {
			// Weekly egress + activity report — Sunday 10:00 UTC.
			await sendWeeklyReport(env);
		}
	},

	async fetch(request: Request, env: WorkerEnv): Promise<Response> {
		// -----------------------------------------------------------------------
		// 1. Cloudflare-level checks (geo, bot score, ASN, rate limit).
		//    These run before any Supabase call.
		// -----------------------------------------------------------------------
		const cf = (request as unknown as { cf?: CfProperties }).cf;

		// Block non-US traffic.
		if (cf?.country && cf.country !== 'US') {
			return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
		}

		// Optional: block non-Midwest US states (env var RESTRICT_TO_MIDWEST=true).
		if (env.RESTRICT_TO_MIDWEST === 'true' && cf?.country === 'US' && cf?.region) {
			if (!MIDWEST_STATES.has(cf.region)) {
				return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
			}
		}

		// Block low-confidence bot scores (1 = definite bot, 99 = definitely human).
		// Verified bots (Googlebot, Bingbot) are exempted via verifiedBot flag.
		const botScore = cf?.botManagement?.score;
		const verifiedBot = cf?.botManagement?.verifiedBot ?? false;
		if (!verifiedBot && botScore !== undefined && botScore < 30) {
			return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
		}

		// Block requests from known cloud provider ASNs (AWS, GCP, Azure, etc.).
		if (cf?.asn !== undefined && CLOUD_ASNS.has(cf.asn)) {
			return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
		}

		// Per-IP rate limiting.
		const clientIp = request.headers.get('CF-Connecting-IP') || '';
		if (clientIp && workerIsRateLimited(clientIp)) {
			return new Response(JSON.stringify({ error: 'Too Many Requests' }), {
				status: 429,
				headers: { 'Retry-After': '60' },
			});
		}

		// -----------------------------------------------------------------------
		// 2. User-agent checks.
		// -----------------------------------------------------------------------
		// Block requests with no user-agent or known scraper user-agents.
		// This is a best-effort deterrent; determined bots can spoof UAs.
		const ua = (request.headers.get('user-agent') ?? '').toLowerCase();
		const BAD_UA_PATTERNS = [
			'python-requests', 'python-urllib', 'scrapy', 'go-http-client',
			'java/', 'libwww-perl', 'wget', 'curl/', 'masscan', 'zgrab',
			'nikto', 'sqlmap', 'ahrefsbot', 'semrushbot', 'mj12bot',
			'serpstatbot', 'bytespider', 'gptbot', 'ccbot', 'claudebot',
		];
		if (!ua || BAD_UA_PATTERNS.some((p) => ua.includes(p))) {
			return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
		}

		// Origin allowlist: only allow requests from the configured site origins.
		// SITE_ORIGIN can be a comma-separated list of allowed origins.
		// Falls back to open (no restriction) if SITE_ORIGIN is not set.
		const requestOrigin = request.headers.get('origin');
		if (env.SITE_ORIGIN && requestOrigin) {
			const allowed = [
				...env.SITE_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
				...(env.ADMIN_ORIGIN ? [env.ADMIN_ORIGIN.trim()] : []),
			];
			if (!allowed.includes(requestOrigin)) {
				return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
			}
		}

		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: corsHeaders(request, env) });
		}

		const url = new URL(request.url);
		const path = url.pathname.replace(/\/$/, '') || '/';
		const routeKey = `${request.method} ${path}`;

		if (ADMIN_ONLY_ROUTES.has(routeKey) && !isAdminRequest(request, env)) {
			return withCors(request, env, json({ error: 'Unauthorized' }, 401));
		} else if (CLIENT_ROUTES.has(routeKey) && !isClientOrAdminRequest(request, env)) {
			return withCors(request, env, json({ error: 'Unauthorized' }, 401));
		}

		try {
			switch (routeKey) {
				// ACTIVE-ALTERNATE: runtime secrets verification endpoint
				// Use after every deploy to confirm Worker env bindings are present.
				// Hit GET /health — expected response: {"ok":true,"url":true,"key":true}
				// Safe to keep permanently; it exposes no secrets, only boolean presence.
				case 'GET /health':
					return withCors(request, env, json({
						ok: Boolean(env.DATABASE_URL),
						db: Boolean(env.DATABASE_URL),
					}));
				// Returns the last-change timestamp from KV so clients can decide
				// whether to refetch full data.  Pure KV read — never touches Neon.
				case 'GET /cache/status': {
					const lastChange = env.CACHE ? await env.CACHE.get(KV_LAST_CHANGE_KEY) : null;
					return withCors(request, env, new Response(JSON.stringify({ last_change: lastChange }), {
						status: 200,
						headers: { 'content-type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
					}));
				}
				case 'GET /auth/role':
					return withCors(request, env, json({
						role: isAdminRequest(request, env) ? 'admin' : 'client',
					}));
				case 'GET /photos/pending':
					return withCors(request, env, await listPendingPhotos(env));			case 'GET /photos/trash':
				return withCors(request, env, await listTrashPhotos(env));				case 'GET /photos/approved':
					return withCors(request, env, await listApprovedPhotos(env, url));			case 'POST /photos/react':
				return withCors(request, env, await reactToPhoto(request, env));				case 'POST /photos/approve':
					return withCors(request, env, await approvePhotoById(request, env));
				case 'POST /photos/reject':
					return withCors(request, env, await rejectPhotoById(request, env));
				case 'POST /photos/purge':
					return withCors(request, env, await purgePhotoById(request, env));
				case 'GET /guestbook/pending':
					return withCors(request, env, await listPendingGuestbook(env));
				case 'GET /guestbook/all':
					return withCors(request, env, await listAllGuestbook(env, url));
				case 'GET /guestbook/approved':
					return withCors(request, env, await listApprovedGuestbook(env, url));
				case 'POST /guestbook/approve':
					return withCors(request, env, await approveGuestbookById(request, env));
				case 'POST /guestbook/trash':
					return withCors(request, env, await trashGuestbookById(request, env));
				case 'POST /guestbook/delete':
					return withCors(request, env, await deleteGuestbookById(request, env));
				case 'GET /admin/stats':
					return withCors(request, env, await adminStats(env));
				case 'GET /report':
					// Manually trigger the weekly egress report (admin-only).
					// Auth is enforced by the ADMIN_ONLY_ROUTES set check above.
					return withCors(request, env, await getReportResponse(env));

				// Legacy aliases kept for compatibility with already-wired UI flows.
				case 'GET /list-uploads':
					return withCors(request, env, await listUploads(env));
				case 'POST /approve':
					return withCors(request, env, await approvePhoto(request, env));
				case 'POST /delete':
					return withCors(request, env, await deletePhoto(request, env));
				case 'GET /guestbook':
					return withCors(request, env, await listGuestbook(env));
				default:
					return withCors(request, env, json({ error: 'Not found' }, 404));
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unexpected error';
			return withCors(request, env, json({ error: message }, 500));
		}
	},
} satisfies ExportedHandler<WorkerEnv>;

function getDb(env: WorkerEnv) {
	if (!env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
	return neon(env.DATABASE_URL);
}

// Delete one or more files from UploadThing by their file keys.
// Fails silently so DB operations are never blocked by storage errors.
async function deleteUploadThingFiles(keys: string[], token: string | undefined): Promise<void> {
	if (!keys.length || !token) return;
	try {
		await fetch('https://api.uploadthing.com/v6/deleteFiles', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-uploadthing-api-key': token,
			},
			body: JSON.stringify({ fileKeys: keys }),
		});
	} catch {
		// fail open
	}
}

// ---------------------------------------------------------------------------
// Auto-moderation (NSFW classifier via HuggingFace)
// ---------------------------------------------------------------------------

const HF_MODEL = 'Falconsai/nsfw_image_detection';
const NSFW_THRESHOLD = 0.95;

// Returns true = confirmed NSFW (auto-trash), false = confirmed safe (auto-approve),
// null = classifier unavailable or inconclusive (leave in pending for manual review).
async function classifyNsfw(imageBytes: ArrayBuffer, env: WorkerEnv): Promise<boolean | null> {
	// No token → skip classification, leave in pending.
	if (!env.HF_TOKEN) return null;

	try {
		const response = await fetch(
			`https://api-inference.huggingface.co/models/${HF_MODEL}`,
			{
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${env.HF_TOKEN}`,
					'Content-Type': 'application/octet-stream',
				},
				body: imageBytes,
			},
		);

		// Rate-limited, model loading, or any API error → leave in pending.
		if (!response.ok) return null;

		const results = await response.json() as Array<{ label: string; score: number }>;
		if (!Array.isArray(results) || results.length === 0) return null;

		const nsfwEntry = results.find((r) => r.label?.toLowerCase() === 'nsfw');
		if (!nsfwEntry) return null; // unexpected schema → leave in pending

		// Only flag if above the strict threshold; otherwise confirmed safe.
		return nsfwEntry.score >= NSFW_THRESHOLD ? true : false;
	} catch {
		// Network error, timeout, parse failure — leave in pending.
		return null;
	}
}

async function processPhotoAutomod(
	photo: { id: string; storage_path: string; file_url?: string | null },
	env: WorkerEnv,
): Promise<void> {
	const sql = getDb(env);

	let imageBytes: ArrayBuffer;
	try {
		const imgUrl = photo.file_url?.trim();
		if (!imgUrl) return;
		const imgRes = await fetch(imgUrl);
		if (!imgRes.ok) return;
		imageBytes = await imgRes.arrayBuffer();
	} catch {
		return;
	}

	const result = await classifyNsfw(imageBytes, env);
	if (result === null) return;

	const now = new Date().toISOString();
	if (result === true) {
		await sql`UPDATE photos SET status='rejected', is_visible=false, reviewed_at=${now} WHERE id=${photo.id}`;
	} else {
		await sql`UPDATE photos SET status='approved', is_visible=true, reviewed_at=${now} WHERE id=${photo.id}`;
	}
}

async function autoModeratePending(env: WorkerEnv): Promise<void> {
	const sql = getDb(env);
	const photos = await sql`
		SELECT id, storage_path, file_url FROM photos
		WHERE status = 'pending'
		ORDER BY created_at ASC
		LIMIT 5
	` as Array<{ id: string; storage_path: string; file_url: string | null }>;

	if (!photos.length) return;
	for (const photo of photos) {
		await processPhotoAutomod(photo, env);
	}
}

async function listUploads(env: WorkerEnv): Promise<Response> {
	try {
		const sql = getDb(env);
		const data = await sql`
			SELECT id, storage_path, file_url, original_filename, uploader_name, created_at, status
			FROM photos WHERE status = 'pending'
			ORDER BY created_at DESC LIMIT 1000
		`;
		return json({ data }, 200);
	} catch (err) {
		return json({ error: err instanceof Error ? err.message : 'DB error' }, 500);
	}
}

async function listPendingPhotos(env: WorkerEnv): Promise<Response> {
	try {
		const sql = getDb(env);
		const data = await sql`
			SELECT id, storage_path, file_url, label_raw, label_slug, original_filename,
			       uploader_name, caption, created_at, status, is_visible
			FROM photos WHERE status = 'pending'
			ORDER BY created_at DESC LIMIT 500
		` as Array<Record<string, unknown> & { file_url?: string | null; storage_path: string }>;
		const mapped = data.map((row) => ({
			...row,
			image_url: row.file_url || null,
			filename: getFilename(row.storage_path),
		}));
		return json({ data: mapped }, 200);
	} catch (err) {
		return json({ error: err instanceof Error ? err.message : 'DB error' }, 500);
	}
}

async function listTrashPhotos(env: WorkerEnv): Promise<Response> {
	try {
		const sql = getDb(env);
		const data = await sql`
			SELECT id, storage_path, file_url, label_raw, label_slug, original_filename,
			       uploader_name, caption, created_at, status, is_visible
			FROM photos WHERE status = 'rejected'
			ORDER BY created_at DESC LIMIT 500
		` as Array<Record<string, unknown> & { file_url?: string | null; storage_path: string }>;
		const mapped = data.map((row) => ({
			...row,
			image_url: row.file_url || null,
			filename: getFilename(row.storage_path),
		}));
		return json({ data: mapped }, 200);
	} catch (err) {
		return json({ error: err instanceof Error ? err.message : 'DB error' }, 500);
	}
}

async function listApprovedPhotos(env: WorkerEnv, url: URL): Promise<Response> {
	const weddingSlug = (url.searchParams.get('wedding_slug') || '').trim();
	const sort = url.searchParams.get('sort') === 'popular' ? 'popular' : 'newest';
	const page = Math.max(0, parseInt(url.searchParams.get('page') || '0', 10) || 0);
	const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get('per_page') || '50', 10) || 50));
	const offset = page * perPage;

	// --- KV cache check ---
	// Serve from KV when available.  Neon is only hit on a cold KV miss.
	if (env.CACHE) {
		const key = kvPhotosKey(weddingSlug);
		const cached = await env.CACHE.get(key, 'json') as PhotosKvCache | null;
		if (cached?.photos?.length) {
			let photos = cached.photos as Array<Record<string, unknown> & { created_at: string; love_count?: number | null }>;
			if (sort === 'popular') {
				photos = [...photos].sort((a, b) =>
					((b.love_count ?? 0) - (a.love_count ?? 0)) ||
					(new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
				);
			}
			const paginated = photos.slice(offset, offset + perPage);
			return new Response(JSON.stringify({ data: paginated, total: cached.total, page, per_page: perPage }), {
				status: 200,
				headers: {
					'content-type': 'application/json; charset=utf-8',
					'Cache-Control': 'public, max-age=120, stale-while-revalidate=60',
					'X-Cache': 'HIT',
				},
			});
		}
	}

	// --- KV miss: query Neon and populate KV for next request ---
	type PhotoRow = {
		id: string; wedding_slug?: string | null; storage_path: string; file_url?: string | null;
		label_raw?: string | null; label_slug?: string | null; original_filename?: string | null;
		uploader_name?: string | null; caption?: string | null; created_at: string;
		status: string; is_visible: boolean; love_count?: number | null;
	};

	try {
		const sql = getDb(env);
		let rows: PhotoRow[], countResult: Array<{ count: string }>;

		try {
			if (sort === 'popular') {
				if (weddingSlug) {
					[rows, countResult] = await Promise.all([
						sql`SELECT id, wedding_slug, storage_path, file_url, label_raw, label_slug, original_filename, uploader_name, caption, created_at, status, is_visible, love_count FROM photos WHERE status='approved' AND is_visible=true AND wedding_slug=${weddingSlug} ORDER BY love_count DESC NULLS LAST, created_at DESC LIMIT ${perPage} OFFSET ${offset}` as unknown as Promise<PhotoRow[]>,
						sql`SELECT COUNT(*)::text as count FROM photos WHERE status='approved' AND is_visible=true AND wedding_slug=${weddingSlug}` as unknown as Promise<Array<{ count: string }>>,
					]);
				} else {
					[rows, countResult] = await Promise.all([
						sql`SELECT id, wedding_slug, storage_path, file_url, label_raw, label_slug, original_filename, uploader_name, caption, created_at, status, is_visible, love_count FROM photos WHERE status='approved' AND is_visible=true ORDER BY love_count DESC NULLS LAST, created_at DESC LIMIT ${perPage} OFFSET ${offset}` as unknown as Promise<PhotoRow[]>,
						sql`SELECT COUNT(*)::text as count FROM photos WHERE status='approved' AND is_visible=true` as unknown as Promise<Array<{ count: string }>>,
					]);
				}
			} else {
				if (weddingSlug) {
					[rows, countResult] = await Promise.all([
						sql`SELECT id, wedding_slug, storage_path, file_url, label_raw, label_slug, original_filename, uploader_name, caption, created_at, status, is_visible, love_count FROM photos WHERE status='approved' AND is_visible=true AND wedding_slug=${weddingSlug} ORDER BY created_at DESC LIMIT ${perPage} OFFSET ${offset}` as unknown as Promise<PhotoRow[]>,
						sql`SELECT COUNT(*)::text as count FROM photos WHERE status='approved' AND is_visible=true AND wedding_slug=${weddingSlug}` as unknown as Promise<Array<{ count: string }>>,
					]);
				} else {
					[rows, countResult] = await Promise.all([
						sql`SELECT id, wedding_slug, storage_path, file_url, label_raw, label_slug, original_filename, uploader_name, caption, created_at, status, is_visible, love_count FROM photos WHERE status='approved' AND is_visible=true ORDER BY created_at DESC LIMIT ${perPage} OFFSET ${offset}` as unknown as Promise<PhotoRow[]>,
						sql`SELECT COUNT(*)::text as count FROM photos WHERE status='approved' AND is_visible=true` as unknown as Promise<Array<{ count: string }>>,
					]);
				}
			}
		} catch (e: unknown) {
			// Retry without love_count if column hasn't been migrated yet.
			if (!(e instanceof Error && e.message.includes('love_count'))) throw e;
			if (weddingSlug) {
				[rows, countResult] = await Promise.all([
					sql`SELECT id, wedding_slug, storage_path, file_url, label_raw, label_slug, original_filename, uploader_name, caption, created_at, status, is_visible FROM photos WHERE status='approved' AND is_visible=true AND wedding_slug=${weddingSlug} ORDER BY created_at DESC LIMIT ${perPage} OFFSET ${offset}` as unknown as Promise<PhotoRow[]>,
					sql`SELECT COUNT(*)::text as count FROM photos WHERE status='approved' AND is_visible=true AND wedding_slug=${weddingSlug}` as unknown as Promise<Array<{ count: string }>>,
				]);
			} else {
				[rows, countResult] = await Promise.all([
					sql`SELECT id, wedding_slug, storage_path, file_url, label_raw, label_slug, original_filename, uploader_name, caption, created_at, status, is_visible FROM photos WHERE status='approved' AND is_visible=true ORDER BY created_at DESC LIMIT ${perPage} OFFSET ${offset}` as unknown as Promise<PhotoRow[]>,
					sql`SELECT COUNT(*)::text as count FROM photos WHERE status='approved' AND is_visible=true` as unknown as Promise<Array<{ count: string }>>,
				]);
			}
		}

		const total = parseInt(countResult[0]?.count ?? '0', 10);
		const mapped = rows.map((row) => {
			const fileUrl = row.file_url?.trim() || null;
			const slug = toDownloadSlug(row);
			const downloadUrl = fileUrl ? `${fileUrl}?filename=${encodeURIComponent(slug + '.jpg')}` : null;
			return { ...row, filename: getFilename(row.storage_path), image_url: fileUrl, view_url: fileUrl, download_url: downloadUrl };
		});

		// Populate KV so subsequent requests hit the cache.
		// Use waitUntil-style fire-and-forget via Promise (no ctx available here).
		if (env.CACHE && page === 0 && sort === 'newest') {
			const kvCache: PhotosKvCache = { photos: mapped, total: mapped.length, updated_at: new Date().toISOString() };
			env.CACHE.put(kvPhotosKey(weddingSlug), JSON.stringify(kvCache)).catch(() => {/* fail silently */});
			env.CACHE.put(KV_LAST_CHANGE_KEY, new Date().toISOString()).catch(() => {/* fail silently */});
		}

		const body = JSON.stringify({ data: mapped, total, page, per_page: perPage });
		return new Response(body, {
			status: 200,
			headers: {
				'content-type': 'application/json; charset=utf-8',
				'Cache-Control': 'public, max-age=120, stale-while-revalidate=60',
				'X-Cache': 'MISS',
			},
		});
	} catch (err) {
		return json({ error: err instanceof Error ? err.message : 'DB error' }, 500);
	}
}

// ---------------------------------------------------------------------------
// Love reactions
// ---------------------------------------------------------------------------

async function hashIpForPhoto(ip: string, photoId: string): Promise<string> {
	const data = new TextEncoder().encode(`${photoId}:${ip}`);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

async function reactToPhoto(request: Request, env: WorkerEnv): Promise<Response> {
	const body = await readJson<{ photo_id?: string }>(request);
	if (!body.photo_id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.photo_id)) {
		return json({ error: 'photo_id is required and must be a valid UUID' }, 400);
	}

	const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
	const ipHash = await hashIpForPhoto(ip, body.photo_id);

	try {
		const sql = getDb(env);
		const [row] = await sql`SELECT react_to_photo(${body.photo_id}::uuid, ${ipHash}) as love_count` as Array<{ love_count: number }>;
		return json({ data: { love_count: row.love_count } }, 200);
	} catch (err) {
		return json({ error: err instanceof Error ? err.message : 'DB error' }, 500);
	}
}

async function approvePhoto(request: Request, env: WorkerEnv): Promise<Response> {
	const body = await readJson<{ filename?: string }>(request);
	const filename = normalizeFilename(body.filename);
	if (!filename) return json({ error: 'filename is required' }, 400);

	try {
		const sql = getDb(env);
		await sql`UPDATE photos SET status='approved', is_visible=true, reviewed_at=${new Date().toISOString()} WHERE storage_path=${filename}`;
		await bumpLastChange(env);
		return json({ data: { ok: true } }, 200);
	} catch (err) {
		return json({ error: err instanceof Error ? err.message : 'DB error' }, 500);
	}
}

async function approvePhotoById(request: Request, env: WorkerEnv): Promise<Response> {
	const body = await readJson<{ id?: string }>(request);
	if (!body.id) return json({ error: 'id is required' }, 400);

	try {
		const sql = getDb(env);
		await sql`UPDATE photos SET status='approved', is_visible=true, reviewed_at=${new Date().toISOString()} WHERE id=${body.id}::uuid`;
		await bumpLastChange(env);
		return json({ data: { ok: true, id: body.id } }, 200);
	} catch (err) {
		return json({ error: err instanceof Error ? err.message : 'DB error' }, 500);
	}
}

async function deletePhoto(request: Request, env: WorkerEnv): Promise<Response> {
	const body = await readJson<{ filename?: string }>(request);
	const filename = normalizeFilename(body.filename);
	if (!filename) return json({ error: 'filename is required' }, 400);

	try {
		await deleteUploadThingFiles([filename], env.UPLOADTHING_TOKEN);
		const sql = getDb(env);
		await sql`DELETE FROM photos WHERE storage_path=${filename}`;
		await bumpLastChange(env);
		return json({ data: { ok: true } }, 200);
	} catch (err) {
		return json({ error: err instanceof Error ? err.message : 'DB error' }, 500);
	}
}

async function rejectPhotoById(request: Request, env: WorkerEnv): Promise<Response> {
	const body = await readJson<{ id?: string }>(request);
	if (!body.id) return json({ error: 'id is required' }, 400);

	try {
		const sql = getDb(env);
		await sql`UPDATE photos SET status='rejected', is_visible=false, reviewed_at=${new Date().toISOString()} WHERE id=${body.id}::uuid`;
		await bumpLastChange(env);
		return json({ data: { ok: true, id: body.id } }, 200);
	} catch (err) {
		return json({ error: err instanceof Error ? err.message : 'DB error' }, 500);
	}
}

async function purgePhotoById(request: Request, env: WorkerEnv): Promise<Response> {
	const body = await readJson<{ id?: string }>(request);
	if (!body.id) return json({ error: 'id is required' }, 400);

	try {
		const sql = getDb(env);
		const [photo] = await sql`SELECT storage_path FROM photos WHERE id=${body.id}::uuid` as Array<{ storage_path: string } | undefined>;
		if (!photo) return json({ error: 'photo not found' }, 404);

		await deleteUploadThingFiles([photo.storage_path], env.UPLOADTHING_TOKEN);
		await sql`DELETE FROM photos WHERE id=${body.id}::uuid`;
		await bumpLastChange(env);
		return json({ data: { ok: true, id: body.id } }, 200);
	} catch (err) {
		return json({ error: err instanceof Error ? err.message : 'DB error' }, 500);
	}
}

async function listGuestbook(env: WorkerEnv): Promise<Response> {
	try {
		const sql = getDb(env);
		const data = await sql`SELECT * FROM guestbook_entries ORDER BY created_at DESC LIMIT 500`;
		return json({ data }, 200);
	} catch (err) {
		return json({ error: err instanceof Error ? err.message : 'DB error' }, 500);
	}
}

async function listPendingGuestbook(env: WorkerEnv): Promise<Response> {
	try {
		const sql = getDb(env);
		const data = await sql`SELECT * FROM guestbook_entries WHERE is_visible=false ORDER BY created_at DESC LIMIT 500`;
		return json({ data }, 200);
	} catch (err) {
		return json({ error: err instanceof Error ? err.message : 'DB error' }, 500);
	}
}

async function listApprovedGuestbook(env: WorkerEnv, url: URL): Promise<Response> {
	const weddingSlug = (url.searchParams.get('wedding_slug') || '').trim();

	// --- KV cache check ---
	if (env.CACHE) {
		const key = kvGuestbookKey(weddingSlug);
		const cached = await env.CACHE.get(key, 'json') as GuestbookKvCache | null;
		if (cached?.entries) {
			return new Response(JSON.stringify({ data: cached.entries }), {
				status: 200,
				headers: {
					'content-type': 'application/json; charset=utf-8',
					'Cache-Control': 'public, max-age=120, stale-while-revalidate=60',
					'X-Cache': 'HIT',
				},
			});
		}
	}

	// --- KV miss: query Neon ---
	try {
		const sql = getDb(env);
		const data = weddingSlug
			? await sql`SELECT id, wedding_slug, display_name, family_name, message, side, created_at FROM guestbook_entries WHERE is_visible=true AND wedding_slug=${weddingSlug} ORDER BY created_at DESC LIMIT 500`
			: await sql`SELECT id, wedding_slug, display_name, family_name, message, side, created_at FROM guestbook_entries WHERE is_visible=true ORDER BY created_at DESC LIMIT 500`;

		// Populate KV so next request is served from cache.
		if (env.CACHE) {
			const kvCache: GuestbookKvCache = { entries: data as Array<Record<string, unknown>>, total: data.length, updated_at: new Date().toISOString() };
			env.CACHE.put(kvGuestbookKey(weddingSlug), JSON.stringify(kvCache)).catch(() => {/* fail silently */});
		}

		return new Response(JSON.stringify({ data }), {
			status: 200,
			headers: {
				'content-type': 'application/json; charset=utf-8',
				'Cache-Control': 'public, max-age=120, stale-while-revalidate=60',
				'X-Cache': 'MISS',
			},
		});
	} catch (err) {
		return json({ error: err instanceof Error ? err.message : 'DB error' }, 500);
	}
}

async function listAllGuestbook(env: WorkerEnv, url: URL): Promise<Response> {
	const weddingSlug = (url.searchParams.get('wedding_slug') || '').trim();
	try {
		const sql = getDb(env);
		const data = weddingSlug
			? await sql`SELECT id, display_name, family_name, message, side, is_visible, created_at FROM guestbook_entries WHERE wedding_slug=${weddingSlug} ORDER BY created_at DESC LIMIT 500`
			: await sql`SELECT id, display_name, family_name, message, side, is_visible, created_at FROM guestbook_entries ORDER BY created_at DESC LIMIT 500`;
		return json({ data }, 200);
	} catch (err) {
		return json({ error: err instanceof Error ? err.message : 'DB error' }, 500);
	}
}

async function approveGuestbookById(request: Request, env: WorkerEnv): Promise<Response> {
	const body = await readJson<{ id?: string }>(request);
	if (!body.id) return json({ error: 'id is required' }, 400);

	try {
		const sql = getDb(env);
		await sql`UPDATE guestbook_entries SET is_visible=true WHERE id=${body.id}::uuid`;
		await bumpLastChange(env);
		return json({ data: { ok: true, id: body.id } }, 200);
	} catch (err) {
		return json({ error: err instanceof Error ? err.message : 'DB error' }, 500);
	}
}

async function trashGuestbookById(request: Request, env: WorkerEnv): Promise<Response> {
	const body = await readJson<{ id?: string }>(request);
	if (!body.id) return json({ error: 'id is required' }, 400);

	try {
		const sql = getDb(env);
		await sql`UPDATE guestbook_entries SET is_visible=false WHERE id=${body.id}::uuid`;
		await bumpLastChange(env);
		return json({ data: { ok: true, id: body.id } }, 200);
	} catch (err) {
		return json({ error: err instanceof Error ? err.message : 'DB error' }, 500);
	}
}

async function deleteGuestbookById(request: Request, env: WorkerEnv): Promise<Response> {
	const body = await readJson<{ id?: string }>(request);
	if (!body.id) return json({ error: 'id is required' }, 400);

	try {
		const sql = getDb(env);
		await sql`DELETE FROM guestbook_entries WHERE id=${body.id}::uuid`;
		await bumpLastChange(env);
		return json({ data: { ok: true, id: body.id } }, 200);
	} catch (err) {
		return json({ error: err instanceof Error ? err.message : 'DB error' }, 500);
	}
}

async function adminStats(env: WorkerEnv): Promise<Response> {
	try {
		const sql = getDb(env);
		const [photosResult, guestbookResult] = await Promise.all([
			sql`SELECT COUNT(*)::text as count FROM photos WHERE status='pending'` as unknown as Promise<Array<{ count: string }>>,
			sql`SELECT COUNT(*)::text as count FROM guestbook_entries WHERE is_visible=false` as unknown as Promise<Array<{ count: string }>>,
		]);
		return json({
			data: {
				pending_photos: parseInt(photosResult[0]?.count ?? '0', 10),
				pending_guestbook: parseInt(guestbookResult[0]?.count ?? '0', 10),
			},
		});
	} catch (err) {
		return json({ error: err instanceof Error ? err.message : 'DB error' }, 500);
	}
}

async function readJson<T>(request: Request): Promise<T> {
	const contentType = request.headers.get('content-type') || '';
	if (!contentType.includes('application/json')) {
		throw new Error('Expected application/json body');
	}

	return (await request.json()) as T;
}

function normalizeFilename(filename?: string): string | null {
	if (!filename) {
		return null;
	}

	const trimmed = filename.trim().replace(/^\/+/, '');
	if (!trimmed || trimmed.includes('..') || trimmed.includes('/')) {
		return null;
	}

	return trimmed;
}

function getFilename(path: string): string {
	const part = path.split('/').pop();
	return part || path;
}

function toDownloadSlug(row: { label_slug?: string | null; label_raw?: string | null; original_filename?: string | null }): string {
	const source = row.label_slug?.trim()
		|| row.label_raw?.trim()
		|| row.original_filename?.trim()
		|| 'wedding-photo';
	return source
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		|| 'wedding-photo';
}

function getBearerToken(request: Request): string | null {
	const authHeader = request.headers.get('authorization') || '';
	const match = authHeader.match(/^Bearer\s+(.+)$/i);
	return match ? match[1] : null;
}

function isAdminRequest(request: Request, env: WorkerEnv): boolean {
	if (isLocalDevRequest(request)) return true;
	if (!env.ADMIN_PASSWORD) return false;
	return getBearerToken(request) === env.ADMIN_PASSWORD;
}

function isClientOrAdminRequest(request: Request, env: WorkerEnv): boolean {
	if (isLocalDevRequest(request)) return true;
	const token = getBearerToken(request);
	if (!token) return false;
	if (env.ADMIN_PASSWORD && token === env.ADMIN_PASSWORD) return true;
	if (env.CLIENT_PASSWORD && token === env.CLIENT_PASSWORD) return true;
	return false;
}

function isLocalDevRequest(request: Request): boolean {
	const requestUrl = new URL(request.url);
	if (isLocalHostname(requestUrl.hostname)) {
		return true;
	}

	const origin = request.headers.get('origin');
	if (origin) {
		try {
			const originUrl = new URL(origin);
			if (isLocalHostname(originUrl.hostname)) {
				return true;
			}
		} catch {
			return false;
		}
	}

	const referer = request.headers.get('referer');
	if (referer) {
		try {
			const refererUrl = new URL(referer);
			return isLocalHostname(refererUrl.hostname);
		} catch {
			return false;
		}
	}

	return false;
}

// ---------------------------------------------------------------------------
// Weekly egress + activity report
// ---------------------------------------------------------------------------

async function getReportResponse(env: WorkerEnv): Promise<Response> {
	const report = await buildWeeklyReport(env);
	return json(report);
}

async function buildWeeklyReport(env: WorkerEnv): Promise<Record<string, unknown>> {
	const sql = getDb(env);
	const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

	const [allPhotosResult, weeklyPhotos, weeklyGuestbookResult, pendingPhotosResult] = await Promise.all([
		sql`SELECT COUNT(*)::text as count FROM photos` as unknown as Promise<Array<{ count: string }>>,
		sql`SELECT status, uploader_name FROM photos WHERE created_at >= ${weekAgo}` as unknown as Promise<Array<{ status: string; uploader_name: string | null }>>,
		sql`SELECT COUNT(*)::text as count FROM guestbook_entries WHERE created_at >= ${weekAgo}` as unknown as Promise<Array<{ count: string }>>,
		sql`SELECT COUNT(*)::text as count FROM photos WHERE status='pending'` as unknown as Promise<Array<{ count: string }>>,
	]);

	const photos = weeklyPhotos ?? [];
	const approved = photos.filter((p) => p.status === 'approved').length;
	const pending  = photos.filter((p) => p.status === 'pending').length;
	const rejected = photos.filter((p) => p.status === 'rejected').length;

	const uploaderCounts: Record<string, number> = {};
	for (const p of photos) {
		const name = p.uploader_name ?? 'unknown';
		uploaderCounts[name] = (uploaderCounts[name] ?? 0) + 1;
	}
	const topUploaders = Object.entries(uploaderCounts)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5)
		.map(([name, count]) => ({ name, count }));
	const suspicious = topUploaders.filter((u) => u.count > 20);

	return {
		generated_at: new Date().toUTCString(),
		period: 'last 7 days',
		storage_provider: 'UploadThing',
		photos: {
			total_all_time: parseInt(allPhotosResult[0]?.count ?? '0', 10),
			this_week: photos.length,
			approved,
			pending,
			rejected,
			currently_in_review: parseInt(pendingPhotosResult[0]?.count ?? '0', 10),
		},
		guestbook: {
			new_entries_this_week: parseInt(weeklyGuestbookResult[0]?.count ?? '0', 10),
		},
		top_uploaders: topUploaders,
		suspicious_uploaders: suspicious,
	};
}

async function sendWeeklyReport(env: WorkerEnv): Promise<void> {
	if (!env.SLACK_WEBHOOK_URL) return; // No webhook configured — silently skip.

	try {
		const report = await buildWeeklyReport(env);
		const { photos, guestbook, top_uploaders, suspicious_uploaders } = report as {
			photos: { total_all_time: number; this_week: number; approved: number; pending: number; rejected: number; currently_in_review: number };
			guestbook: { new_entries_this_week: number };
			top_uploaders: Array<{ name: string; count: number }>;
			suspicious_uploaders: Array<{ name: string; count: number }>;
		};

		const lines = [
			'*📸 Weekly Wedding Site Report*',
			'',
			`*Photos this week:* ${photos.this_week} (approved: ${photos.approved}, pending: ${photos.pending}, rejected: ${photos.rejected})`,
			`*Total photos:* ${photos.total_all_time} | *Currently in review:* ${photos.currently_in_review}`,
			`*New guestbook entries:* ${guestbook.new_entries_this_week}`,
		];

		if (top_uploaders.length > 0) {
			lines.push('', '*Top uploaders this week:*');
			for (const u of top_uploaders) lines.push(`  • ${u.name}: ${u.count} photos`);
		}

		if (suspicious_uploaders.length > 0) {
			lines.push('', `*⚠️ Suspicious activity:* ${suspicious_uploaders.length} uploader(s) submitted > 20 photos`);
			for (const u of suspicious_uploaders) lines.push(`  • ${u.name}: ${u.count} photos`);
		}

		lines.push('', `_Generated: ${new Date().toUTCString()}_`);

		await fetch(env.SLACK_WEBHOOK_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ text: lines.join('\n') }),
		});
	} catch {
		// Silently ignore report delivery failures — don't break other cron work.
	}
}

function isLocalHostname(hostname: string): boolean {
	return hostname === 'localhost' || hostname === '127.0.0.1';
}

function json(payload: unknown, status = 200): Response {
	return new Response(JSON.stringify(payload), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
	});
}

function corsHeaders(request: Request, env: WorkerEnv): HeadersInit {
	const requestOrigin = request.headers.get('origin');
	const allowedOrigin = env.ADMIN_ORIGIN ?? requestOrigin ?? '*';

	return {
		'Access-Control-Allow-Origin': allowedOrigin,
		'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		Vary: 'Origin',
	};
}

function withCors(request: Request, env: WorkerEnv, response: Response): Response {
	const headers = new Headers(response.headers);
	for (const [key, value] of Object.entries(corsHeaders(request, env))) {
		headers.set(key, value);
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}
