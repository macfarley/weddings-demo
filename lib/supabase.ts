import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

function getPublicEnv() {
	return {
		url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '',
		anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '',
	};
}

export function isSupabaseConfigured(): boolean {
	const { url, anonKey } = getPublicEnv();
	return Boolean(url && anonKey);
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
	if (browserClient) {
		return browserClient;
	}

	const { url, anonKey } = getPublicEnv();
	if (!url || !anonKey) {
		return null;
	}

	browserClient = createClient(url, anonKey, {
		auth: { persistSession: false },
	});

	return browserClient;
}

export function getWeddingSlug(): string {
	const slug = process.env.NEXT_PUBLIC_WEDDING_SLUG?.trim();
	return slug || 'default';
}
