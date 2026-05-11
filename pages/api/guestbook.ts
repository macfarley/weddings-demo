// POST /api/guestbook — server-side guestbook submission handler.
//
// Runs on Vercel serverless (Node.js runtime). Guests never write directly to
// the database — all input is validated and sanitized here before the Neon insert.
//
// New entries are inserted with is_visible=true (auto-approved for this deployment).
// Previously they defaulted to false and required admin approval; that was relaxed
// after the wedding since moderation demand dropped post-ceremony.
//
// The Cloudflare Worker's GET /guestbook route reads only is_visible=true entries
// for the public guestbook page.
import type { NextApiRequest, NextApiResponse } from 'next';
import { neon } from '@neondatabase/serverless';

function getDb() {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('Missing DATABASE_URL');
	return neon(url);
}

function getWeddingSlug(): string {
	return process.env.NEXT_PUBLIC_WEDDING_SLUG?.trim() || 'default';
}

// Basic XSS / injection patterns to reject at the API boundary.
const SUSPICIOUS = [/<script/i, /javascript:/i, /on\w+\s*=/i, /<iframe/i, /<embed/i];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	const { name, familyName, message, side } = req.body as Record<string, unknown>;

	if (typeof name !== 'string' || !name.trim()) {
		return res.status(400).json({ error: 'name is required' });
	}
	if (typeof familyName !== 'string' || !familyName.trim()) {
		return res.status(400).json({ error: 'familyName is required' });
	}
	if (typeof message !== 'string' || !message.trim()) {
		return res.status(400).json({ error: 'message is required' });
	}
	if (name.length > 50 || familyName.length > 50 || message.length > 500) {
		return res.status(400).json({ error: 'Input too long' });
	}

	const allText = `${name}${familyName}${message}`;
	if (SUSPICIOUS.some((p) => p.test(allText))) {
		return res.status(400).json({ error: 'Invalid characters detected' });
	}

	const safeSide = side === 'groom' ? 'groom' : 'bride';

	try {
		const sql = getDb();
		await sql`
			INSERT INTO guestbook_entries (wedding_slug, display_name, family_name, message, side, is_visible)
			VALUES (${getWeddingSlug()}, ${name.trim()}, ${familyName.trim()}, ${message.trim()}, ${safeSide}, true)
		`;
		return res.status(200).json({ ok: true });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Database error';
		return res.status(500).json({ error: msg });
	}
}
