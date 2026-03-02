import { createClient } from '@supabase/supabase-js';

type WorkerEnv = {
	SUPABASE_URL: string;
	SUPABASE_SERVICE_ROLE_KEY: string;
	ADMIN_ORIGIN?: string;
};

const BUCKET = 'wedding-photos';
const UPLOADS_PREFIX = 'uploads';
const APPROVED_PREFIX = 'approved';

export default {
	async fetch(request, env): Promise<Response> {
		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: corsHeaders(request, env) });
		}

		const url = new URL(request.url);
		const path = url.pathname.replace(/\/$/, '') || '/';

		try {
			switch (`${request.method} ${path}`) {
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

	return json({ data }, 200);
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

	return json({ data }, 200);
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
