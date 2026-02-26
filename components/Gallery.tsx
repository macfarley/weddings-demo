// Gallery component - 4x4 grid of photo thumbnails with expandable viewer
import { useState } from 'react';
import ImageViewer from './ImageViewer';

interface Photo {
  url: string;
  shortCaption: string;
  longCaption: string;
  uploaderName: string;
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
const mockPhotos = Array.from({ length: 16 }).map((_, i) => {
  const photo = stockPhotos[i % stockPhotos.length];
  return {
    ...photo,
    shortCaption: photo.shortCaption + ' #' + (i + 1),
  };
});

export default function Gallery() {
  const [photos] = useState<Photo[]>(mockPhotos);
  const [selectedImage, setSelectedImage] = useState<Photo | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const handlePhotoClick = (photo: Photo) => {
    setSelectedImage(photo);
    setIsViewerOpen(true);
  };

  return (
    <>
      <div className="gallery-grid">
        {photos.map((photo, i) => (
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
          </figure>
        ))}
      </div>

      <ImageViewer
        isOpen={isViewerOpen}
        image={selectedImage ? {
          src: selectedImage.url,
          uploaderName: selectedImage.uploaderName,
          shortCaption: selectedImage.shortCaption,
          longCaption: selectedImage.longCaption,
        } : null}
        onClose={() => setIsViewerOpen(false)}
      />
    </>
  );
}
