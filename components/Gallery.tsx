// Gallery component - 4x4 grid of photo thumbnails with expandable viewer
import { useCallback, useState } from 'react';
import ImageViewer from './ImageViewer';

export interface Photo {
  url: string;
  downloadUrl?: string;
  shortCaption: string;
  longCaption: string;
  uploaderName: string;
  photoId?: string;
  loveCount?: number;
}

interface GalleryProps {
  photos?: Photo[] | null;
  workerBaseUrl?: string;
}

const stockPhotos = [
  {
    url: '/photos/pexels-mahmutyilmaz-34793912.jpg',
    shortCaption: 'Elegant Reception',
    longCaption: 'Beautiful moment at the reception venue with stunning decorations.',
    uploaderName: 'Sarah Collins',
  },
  {
    url: '/photos/pexels-tahaasamett-28531241.jpg',
    shortCaption: 'Dancing & Joy',
    longCaption: 'Everyone celebrating on the dance floor!',
    uploaderName: 'Uncle Robert',
  },
  {
    url: '/photos/pexels-eugenia-remark-5767088-15283479.jpg',
    shortCaption: 'Ceremony Moments',
    longCaption: 'A tender moment during the ceremony.',
    uploaderName: 'Aunt Patricia',
  },
  {
    url: '/photos/pexels-rockhillmarketing-410398.jpg',
    shortCaption: 'Sunset Celebration',
    longCaption: 'Golden hour photography of the happy couple.',
    uploaderName: 'Great Aunt Hildy',
  },
];

// Create 16 photos by cycling through stock photos
const mockPhotos: Photo[] = Array.from({ length: 16 }).map((_, i) => {
  const photo = stockPhotos[i % stockPhotos.length];
  return {
    ...photo,
    shortCaption: photo.shortCaption + ' #' + (i + 1),
  };
});

export default function Gallery({ photos = null, workerBaseUrl = '' }: GalleryProps) {
  const resolvedPhotos = photos ?? mockPhotos;
  const [selectedImage, setSelectedImage] = useState<Photo | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Track which photo IDs the user has already loved (persisted in localStorage).
  const [lovedIds, setLovedIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem('photo-loves');
      return new Set(stored ? (JSON.parse(stored) as string[]) : []);
    } catch {
      return new Set();
    }
  });

  // Overrides for love counts updated by the current session (optimistic + server-confirmed).
  const [loveOverrides, setLoveOverrides] = useState<Record<string, number>>({});

  const getLoveCount = useCallback(
    (photo: Photo): number => {
      if (photo.photoId !== undefined && photo.photoId in loveOverrides) {
        return loveOverrides[photo.photoId];
      }
      return photo.loveCount ?? 0;
    },
    [loveOverrides],
  );

  const handleLove = useCallback(
    async (e: React.MouseEvent, photo: Photo) => {
      e.stopPropagation();
      const id = photo.photoId;
      if (!id || !workerBaseUrl || lovedIds.has(id)) return;

      const current = photo.photoId !== undefined && photo.photoId in loveOverrides
        ? loveOverrides[photo.photoId]
        : (photo.loveCount ?? 0);

      // Optimistic update
      setLovedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        try { localStorage.setItem('photo-loves', JSON.stringify([...next])); } catch { /* ignore */ }
        return next;
      });
      setLoveOverrides((prev) => ({ ...prev, [id]: current + 1 }));

      try {
        const res = await fetch(`${workerBaseUrl}/photos/react`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photo_id: id }),
        });
        if (res.ok) {
          const payload = await (res.json() as Promise<{ data?: { love_count?: number } }>);
          if (payload.data?.love_count !== undefined) {
            setLoveOverrides((prev) => ({ ...prev, [id]: payload.data!.love_count! }));
          }
        }
      } catch {
        // Rollback optimistic update on network failure
        setLovedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          try { localStorage.setItem('photo-loves', JSON.stringify([...next])); } catch { /* ignore */ }
          return next;
        });
        setLoveOverrides((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    },
    [workerBaseUrl, lovedIds, loveOverrides],
  );

  const handlePhotoClick = (photo: Photo) => {
    setSelectedImage(photo);
    setIsViewerOpen(true);
  };

  return (
    <>
      <div className="gallery-grid">
        {resolvedPhotos.map((photo, i) => {
          const loveCount = getLoveCount(photo);
          const isLoved = photo.photoId ? lovedIds.has(photo.photoId) : false;
          const showLoveBtn = Boolean(photo.photoId && workerBaseUrl);
          return (
            <figure
              key={i}
              className="gallery-thumbnail"
              onClick={() => handlePhotoClick(photo)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handlePhotoClick(photo);
                }
              }}
            >
              <img
                src={photo.url}
                alt={photo.shortCaption}
                className="gallery-image"
              />
              <figcaption className="gallery-caption">
                {photo.shortCaption}
              </figcaption>
              <div className="gallery-thumbnail-overlay">Click to expand</div>
              {showLoveBtn && (
                <button
                  className={`gallery-love-btn${isLoved ? ' loved' : ''}`}
                  onClick={(e) => { void handleLove(e, photo); }}
                  aria-label={isLoved ? 'You loved this photo' : 'Love this photo'}
                  disabled={isLoved}
                  type="button"
                >
                  <span aria-hidden="true">{isLoved ? '❤️' : '🤍'}</span>
                  {loveCount > 0 && <span className="gallery-love-count">{loveCount}</span>}
                </button>
              )}
            </figure>
          );
        })}
      </div>

      <ImageViewer
        isOpen={isViewerOpen}
        image={selectedImage ? {
          src: selectedImage.url,
          downloadUrl: selectedImage.downloadUrl,
          uploaderName: selectedImage.uploaderName,
          shortCaption: selectedImage.shortCaption,
          longCaption: selectedImage.longCaption,
        } : null}
        onClose={() => setIsViewerOpen(false)}
      />
    </>
  );
}
