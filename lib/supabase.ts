export function getWeddingSlug(): string {
	const slug = process.env.NEXT_PUBLIC_WEDDING_SLUG?.trim();
	return slug || 'default';
}
