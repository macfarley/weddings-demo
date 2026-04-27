// Gallery component - 4x4 grid of photo thumbnails with expandable viewer
import { useCallback, useState } from 'react';
import ImageViewer from './ImageViewer';

export interface Photo {
  url: string;
  viewUrl?: string;
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

// Emoji placeholders shown before real photos load from the database
const PLACEHOLDER_EMOJIS = ['👰', '🤵', '🎂', '💍', '❤️', '💒', '🥂', '🌸'];
const mockPhotos: Photo[] = PLACEHOLDER_EMOJIS.map((emoji, i) => ({
  url: `emoji:${emoji}`,
  shortCaption: 'Your photo here!',
  longCaption: 'Photos shared by guests will appear here after the wedding.',
  uploaderName: '',
  photoId: undefined,
  loveCount: 0,
}));

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
          const isEmoji = photo.url.startsWith('emoji:');
          const emojiChar = isEmoji ? photo.url.replace('emoji:', '') : null;
          return (
            <figure
              key={i}
              className={`gallery-thumbnail${isEmoji ? ' gallery-thumbnail--placeholder' : ''}`}
              onClick={() => !isEmoji && handlePhotoClick(photo)}
              role={isEmoji ? 'presentation' : 'button'}
              tabIndex={isEmoji ? -1 : 0}
              onKeyDown={(e) => {
                if (!isEmoji && (e.key === 'Enter' || e.key === ' ')) {
                  handlePhotoClick(photo);
                }
              }}
            >
              {isEmoji ? (
                <div className="gallery-emoji-placeholder" aria-hidden="true">
                  {emojiChar}
                </div>
              ) : (
                <img
                  src={photo.url}
                  alt={photo.shortCaption}
                  className="gallery-image"
                  loading="lazy"
                />
              )}
              <figcaption className="gallery-caption">
                {photo.shortCaption}
              </figcaption>
              {!isEmoji && <div className="gallery-thumbnail-overlay">Click to expand</div>}
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
          // Use the larger view URL in the modal; fall back to thumbnail if absent.
          src: selectedImage.viewUrl || selectedImage.url,
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
