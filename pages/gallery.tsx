// pages/gallery.tsx — Public photo gallery.
//
// Photos are fetched from the Cloudflare Worker's GET /photos/approved endpoint,
// which filters to status='approved' AND is_visible=true for the active wedding slug.
// If the worker URL is not configured, the Gallery component renders emoji placeholders.
//
// Sort modes: 'newest' (default) and 'popular' (by love_count DESC).
// Love reactions are sent via POST /photos/react and deduplicated server-side
// using a SHA-256 hash of (photo_id + IP address). localStorage tracks already-
// loved photo IDs on the client to persist the heart state across page reloads.
//
// Post-event caching:
//   - On mount: load from localStorage cache if < 2 min old.
//   - Poll GET /cache/status every 2 min (active tab only).
//   - Only fetch fresh data from the Worker if last_change timestamp advanced.
//   - Worker serves from KV, so Neon stays cold between scheduled refreshes.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePalette } from '../context/PaletteContext';
import Gallery, { type Photo } from '../components/Gallery';
import DisplayNameGate from '../components/DisplayNameGate';
import { getWeddingSlug } from '../lib/supabase';
import {
  getCached,
  setCached,
  shouldRefresh,
  getDisplayName,
  POLL_INTERVAL_MS,
} from '../lib/contentCache';

const GALLERY_CACHE_KEY = 'gallery:photos';

type WorkerPhoto = {
  id?: string | null;
  image_url?: string | null;
  view_url?: string | null;
  download_url?: string | null;
  original_filename?: string | null;
  uploader_name?: string | null;
  caption?: string | null;
  label_raw?: string | null;
  label_slug?: string | null;
  love_count?: number | null;
};

type WorkerResponse<T> = {
  data?: T;
  total?: number;
  page?: number;
  per_page?: number;
  error?: string;
};

function cleanBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function toGalleryPhoto(item: WorkerPhoto): Photo | null {
  const url = item.image_url?.trim();
  if (!url) {
    return null;
  }

  const shortCaption = item.label_raw?.trim()
    || item.label_slug?.trim()
    || item.original_filename?.trim()
    || 'Wedding Photo';

  return {
    url,
    viewUrl: item.view_url?.trim() || undefined,
    downloadUrl: item.download_url?.trim() || url,
    shortCaption,
    longCaption: item.caption?.trim() || '',
    uploaderName: item.uploader_name?.trim() || 'Guest',
    photoId: item.id?.trim() || undefined,
    loveCount: item.love_count ?? 0,
  };
}

