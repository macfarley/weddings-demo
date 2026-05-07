import Head from 'next/head';
import QRCode from 'react-qr-code';

const SITE_URL = 'https://www.john-and-crystal-may.wedding/sendyourphotos';
const DISPLAY_URL = 'www.John-and-Crystal-May.wedding';

export default function QRCodeFlyer() {
  return (
    <>
      <Head>
        <title>Share Your Photos – John & Crystal's Wedding</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className="no-print" style={{ textAlign: 'center', padding: '1rem 0 0.5rem' }}>
        <button
          onClick={() => window.print()}
          style={{
            background: '#b5294e',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            padding: '0.6rem 1.6rem',
            fontSize: '1rem',
            cursor: 'pointer',
            fontFamily: 'Georgia, serif',
          }}
        >
          🖨️ Save as PDF / Print
        </button>
      </div>

      <div className="flyer-page">
        {/* Top heading */}
        <div className="flyer-top">
          <div className="flyer-eyebrow">You're invited to be part of our story</div>
          <h1 className="flyer-title">Share Your Photos!</h1>
          <p className="flyer-subtitle">
            Snap a photo today and add it to our wedding gallery.<br />
            Every picture becomes part of our forever keepsake. 💕
          </p>
        </div>

        {/* QR code in heart border */}
        <div className="flyer-heart-wrapper" aria-label="QR code to send your photos">
          <div className="flyer-heart-border">
            <div className="flyer-qr-box">
              <QRCode
                value={SITE_URL}
                size={220}
                bgColor="#ffffff"
                fgColor="#1a1a1a"
                level="M"
              />
            </div>
          </div>
        </div>

        {/* URL call-to-action */}
        <div className="flyer-url-block">
          <div className="flyer-url-label">Scan the code, or visit us at:</div>
          <div className="flyer-url">{DISPLAY_URL}</div>
          <div className="flyer-url-sub">Tap <strong>"Send Your Photos"</strong> in the menu</div>
        </div>

        {/* Bottom instructions */}
        <div className="flyer-steps">
          <div className="flyer-step">📸 Take a photo</div>
          <div className="flyer-step-arrow">→</div>
          <div className="flyer-step">📲 Scan the QR code</div>
          <div className="flyer-step-arrow">→</div>
          <div className="flyer-step">💌 Leave a message</div>
        </div>

        {/* Footer */}
        <footer className="flyer-footer">
          Website powered by{' '}
          <span className="flyer-footer-brand">SitesbyMac.dev</span>
          <br />
          Contact{' '}
          <span className="flyer-footer-brand">Mac@sitesbymac.dev</span>{' '}
          with inquiries about your own custom site for any occasion or group
        </footer>
      </div>

      <style>{`
        /* ── Reset & page setup ─────────────────────────────────────── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html, body {
          background: #fff !important;
          font-family: 'Georgia', 'Times New Roman', serif;
        }

        /* ── Flyer layout ───────────────────────────────────────────── */
        .flyer-page {
          width: 8.5in;
          min-height: 11in;
          margin: 0 auto;
          padding: 0.7in 0.85in 0.5in;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.45in;
          background: #fff;
          color: #1a1a1a;
        }

        /* ── Top section ────────────────────────────────────────────── */
        .flyer-top {
          text-align: center;
          width: 100%;
        }

        .flyer-eyebrow {
          font-size: 0.95rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #888;
          margin-bottom: 0.3rem;
        }

        .flyer-title {
          font-size: 3.6rem;
          font-weight: normal;
          line-height: 1.1;
          color: #b5294e;
          font-family: 'Dancing Script', 'Georgia', cursive;
          letter-spacing: 0.02em;
          margin-bottom: 0.6rem;
        }

        .flyer-subtitle {
          font-size: 1.15rem;
          color: #444;
          line-height: 1.7;
        }

        /* ── Heart border wrapper ───────────────────────────────────── */
        .flyer-heart-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .flyer-heart-border {
          position: relative;
          padding: 2.2rem 2.5rem;
          border: 5px solid #b5294e;
          border-radius: 2rem;
          background: #fff8f9;
          box-shadow: 0 0 0 8px rgba(181, 41, 78, 0.08),
                      0 4px 24px rgba(181, 41, 78, 0.18);
        }

        /* Heart emoji top-center */
        .flyer-heart-border::before {
          content: '❤️';
          position: absolute;
          top: -1.05rem;
          left: 50%;
          transform: translateX(-50%);
          font-size: 1.8rem;
          line-height: 1;
          background: #fff;
          padding: 0 0.4rem;
        }

        /* Heart emoji bottom-center */
        .flyer-heart-border::after {
          content: '❤️';
          position: absolute;
          bottom: -1.05rem;
          left: 50%;
          transform: translateX(-50%);
          font-size: 1.8rem;
          line-height: 1;
          background: #fff;
          padding: 0 0.4rem;
        }

        .flyer-qr-box {
          display: block;
          line-height: 0;
        }

        /* ── URL block ──────────────────────────────────────────────── */
        .flyer-url-block {
          text-align: center;
        }

        .flyer-url-label {
          font-size: 0.95rem;
          color: #666;
          margin-bottom: 0.3rem;
          letter-spacing: 0.05em;
        }

        .flyer-url {
          font-size: 2.1rem;
          font-weight: bold;
          color: #b5294e;
          letter-spacing: 0.03em;
          font-family: 'Georgia', serif;
        }

        .flyer-url-sub {
          font-size: 0.95rem;
          color: #555;
          margin-top: 0.3rem;
        }

        /* ── Steps row ──────────────────────────────────────────────── */
        .flyer-steps {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .flyer-step {
          font-size: 1.05rem;
          font-weight: bold;
          color: #2c2c2c;
          background: #fef2f5;
          border: 2px solid #e8b4c0;
          border-radius: 2rem;
          padding: 0.45rem 1rem;
        }

        .flyer-step-arrow {
          font-size: 1.4rem;
          color: #b5294e;
          font-weight: bold;
        }

        /* ── Footer ─────────────────────────────────────────────────── */
        .flyer-footer {
          margin-top: auto;
          text-align: center;
          font-size: 0.72rem;
          color: #999;
          line-height: 1.8;
          border-top: 1px solid #eee;
          padding-top: 0.4rem;
          width: 100%;
        }

        .flyer-footer-brand {
          color: #777;
          font-style: italic;
        }

        /* ── Print / PDF media ──────────────────────────────────────── */
        @media print {
          html, body {
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Hide the browser chrome / no-print elements */
          .no-print { display: none !important; }

          .flyer-page {
            width: 100%;
            min-height: auto;
            padding: 0.5in 0.65in 0.4in;
            page-break-inside: avoid;
          }

          /* Force single page */
          @page {
            size: letter portrait;
            margin: 0;
          }
        }

        /* ── Screen: centre on screen with a subtle paper shadow ───── */
        @media screen {
          body {
            background: #e8e8e8 !important;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 2rem 0;
          }

          .flyer-page {
            box-shadow: 0 8px 40px rgba(0,0,0,0.22);
          }
        }
      `}</style>
    </>
  );
}
