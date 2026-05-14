// lib/contentCache.ts — client-side localStorage cache layer.
//
// Purpose: reduce Neon compute by serving gallery and guestbook data from
// the browser's localStorage instead of fetching on every page load.
//
// Strategy:
//   1. On mount, load from localStorage if data is < STALE_MS old.
//   2. Poll GET /cache/status every POLL_MS while the tab is active.
//   3. If the server's last_change is newer than our stored fetchedAt, fetch
//      fresh data from the Worker (which serves from KV, not Neon).
//   4. Store fresh data + new fetchedAt in localStorage.
//
// The Worker's KV cache is the real source of truth.  localStorage just
// prevents redundant Worker requests when nothing has changed.

export const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
export const STALE_THRESHOLD_MS = 2 * 60 * 1000; // treat cache as stale after 2 min

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;  // Date.now() at time of fetch
  lastChange: string | null;  // last_change timestamp from Worker at time of fetch
}

// ---------------------------------------------------------------------------
// Core get / set helpers
// ---------------------------------------------------------------------------

export function getCached<T>(key: string): CacheEntry<T> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry<T>;
  } catch {
    return null;
  }
}

export function setCached<T>(key: string, data: T, lastChange: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: CacheEntry<T> = { data, fetchedAt: Date.now(), lastChange };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage may be full or unavailable (private browsing); fail silently.
  }
}

export function clearCached(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch { /* fail silently */ }
}

// ---------------------------------------------------------------------------
// Poll logic
// ---------------------------------------------------------------------------

// Returns true if a refresh is warranted (cache is absent, stale, or the
// server reports a newer last_change than we last saw).
export async function shouldRefresh(
  workerBaseUrl: string,
  cacheEntry: CacheEntry<unknown> | null,
): Promise<boolean> {
  if (!cacheEntry) return true;

  // Always refresh if our local copy is older than the stale threshold.
  if (Date.now() - cacheEntry.fetchedAt > STALE_THRESHOLD_MS) {
    try {
      const res = await fetch(`${workerBaseUrl}/cache/status`, { cache: 'no-store' });
      if (!res.ok) return true; // if status check fails, refresh to be safe
      const { last_change } = await res.json() as { last_change: string | null };

      // If the server has no recorded change yet, our cache is fine.
      if (!last_change) return false;

      // If the server changed after our last fetch, we need fresh data.
      return new Date(last_change).getTime() > cacheEntry.fetchedAt;
    } catch {
      return true; // network error — try refreshing
    }
  }

  return false; // cache is fresh enough
}

// ---------------------------------------------------------------------------
// Display name — minimal user registration for post-event mode
// ---------------------------------------------------------------------------

const DISPLAY_NAME_KEY = 'wedding_display_name';
const DISPLAY_NAME_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface StoredDisplayName {
  name: string;
  storedAt: number;
}

export function getDisplayName(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DISPLAY_NAME_KEY);
    if (!raw) return null;
    const { name, storedAt } = JSON.parse(raw) as StoredDisplayName;
    if (Date.now() - storedAt > DISPLAY_NAME_TTL_MS) {
      localStorage.removeItem(DISPLAY_NAME_KEY);
      return null;
    }
    return name || null;
  } catch {
    return null;
  }
}

export function setDisplayName(name: string): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: StoredDisplayName = { name: name.trim(), storedAt: Date.now() };
    localStorage.setItem(DISPLAY_NAME_KEY, JSON.stringify(entry));
  } catch { /* fail silently */ }
}
