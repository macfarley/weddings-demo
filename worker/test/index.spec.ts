import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createClientMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
	createClient: (...args: unknown[]) => createClientMock(...args),
}));

import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

type MockPhoto = {
	id: string;
	storage_path: string;
	original_filename: string;
	uploader_name: string;
	caption: string;
	created_at: string;
	status: string;
	is_visible: boolean;
};

type MockGuestbook = {
	id: string;
	display_name: string;
	family_name: string;
	message: string;
	created_at: string;
	is_visible: boolean;
};

class QueryBuilder {
	private filters: Record<string, unknown> = {};
	private mode: 'select' | 'update' | 'delete' = 'select';
	private selectOptions: { head?: boolean } | undefined;

	constructor(
		private table: string,
		private state: {
			photos: MockPhoto[];
			guestbook: MockGuestbook[];
		},
	) {}

	select(_columns: string, options?: { head?: boolean }) {
		this.mode = 'select';
		this.selectOptions = options;
		return this;
	}

	update(_values: Record<string, unknown>) {
		this.mode = 'update';
		return this;
	}

	delete() {
		this.mode = 'delete';
		return this;
	}

	eq(column: string, value: unknown) {
		this.filters[column] = value;

		if (this.mode === 'update' || this.mode === 'delete') {
			return Promise.resolve({ data: [], error: null });
		}

		if (this.selectOptions?.head) {
			const rows = this.getRows();
			return Promise.resolve({ data: null, error: null, count: rows.length });
		}

		return this;
	}

	order(_column: string, _config: { ascending: boolean }) {
		return this;
	}

	limit(_count: number) {
		return Promise.resolve({ data: this.getRows(), error: null });
	}

	single() {
		const rows = this.getRows();
		if (!rows.length) {
			return Promise.resolve({ data: null, error: { message: 'not found' } });
		}

		return Promise.resolve({ data: rows[0], error: null });
	}

	private getRows() {
		const source = this.table === 'photos' ? this.state.photos : this.state.guestbook;
		return source.filter((row) => Object.entries(this.filters).every(([k, v]) => (row as Record<string, unknown>)[k] === v));
	}
}

function createMockSupabase() {
	const state = {
		photos: [
			{
				id: 'photo-1',
				storage_path: 'uploads/photo-1.jpg',
				original_filename: 'photo-1.jpg',
				uploader_name: 'Pat',
				caption: 'Dance floor',
				created_at: '2026-03-01T12:00:00.000Z',
				status: 'pending',
				is_visible: false,
			},
			{
				id: 'photo-2',
				storage_path: 'approved/photo-2.jpg',
				original_filename: 'photo-2.jpg',
				uploader_name: 'Casey',
				caption: 'Ceremony',
				created_at: '2026-03-02T12:00:00.000Z',
				status: 'approved',
				is_visible: true,
			},
		],
		guestbook: [
			{
				id: 'guest-1',
				display_name: 'Alex',
				family_name: 'M',
				message: 'Congrats!',
				created_at: '2026-03-01T12:00:00.000Z',
				is_visible: false,
			},
			{
				id: 'guest-2',
				display_name: 'Jamie',
				family_name: 'R',
				message: 'So happy for you both!',
				created_at: '2026-03-02T12:00:00.000Z',
				is_visible: true,
			},
		],
	};

	return {
		storage: {
			from: (_bucket: string) => ({
				list: vi.fn(async () => ({ data: [{ name: 'photo-1.jpg', created_at: '2026-03-01T12:00:00.000Z' }], error: null })),
				move: vi.fn(async () => ({ data: { ok: true }, error: null })),
				remove: vi.fn(async () => ({ data: { ok: true }, error: null })),
				createSignedUrl: vi.fn(async (path: string) => ({ data: { signedUrl: `/storage/v1/object/sign/wedding-photos/${path}?token=stub` }, error: null })),
			}),
		},
		rpc: vi.fn(async (_fn: string, _args: unknown) => ({ data: 5, error: null })),
		from: (table: string) => new QueryBuilder(table, state),
	};
}

function makeEnv() {
	return {
		SUPABASE_URL: 'https://example.supabase.co',
		SUPABASE_SERVICE_ROLE_KEY: 'service-role',
		ADMIN_PASSWORD: 'top-secret',
	};
}

