import { usePalette } from '../context/PaletteContext';
import Gallery from '../components/Gallery';
import '../styles/pages/gallery.css';

export default function GalleryPage() {
  const { palette } = usePalette();
  
  return (
    <div className="page-container">
      <main className="main-content">
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
          <Gallery />
        </section>
      </main>
    </div>
  );
}
