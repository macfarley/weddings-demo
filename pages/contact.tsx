import { usePalette } from '../context/PaletteContext';

export default function Contact() {
  const { palette } = usePalette();

  return (
    <main style={{ width: '100%', padding: '2rem', textAlign: 'center' }}>
      <h2 style={{ color: palette.primary, fontSize: '2rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
        Contact
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
          Questions? Reach out to John &amp; Crystal directly.
        </p>
        <p style={{ fontSize: '1rem', lineHeight: 1.7 }}>
          <strong>John May</strong> — <a href="tel:+1" style={{ color: palette.primary }}>Contact info TBD</a>
        </p>
        <p style={{ fontSize: '1rem', lineHeight: 1.7, marginTop: '0.5rem' }}>
          <strong>Crystal Collins</strong> — <a href="tel:+1" style={{ color: palette.primary }}>Contact info TBD</a>
        </p>
        <p style={{ marginTop: '1.5rem', fontSize: '0.95rem', opacity: 0.8 }}>
          Friday, May 9, 2026 &mdash; Junior Fair Building, Wapakoneta, Ohio
        </p>
      </div>
    </main>
  );
}