export default function GalleryPage() {
  const { palette } = usePalette();
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'popular'>('newest');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  // Display name gate: null = checking, '' = not set (show gate), string = ready
  const [displayName, setDisplayName] = useState<string | null>(null);
  const PER_PAGE = 50;
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const workerBaseUrl = useMemo(
    () => cleanBaseUrl(process.env.NEXT_PUBLIC_WORKER_BASE_URL || ''),
    [],
  );

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  // Check localStorage for a stored display name on first render.
  useEffect(() => {
    setDisplayName(getDisplayName() ?? '');
  }, []);

  const fetchPhotos = useCallback(async (force = false) => {
    if (!workerBaseUrl) return;

    const cacheEntry = getCached<{ photos: WorkerPhoto[]; total: number }>(GALLERY_CACHE_KEY);

    // Use cached data immediately if available (prevents flash of empty state).
    if (cacheEntry?.data && !force) {
      const mapped = (cacheEntry.data.photos || [])
        .map(toGalleryPhoto)
        .filter((item): item is Photo => Boolean(item));
      setPhotos(mapped);
      setTotal(cacheEntry.data.total ?? 0);
    }

    // Decide whether a network fetch is warranted.
    const needsRefresh = force || await shouldRefresh(workerBaseUrl, cacheEntry);
    if (!needsRefresh) return;

    try {
      const weddingSlug = getWeddingSlug();
      const params = new URLSearchParams({
        wedding_slug: weddingSlug,
        sort: sortOrder,
        page: String(page),
        per_page: String(PER_PAGE),
      });
      const response = await fetch(`${workerBaseUrl}/photos/approved?${params}`);
      const payload = (await response.json()) as WorkerResponse<WorkerPhoto[]>;
      if (!response.ok || payload.error) {
        throw new Error(payload.error || `Failed to load gallery (${response.status})`);
      }

      const fresh = payload.data || [];
      const mapped = fresh.map(toGalleryPhoto).filter((item): item is Photo => Boolean(item));
      setPhotos(mapped);
      setTotal(payload.total ?? 0);

      // Cache the raw Worker data (not the mapped Photo objects) so
      // a page refresh can serve from localStorage without a network call.
      setCached(GALLERY_CACHE_KEY, { photos: fresh, total: payload.total ?? 0 }, null);
    } catch (error) {
      console.error('Gallery load failed:', error);
      if (!photos) setPhotos([]); // only blank out if we have nothing to show
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerBaseUrl, sortOrder, page]);

  // Initial load and re-fetch when sort/page changes.
  useEffect(() => {
    if (!displayName) return; // wait for display name gate
    fetchPhotos(true); // force refresh on explicit sort/page change
  }, [displayName, sortOrder, page, fetchPhotos]);

  // Active-tab polling: check every POLL_INTERVAL_MS, only if tab is visible.
  useEffect(() => {
    if (!displayName || !workerBaseUrl) return;

    function startPoll() {
      pollTimerRef.current = setInterval(() => {
        if (!document.hidden) fetchPhotos();
      }, POLL_INTERVAL_MS);
    }

    function handleVisibility() {
      if (!document.hidden) fetchPhotos(); // immediate check on tab focus
    }

    startPoll();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [displayName, workerBaseUrl, fetchPhotos]);

  // Show gate while we determine the display name (avoids flash).
  if (displayName === null) return null;

  // Show the display name gate if name is not yet set.
  if (displayName === '') {
    return <DisplayNameGate onReady={(name) => setDisplayName(name)} />;
  }
  
  return (
    <div className="gallery-page">
      <div className="gallery-card fade-out">
        <section
          className="section-full gallery-page-container"
          style={{
            color: palette.text,
            borderColor: palette.primary,
          }}
        >
          <h1 className="page-title gallery-page-title" style={{
            color: palette.primary,
            textShadow: `
              -1px -1px 0 ${palette.highlight},
              1px -1px 0 ${palette.highlight},
              -1px 1px 0 ${palette.highlight},
              1px 1px 0 ${palette.highlight},
              -2px 0 0 ${palette.highlight},
              2px 0 0 ${palette.highlight},
              0 -2px 0 ${palette.highlight},
              0 2px 0 ${palette.highlight}
            `
          }}>Gallery</h1>
          {photos && photos.length > 0 && (
            <div className="gallery-sort-controls">
              <button
                className={`gallery-sort-btn${sortOrder === 'newest' ? ' active' : ''}`}
                onClick={() => { setSortOrder('newest'); setPage(0); }}
                style={{ borderColor: palette.primary, color: sortOrder === 'newest' ? '#fff' : palette.primary, backgroundColor: sortOrder === 'newest' ? palette.primary : 'transparent' }}
              >
                Newest First
              </button>
              <button
                className={`gallery-sort-btn${sortOrder === 'popular' ? ' active' : ''}`}
                onClick={() => { setSortOrder('popular'); setPage(0); }}
                style={{ borderColor: palette.primary, color: sortOrder === 'popular' ? '#fff' : palette.primary, backgroundColor: sortOrder === 'popular' ? palette.primary : 'transparent' }}
              >
                ❤️ Most Loved
              </button>
            </div>
          )}
          {photos && photos.length === 0 && page === 0 ? (
            <p style={{ color: palette.text }}>No approved photos yet. Check back soon.</p>
          ) : null}
          <Gallery photos={photos} workerBaseUrl={workerBaseUrl} />
          {totalPages > 1 && (
            <div className="gallery-pagination">
              <button
                className="gallery-page-btn"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                style={{ borderColor: palette.primary, color: palette.primary }}
              >
                ← Prev
              </button>
              <span className="gallery-page-indicator" style={{ color: palette.text }}>
                Page {page + 1} of {totalPages}
              </span>
              <button
                className="gallery-page-btn"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                style={{ borderColor: palette.primary, color: palette.primary }}
              >
                Next →
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
