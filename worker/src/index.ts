import { createClient } from '@supabase/supabase-js';

type WorkerEnv = {
	SUPABASE_URL: string;
	SUPABASE_SERVICE_ROLE_KEY: string;
	ADMIN_PASSWORD?: string;
	CLIENT_PASSWORD?: string;
	ADMIN_ORIGIN?: string;
	SITE_ORIGIN?: string; // Public site origin, e.g. https://your-site.vercel.app
	HF_TOKEN?: string; // HuggingFace API token for auto-moderation (optional — fails open if absent)
};

const BUCKET = 'wedding-photos';
const UPLOADS_PREFIX = 'uploads';
const APPROVED_PREFIX = 'approved';
const TRASH_PREFIX = 'trash';

// Routes requiring full admin password (permanent destructive operations)
const ADMIN_ONLY_ROUTES = new Set([
	'POST /photos/purge',
	'POST /delete',
	'POST /guestbook/delete',
]);

// Routes accessible to both admin and client passwords
const CLIENT_ROUTES = new Set([
	'GET /photos/pending',
	'GET /photos/trash',
	'POST /photos/approve',
	'POST /photos/reject',
	'GET /guestbook/pending',
	'POST /guestbook/approve',
	'GET /admin/stats',
	'GET /auth/role',
	'GET /list-uploads',
	'POST /approve',
	'GET /guestbook',
]);

export default {
	async scheduled(event: ScheduledController, env: WorkerEnv): Promise<void> {
		if (event.cron === '*/2 * * * *') {
			// Auto-moderate pending photos every 2 minutes
			await autoModeratePending(env);
		} else {
			// Daily keep-alive ping — resets Supabase's 7-day auto-pause timer.
			await fetch(`${env.SUPABASE_URL}/rest/v1/photos?select=id&limit=1`, {
				headers: {
					apikey: env.SUPABASE_SERVICE_ROLE_KEY,
					Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
				},
			});
		}
	},

	async fetch(request: Request, env: WorkerEnv): Promise<Response> {
		// Block requests with no user-agent or known scraper user-agents.
		// This is a best-effort deterrent; determined bots can spoof UAs.
		const ua = (request.headers.get('user-agent') ?? '').toLowerCase();
		const BAD_UA_PATTERNS = [
			'python-requests', 'python-urllib', 'scrapy', 'go-http-client',
			'java/', 'libwww-perl', 'wget', 'curl/', 'masscan', 'zgrab',
			'nikto', 'sqlmap', 'ahrefsbot', 'semrushbot', 'mj12bot',
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
				// Temporary runtime verification endpoint.
				// Purpose: confirm Worker secrets are present after deploy.
				// Expected output at /health:
				// {"ok":true,"url":true,"key":true}
				// You can keep this route during rollout, or remove/comment it after verification.
				case 'GET /health':
					return withCors(request, env, json({
						ok: Boolean(env.SUPABASE_URL) && Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
						url: Boolean(env.SUPABASE_URL),
						key: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
					}));
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
				case 'GET /guestbook/approved':
					return withCors(request, env, await listApprovedGuestbook(env, url));
				case 'POST /guestbook/approve':
					return withCors(request, env, await approveGuestbookById(request, env));
				case 'POST /guestbook/delete':
					return withCors(request, env, await deleteGuestbookById(request, env));
				case 'GET /admin/stats':
					return withCors(request, env, await adminStats(env));

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

function getClient(env: WorkerEnv) {
	if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
		throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
	}

	return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
		auth: { persistSession: false },
	});
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
	photo: { id: string; storage_path: string },
	env: WorkerEnv,
): Promise<void> {
	const supabase = getClient(env);

	// Download raw image bytes using the service role key.
	let imageBytes: ArrayBuffer;
	try {
		const imgRes = await fetch(
			`${env.SUPABASE_URL}/storage/v1/object/authenticated/${BUCKET}/${photo.storage_path}`,
			{ headers: { Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } },
		);
		if (!imgRes.ok) return; // fail open — can't fetch, leave as pending
		imageBytes = await imgRes.arrayBuffer();
	} catch {
		return; // fail open
	}

	const result = await classifyNsfw(imageBytes, env);

	if (result === null) {
		// Classifier unavailable or inconclusive — leave in pending for manual review.
		return;
	}

	if (result === true) {
		// Auto-trash: confirmed explicit content.
		const targetPath = `${TRASH_PREFIX}/${getFilename(photo.storage_path)}`;
		const { error: moveErr } = await supabase.storage.from(BUCKET).move(photo.storage_path, targetPath);
		if (moveErr) return;
		await supabase.from('photos').update({
			status: 'rejected',
			is_visible: false,
			reviewed_at: new Date().toISOString(),
			storage_path: targetPath,
		}).eq('id', photo.id);
	} else {
		// Auto-approve: classifier confirmed safe.
		const targetPath = `${APPROVED_PREFIX}/${getFilename(photo.storage_path)}`;
		const { error: moveErr } = await supabase.storage.from(BUCKET).move(photo.storage_path, targetPath);
		if (moveErr) return;
		await supabase.from('photos').update({
			status: 'approved',
			is_visible: true,
			reviewed_at: new Date().toISOString(),
			storage_path: targetPath,
		}).eq('id', photo.id);
	}
}

