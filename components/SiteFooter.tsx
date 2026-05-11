// SiteFooter — site-wide footer shown on all pages except /under-construction.
//
// Contains Mac McCoy's creator attribution, SitesbyMac.dev link, and contact email.
// Mounted globally in _app.tsx. Excluded from /under-construction and /qrcodeflyer
// via the HIDE_FOOTER_PATHS check in _app.tsx.
import { usePalette } from '../context/PaletteContext';

export default function SiteFooter() {
  const { palette } = usePalette();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <h3 className="site-footer-heading" style={{ color: palette.primary }}>
          About the Creator
        </h3>
        <p className="site-footer-text">
          Site by <strong style={{ color: palette.primary }}>Mac McCoy</strong> · custom wedding &amp; occasion sites
        </p>
        <div className="site-footer-links">
          <a
            href="https://www.sitesbymac.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="site-footer-link"
            style={{ borderColor: palette.primary, color: palette.primary }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = palette.primary;
              (e.currentTarget as HTMLAnchorElement).style.color = palette.secondary;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLAnchorElement).style.color = palette.primary;
            }}
          >
            SitesbyMac.dev
          </a>
          <a
            href="mailto:Mac@sitesbymac.dev"
            className="site-footer-link"
            style={{ borderColor: palette.primary, color: palette.primary }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = palette.primary;
              (e.currentTarget as HTMLAnchorElement).style.color = palette.secondary;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLAnchorElement).style.color = palette.primary;
            }}
          >
            Mac@sitesbymac.dev
          </a>
        </div>
      </div>
    </footer>
  );
}