function makeRequest(path: string, method = 'GET', body?: unknown, auth = true) {
	const headers: Record<string, string> = {};
	if (auth) {
		headers.Authorization = 'Bearer top-secret';
	}
	if (body !== undefined) {
		headers['Content-Type'] = 'application/json';
	}

	return new IncomingRequest(`https://example.com${path}`, {
		method,
		headers,
		body: body !== undefined ? JSON.stringify(body) : undefined,
	});
}

describe('Moderation worker routes', () => {
	beforeEach(() => {
		createClientMock.mockReset();
		createClientMock.mockImplementation(() => createMockSupabase());
	});

	it('returns health payload', async () => {
		const env = makeEnv();
		const request = makeRequest('/health', 'GET', undefined, false);
		const ctx = createExecutionContext();

		const response = await worker.fetch(request, env as never, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		const data = (await response.json()) as { ok: boolean; url: boolean; key: boolean };
		expect(data.ok).toBe(true);
		expect(data.url).toBe(true);
		expect(data.key).toBe(true);
	});

	it('returns 401 for protected route without auth', async () => {
		const env = makeEnv();
		const request = makeRequest('/photos/pending', 'GET', undefined, false);
		const ctx = createExecutionContext();

		const response = await worker.fetch(request, env as never, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(401);
	});

	it('allows local dev bypass without auth', async () => {
		const env = makeEnv();
		const request = new IncomingRequest('http://localhost:8787/photos/pending');
		const ctx = createExecutionContext();

		const response = await worker.fetch(request, env as never, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
	});

	it('handles GET /photos/pending', async () => {
		const response = await worker.fetch(makeRequest('/photos/pending'), makeEnv() as never, createExecutionContext());
		expect(response.status).toBe(200);
	});

	it('handles public GET /photos/approved without auth', async () => {
		const response = await worker.fetch(makeRequest('/photos/approved', 'GET', undefined, false), makeEnv() as never, createExecutionContext());
		expect(response.status).toBe(200);
	});

	it('handles POST /photos/approve', async () => {
		const response = await worker.fetch(makeRequest('/photos/approve', 'POST', { id: 'photo-1' }), makeEnv() as never, createExecutionContext());
		expect(response.status).toBe(200);
	});

	it('handles POST /photos/reject', async () => {
		const response = await worker.fetch(makeRequest('/photos/reject', 'POST', { id: 'photo-1' }), makeEnv() as never, createExecutionContext());
		expect(response.status).toBe(200);
	});

	it('handles GET /guestbook/pending', async () => {
		const response = await worker.fetch(makeRequest('/guestbook/pending'), makeEnv() as never, createExecutionContext());
		expect(response.status).toBe(200);
	});

	it('handles public GET /guestbook/approved without auth', async () => {
		const response = await worker.fetch(makeRequest('/guestbook/approved', 'GET', undefined, false), makeEnv() as never, createExecutionContext());
		expect(response.status).toBe(200);
	});

	it('handles POST /guestbook/approve', async () => {
		const response = await worker.fetch(makeRequest('/guestbook/approve', 'POST', { id: 'guest-1' }), makeEnv() as never, createExecutionContext());
		expect(response.status).toBe(200);
	});

	it('handles POST /guestbook/delete', async () => {
		const response = await worker.fetch(makeRequest('/guestbook/delete', 'POST', { id: 'guest-1' }), makeEnv() as never, createExecutionContext());
		expect(response.status).toBe(200);
	});

	it('handles GET /admin/stats', async () => {
		const response = await worker.fetch(makeRequest('/admin/stats'), makeEnv() as never, createExecutionContext());
		expect(response.status).toBe(200);
	});

	it('handles legacy GET /list-uploads', async () => {
		const response = await worker.fetch(makeRequest('/list-uploads'), makeEnv() as never, createExecutionContext());
		expect(response.status).toBe(200);
	});

	it('handles legacy POST /approve', async () => {
		const response = await worker.fetch(makeRequest('/approve', 'POST', { filename: 'photo-1.jpg' }), makeEnv() as never, createExecutionContext());
		expect(response.status).toBe(200);
	});

	it('handles legacy POST /delete', async () => {
		const response = await worker.fetch(makeRequest('/delete', 'POST', { filename: 'photo-1.jpg' }), makeEnv() as never, createExecutionContext());
		expect(response.status).toBe(200);
	});

	it('handles legacy GET /guestbook', async () => {
		const response = await worker.fetch(makeRequest('/guestbook'), makeEnv() as never, createExecutionContext());
		expect(response.status).toBe(200);
	});

	it('returns 404 for unknown routes', async () => {
		const response = await worker.fetch(makeRequest('/unknown'), makeEnv() as never, createExecutionContext());
		expect(response.status).toBe(404);
	});
});

// ---------------------------------------------------------------------------
// Auth role endpoint
// ---------------------------------------------------------------------------

describe('GET /auth/role', () => {
	beforeEach(() => {
		createClientMock.mockReset();
		createClientMock.mockImplementation(() => createMockSupabase());
	});

	it('returns "admin" role for request with ADMIN_PASSWORD', async () => {
		const env = makeEnv();
		const request = makeRequest('/auth/role', 'GET', undefined, true); // Bearer top-secret = ADMIN_PASSWORD
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env as never, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		const data = (await response.json()) as { role: string };
		expect(data.role).toBe('admin');
	});

	it('returns "client" role for request with CLIENT_PASSWORD', async () => {
		const env = { ...makeEnv(), CLIENT_PASSWORD: 'client-pass' };
		const headers = { Authorization: 'Bearer client-pass' };
		const request = new IncomingRequest('https://example.com/auth/role', { method: 'GET', headers });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env as never, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		const data = (await response.json()) as { role: string };
		expect(data.role).toBe('client');
	});
});

// ---------------------------------------------------------------------------
// Two-tier auth: purge is admin-only
// ---------------------------------------------------------------------------

describe('POST /photos/purge admin gate', () => {
	beforeEach(() => {
		createClientMock.mockReset();
		createClientMock.mockImplementation(() => createMockSupabase());
	});

	it('returns 401 when CLIENT_PASSWORD is used for purge', async () => {
		const env = { ...makeEnv(), CLIENT_PASSWORD: 'client-pass' };
		const headers: Record<string, string> = {
			Authorization: 'Bearer client-pass',
			'Content-Type': 'application/json',
		};
		const request = new IncomingRequest('https://example.com/photos/purge', {
			method: 'POST',
			headers,
			body: JSON.stringify({ id: 'photo-1' }),
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env as never, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(401);
	});

	it('accepts ADMIN_PASSWORD for purge', async () => {
		const response = await worker.fetch(
			makeRequest('/photos/purge', 'POST', { id: 'photo-1' }),
			makeEnv() as never,
			createExecutionContext(),
		);
		// 200 or 400/500 depending on mock state — not 401
		expect(response.status).not.toBe(401);
	});
});

// ---------------------------------------------------------------------------
// POST /photos/react
// ---------------------------------------------------------------------------

describe('POST /photos/react', () => {
	beforeEach(() => {
		createClientMock.mockReset();
		createClientMock.mockImplementation(() => createMockSupabase());
	});

	it('returns 400 for missing photo_id', async () => {
		const request = makeRequest('/photos/react', 'POST', {}, false);
		const response = await worker.fetch(request, makeEnv() as never, createExecutionContext());
		expect(response.status).toBe(400);
		const data = (await response.json()) as { error: string };
		expect(data.error).toMatch(/photo_id/i);
	});

	it('returns 400 for non-UUID photo_id', async () => {
		const request = makeRequest('/photos/react', 'POST', { photo_id: 'not-a-uuid' }, false);
		const response = await worker.fetch(request, makeEnv() as never, createExecutionContext());
		expect(response.status).toBe(400);
	});

	it('returns 200 with love_count for valid UUID photo_id', async () => {
		const validUuid = '9f400a11-907a-4f41-be4f-edb31324243f';
		const request = makeRequest('/photos/react', 'POST', { photo_id: validUuid }, false);
		const response = await worker.fetch(request, makeEnv() as never, createExecutionContext());
		expect(response.status).toBe(200);
		const data = (await response.json()) as { data: { love_count: number } };
		expect(typeof data.data.love_count).toBe('number');
	});

	it('is publicly accessible (no auth required)', async () => {
		const validUuid = '9f400a11-907a-4f41-be4f-edb31324243f';
		// No Authorization header
		const request = new IncomingRequest('https://example.com/photos/react', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ photo_id: validUuid }),
		});
		const response = await worker.fetch(request, makeEnv() as never, createExecutionContext());
		expect(response.status).not.toBe(401);
	});
});