async function autoModeratePending(env: WorkerEnv): Promise<void> {
	const supabase = getClient(env);
	const { data: photos, error } = await supabase
		.from('photos')
		.select('id, storage_path')
		.eq('status', 'pending')
		.order('created_at', { ascending: true })
		.limit(5); // process at most 5 per run to stay within CPU budget

	if (error || !photos || photos.length === 0) return;

	for (const photo of photos) {
		await processPhotoAutomod(photo, env);
	}
}

async function listUploads(env: WorkerEnv): Promise<Response> {
	const supabase = getClient(env);
	const { data, error } = await supabase.storage.from(BUCKET).list(UPLOADS_PREFIX, {
		limit: 1000,
		offset: 0,
		sortBy: { column: 'created_at', order: 'desc' },
	});

	if (error) {
		return json({ error: error.message }, 500);
	}

	return json({ data }, 200);
}

async function listPendingPhotos(env: WorkerEnv): Promise<Response> {
	const supabase = getClient(env);
	const { data, error } = await supabase
		.from('photos')
		.select('id, storage_path, label_raw, label_slug, original_filename, uploader_name, caption, created_at, status, is_visible')
		.eq('status', 'pending')
		.order('created_at', { ascending: false })
		.limit(500);

	if (error) {
		return json({ error: error.message }, 500);
	}

	const mapped = (data || []).map((row) => ({
		...row,
		filename: getFilename(row.storage_path),
	}));

	return json({ data: mapped }, 200);
}

async function listTrashPhotos(env: WorkerEnv): Promise<Response> {
	const supabase = getClient(env);
	const { data, error } = await supabase
		.from('photos')
		.select('id, storage_path, label_raw, label_slug, original_filename, uploader_name, caption, created_at, status, is_visible')
		.eq('status', 'rejected')
		.order('created_at', { ascending: false })
		.limit(500);

	if (error) {
		return json({ error: error.message }, 500);
	}

	const rows = data || [];
	const signed = await Promise.all(rows.map(async (row) => {
		const { data: signedData, error: signedError } = await supabase
			.storage
			.from(BUCKET)
			.createSignedUrl(row.storage_path, 60 * 60);

		const signedUrl = signedError || !signedData?.signedUrl
			? null
			: toAbsoluteUrl(env.SUPABASE_URL, signedData.signedUrl);

		return {
			...row,
			filename: getFilename(row.storage_path),
			image_url: signedUrl,
		};
	}));

	return json({ data: signed }, 200);
}

async function listApprovedPhotos(env: WorkerEnv, url: URL): Promise<Response> {
	const supabase = getClient(env);
	const weddingSlug = (url.searchParams.get('wedding_slug') || '').trim();

	// Try with love_count first (requires migration); fall back without it if the column is missing.
	const baseSelect = 'id, wedding_slug, storage_path, label_raw, label_slug, original_filename, uploader_name, caption, created_at, status, is_visible';

	const buildQuery = (select: string) => {
		let q = supabase
			.from('photos')
			.select(select)
			.eq('status', 'approved')
			.eq('is_visible', true)
			.order('created_at', { ascending: false })
			.limit(500);
		if (weddingSlug) q = q.eq('wedding_slug', weddingSlug);
		return q;
	};

	let { data, error } = await buildQuery(`${baseSelect}, love_count`);

	// If love_count column doesn't exist yet (migration pending), retry without it.
	if (error && error.message.includes('love_count')) {
		({ data, error } = await buildQuery(baseSelect));
	}

	if (error) {
		return json({ error: error.message }, 500);
	}

	const rows = data || [];
	const signed = await Promise.all(rows.map(async (row) => {
		const { data: signedData, error: signedError } = await supabase
			.storage
			.from(BUCKET)
			.createSignedUrl(row.storage_path, 60 * 60, {
				transform: { width: 600, quality: 70 },
			});

		const signedUrl = signedError || !signedData?.signedUrl
			? null
			: toAbsoluteUrl(env.SUPABASE_URL, signedData.signedUrl);

		const slug = toDownloadSlug(row);
		const downloadUrl = signedUrl ? `${signedUrl}&download=${slug}.jpg` : null;

		return {
			...row,
			filename: getFilename(row.storage_path),
			image_url: signedUrl,
			download_url: downloadUrl,
		};
	}));

	return json({ data: signed }, 200);
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

	// Basic UUID format validation to reject obvious junk before hitting the DB.
	if (!body.photo_id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.photo_id)) {
		return json({ error: 'photo_id is required and must be a valid UUID' }, 400);
	}

	// Cloudflare provides the real client IP in this header.
	const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

	// Hash <photo_id>:<ip> so the same IP can't be correlated across different photos.
	const ipHash = await hashIpForPhoto(ip, body.photo_id);

	const supabase = getClient(env);
	const { data, error } = await supabase.rpc('react_to_photo', {
		p_photo_id: body.photo_id,
		p_ip_hash: ipHash,
	});

	if (error) {
		return json({ error: error.message }, 500);
	}

	return json({ data: { love_count: data as number } }, 200);
}

