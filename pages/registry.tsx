import { usePalette } from '../context/PaletteContext';

export default function Registry() {
  const { palette } = usePalette();

  return (
    <main style={{ width: '100%', padding: '2rem', textAlign: 'center' }}>
      <h2 style={{ color: palette.primary, fontSize: '2rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
        Registry &amp; Gifts
      </h2>
      <div style={{
        maxWidth: '40rem',
        margin: '0 auto',
        padding: '2rem',
        borderRadius: '0.75rem',
        border: `2px solid ${palette.primary}`,
        backgroundColor: palette.secondary,
        color: palette.text,
      }}>
        <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
          Your presence at our wedding is the greatest gift of all.
        </p>
        <p style={{ fontSize: '1rem', lineHeight: 1.7, opacity: 0.85 }}>
          Registry links are being finalized. Check back soon for details.
        </p>
      </div>
    </main>
  );
}
