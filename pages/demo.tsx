import Gallery from '../components/Gallery';
import { usePalette } from '../context/PaletteContext';

export default function Demo() {
  const { palette } = usePalette();

  return (
    <main style={{ color: palette.text, padding: '1rem' }}>
      <h2 style={{ color: palette.primary }}>Demo Page</h2>
      <Gallery />
    </main>
  );
}