async function approvePhoto(request: Request, env: WorkerEnv): Promise<Response> {
	const body = await readJson<{ filename?: string }>(request);
	const filename = normalizeFilename(body.filename);

	if (!filename) {
		return json({ error: 'filename is required' }, 400);
	}

	const supabase = getClient(env);
	const sourcePath = `${UPLOADS_PREFIX}/${filename}`;
	const targetPath = `${APPROVED_PREFIX}/${filename}`;

	const { data, error } = await supabase.storage.from(BUCKET).move(sourcePath, targetPath);

	if (error) {
		return json({ error: error.message }, 500);
	}

	await supabase
		.from('photos')
		.update({
			status: 'approved',
			is_visible: true,
			reviewed_at: new Date().toISOString(),
			storage_path: targetPath,
		})
		.eq('storage_path', sourcePath);

	return json({ data }, 200);
}

async function approvePhotoById(request: Request, env: WorkerEnv): Promise<Response> {
	const body = await readJson<{ id?: string }>(request);
	if (!body.id) {
		return json({ error: 'id is required' }, 400);
	}

	const supabase = getClient(env);
	const { data: photo, error: findError } = await supabase
		.from('photos')
		.select('id, storage_path, status')
		.eq('id', body.id)
		.single();

	if (findError || !photo) {
		return json({ error: findError?.message || 'photo not found' }, 404);
	}

	const sourcePath = photo.storage_path;
	const targetPath = sourcePath.startsWith(`${UPLOADS_PREFIX}/`)
		? `${APPROVED_PREFIX}/${getFilename(sourcePath)}`
		: sourcePath;

	if (sourcePath !== targetPath) {
		const { error: moveError } = await supabase.storage.from(BUCKET).move(sourcePath, targetPath);
		if (moveError) {
			return json({ error: moveError.message }, 500);
		}
	}

	const { error: updateError } = await supabase
		.from('photos')
		.update({
			status: 'approved',
			is_visible: true,
			reviewed_at: new Date().toISOString(),
			storage_path: targetPath,
		})
		.eq('id', body.id);

	if (updateError) {
		return json({ error: updateError.message }, 500);
	}

	return json({ data: { ok: true, id: body.id, storage_path: targetPath } }, 200);
}

async function deletePhoto(request: Request, env: WorkerEnv): Promise<Response> {
	const body = await readJson<{ filename?: string }>(request);
	const filename = normalizeFilename(body.filename);

	if (!filename) {
		return json({ error: 'filename is required' }, 400);
	}

	const supabase = getClient(env);
	const filePath = `${UPLOADS_PREFIX}/${filename}`;
	const { data, error } = await supabase.storage.from(BUCKET).remove([filePath]);

	if (error) {
		return json({ error: error.message }, 500);
	}

	await supabase
		.from('photos')
		.update({
			status: 'rejected',
			is_visible: false,
			reviewed_at: new Date().toISOString(),
		})
		.eq('storage_path', filePath);

	return json({ data }, 200);
}

async function rejectPhotoById(request: Request, env: WorkerEnv): Promise<Response> {
	const body = await readJson<{ id?: string }>(request);
	if (!body.id) {
		return json({ error: 'id is required' }, 400);
	}

	const supabase = getClient(env);
	const { data: photo, error: findError } = await supabase
		.from('photos')
		.select('id, storage_path')
		.eq('id', body.id)
		.single();

	if (findError || !photo) {
		return json({ error: findError?.message || 'photo not found' }, 404);
	}

	// Move to trash/ (reversible). Permanent deletion requires POST /photos/purge (admin only).
	const targetPath = `${TRASH_PREFIX}/${getFilename(photo.storage_path)}`;
	const { error: moveError } = await supabase.storage.from(BUCKET).move(photo.storage_path, targetPath);
	if (moveError) {
		return json({ error: moveError.message }, 500);
	}

	const { error: updateError } = await supabase
		.from('photos')
		.update({
			status: 'rejected',
			is_visible: false,
			reviewed_at: new Date().toISOString(),
			storage_path: targetPath,
		})
		.eq('id', body.id);

	if (updateError) {
		return json({ error: updateError.message }, 500);
	}

	return json({ data: { ok: true, id: body.id, storage_path: targetPath } }, 200);
}

