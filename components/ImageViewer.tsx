import { useEffect } from 'react';

interface ImageViewerProps {
  isOpen: boolean;
  image: {
    src: string;
    downloadUrl?: string;
    uploaderName: string;
    shortCaption: string;
    longCaption?: string;
  } | null;
  onClose: () => void;
}

export default function ImageViewer({ isOpen, image, onClose }: ImageViewerProps) {
  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !image) return null;

  const downloadHref = image.downloadUrl || image.src;

  return (
    <div className="image-viewer-overlay" onClick={onClose}>
      <div className="image-viewer-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          className="image-viewer-close"
          onClick={onClose}
          aria-label="Close image viewer"
        >
          ✕
        </button>

        {/* Main Image */}
        <div className="image-viewer-content">
          <img src={image.src} alt={image.shortCaption} className="image-viewer-image" loading="lazy" />
        </div>

        {/* Image Info */}
        <div className="image-viewer-info">
          <div className="image-viewer-uploader">
            <strong>📸 Uploaded by:</strong> {image.uploaderName}
          </div>

          {image.longCaption && (
            <div className="image-viewer-caption">
              <strong>Caption:</strong>
              <p>{image.longCaption}</p>
            </div>
          )}

          {!image.longCaption && image.shortCaption && (
            <div className="image-viewer-caption">
              <strong>Photo:</strong>
              <p>{image.shortCaption}</p>
            </div>
          )}

          {/* Download Button */}
          <a
            href={downloadHref}
            download
            className="image-viewer-download"
          >
            📥 Download Photo
          </a>
        </div>
      </div>
    </div>
  );
}
