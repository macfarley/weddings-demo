// Gallery component stub (wired to local mock data for now)
import { useState } from 'react';

const mockPhotos = [
  {
    url: '/photos/pexels-mahmutyilmaz-34793912.jpg',
    caption: 'A beautiful moment',
    name: 'Sample Guest',
  },
  {
    url: '/photos/pexels-tahaasamett-28531241.jpg',
    caption: 'Celebration!',
    name: 'Another Guest',
  },
];

export default function Gallery() {
  const [photos] = useState(mockPhotos);
  return (
    <div className="grid grid-cols-2 gap-4">
      {photos.map((photo, i) => (
        <figure key={i}>
          <img src={photo.url} alt={photo.caption} className="rounded shadow" />
          <figcaption>{photo.caption} <br /><small>{photo.name}</small></figcaption>
        </figure>
      ))}
    </div>
  );
}