async function purgePhotoById(request: Request, env: WorkerEnv): Promise<Response> {
	const body = await readJson<{ id?: string }>(request);
	if (!body.id) {
		return json({ error: 'id is required' }, 400);
	}

	const supabase = getClient(env);
	const { data: photo, error: findError } = await supabase
		.from('photos')
		.select('id, storage_path')
		.eq('id', body.id)
		.single();

	if (findError || !photo) {
		return json({ error: findError?.message || 'photo not found' }, 404);
	}

	const { error: removeError } = await supabase.storage.from(BUCKET).remove([photo.storage_path]);
	if (removeError) {
		return json({ error: removeError.message }, 500);
	}

	const { error: deleteError } = await supabase.from('photos').delete().eq('id', body.id);
	if (deleteError) {
		return json({ error: deleteError.message }, 500);
	}

	return json({ data: { ok: true, id: body.id } }, 200);
}

async function listGuestbook(env: WorkerEnv): Promise<Response> {
	const supabase = getClient(env);
	const { data, error } = await supabase
		.from('guestbook_entries')
		.select('*')
		.order('created_at', { ascending: false })
		.limit(500);

	if (error) {
		return json({ error: error.message }, 500);
	}

	return json({ data }, 200);
}

async function listPendingGuestbook(env: WorkerEnv): Promise<Response> {
	const supabase = getClient(env);
	const { data, error } = await supabase
		.from('guestbook_entries')
		.select('*')
		.eq('is_visible', false)
		.order('created_at', { ascending: false })
		.limit(500);

	if (error) {
		return json({ error: error.message }, 500);
	}

	return json({ data }, 200);
}

async function listApprovedGuestbook(env: WorkerEnv, url: URL): Promise<Response> {
	const supabase = getClient(env);
	const weddingSlug = (url.searchParams.get('wedding_slug') || '').trim();

	let query = supabase
		.from('guestbook_entries')
		.select('*')
		.eq('is_visible', true)
		.order('created_at', { ascending: false })
		.limit(500);

	if (weddingSlug) {
		query = query.eq('wedding_slug', weddingSlug);
	}

	const { data, error } = await query;
	if (error) {
		return json({ error: error.message }, 500);
	}

	return json({ data }, 200);
}

async function approveGuestbookById(request: Request, env: WorkerEnv): Promise<Response> {
	const body = await readJson<{ id?: string }>(request);
	if (!body.id) {
		return json({ error: 'id is required' }, 400);
	}

	const supabase = getClient(env);
	const { error } = await supabase
		.from('guestbook_entries')
		.update({ is_visible: true })
		.eq('id', body.id);

	if (error) {
		return json({ error: error.message }, 500);
	}

	return json({ data: { ok: true, id: body.id } }, 200);
}

async function deleteGuestbookById(request: Request, env: WorkerEnv): Promise<Response> {
	const body = await readJson<{ id?: string }>(request);
	if (!body.id) {
		return json({ error: 'id is required' }, 400);
	}

	const supabase = getClient(env);
	const { error } = await supabase
		.from('guestbook_entries')
		.delete()
		.eq('id', body.id);

	if (error) {
		return json({ error: error.message }, 500);
	}

	return json({ data: { ok: true, id: body.id } }, 200);
}

async function adminStats(env: WorkerEnv): Promise<Response> {
	const supabase = getClient(env);

	const [photosCount, guestbookCount] = await Promise.all([
		supabase.from('photos').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
		supabase.from('guestbook_entries').select('id', { count: 'exact', head: true }).eq('is_visible', false),
	]);

	if (photosCount.error || guestbookCount.error) {
		return json({
			error: photosCount.error?.message || guestbookCount.error?.message || 'Failed to fetch stats',
		}, 500);
	}

	return json({
		data: {
			pending_photos: photosCount.count || 0,
			pending_guestbook: guestbookCount.count || 0,
		},
	});
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

function toAbsoluteUrl(baseUrl: string, value: string): string {
	if (!value) {
		return value;
	}

	if (/^https?:\/\//i.test(value)) {
		return value;
	}

	const normalizedBase = baseUrl.replace(/\/+$/, '');
	const normalizedPath = value.startsWith('/') ? value : `/${value}`;
	return `${normalizedBase}${normalizedPath}`;
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
