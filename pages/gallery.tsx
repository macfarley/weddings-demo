import { useEffect, useMemo, useState } from 'react';
import { usePalette } from '../context/PaletteContext';
import Gallery, { type Photo } from '../components/Gallery';
import { getWeddingSlug } from '../lib/supabase';

type WorkerPhoto = {
  id?: string | null;
  image_url?: string | null;
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

  const workerBaseUrl = useMemo(
    () => cleanBaseUrl(process.env.NEXT_PUBLIC_WORKER_BASE_URL || ''),
    [],
  );

  const sortedPhotos = useMemo(() => {
    if (!photos) return photos;
    if (sortOrder === 'popular') {
      return [...photos].sort((a, b) => (b.loveCount ?? 0) - (a.loveCount ?? 0));
    }
    return photos;
  }, [photos, sortOrder]);

  useEffect(() => {
    if (!workerBaseUrl) {
      return;
    }

    let active = true;
    const load = async () => {
      try {
        const weddingSlug = getWeddingSlug();
        const response = await fetch(`${workerBaseUrl}/photos/approved?wedding_slug=${encodeURIComponent(weddingSlug)}`);
        const payload = (await response.json()) as WorkerResponse<WorkerPhoto[]>;
        if (!response.ok || payload.error) {
          throw new Error(payload.error || `Failed to load gallery (${response.status})`);
        }

        if (!active) {
          return;
        }

        const mapped = (payload.data || [])
          .map(toGalleryPhoto)
          .filter((item): item is Photo => Boolean(item));

        setPhotos(mapped);
      } catch (error) {
        console.error('Gallery load failed:', error);
        if (active) {
          setPhotos([]);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [workerBaseUrl]);
  
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
                onClick={() => setSortOrder('newest')}
                style={{ borderColor: palette.primary, color: sortOrder === 'newest' ? '#fff' : palette.primary, backgroundColor: sortOrder === 'newest' ? palette.primary : 'transparent' }}
              >
                Newest First
              </button>
              <button
                className={`gallery-sort-btn${sortOrder === 'popular' ? ' active' : ''}`}
                onClick={() => setSortOrder('popular')}
                style={{ borderColor: palette.primary, color: sortOrder === 'popular' ? '#fff' : palette.primary, backgroundColor: sortOrder === 'popular' ? palette.primary : 'transparent' }}
              >
                ❤️ Most Loved
              </button>
            </div>
          )}
          {photos && photos.length === 0 ? (
            <p style={{ color: palette.text }}>No approved photos yet. Check back soon.</p>
          ) : null}
          <Gallery photos={sortedPhotos} workerBaseUrl={workerBaseUrl} />
        </section>
      </div>
    </div>
  );
}
