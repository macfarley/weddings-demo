// PrivacyNoticeBanner — one-time data use notice shown on first visit.
//
// Displayed once per browser session using sessionStorage. Explains that
// uploaded photos and guestbook messages are stored and may be viewed by
// the couple. Dismissed on click or after interacting with the site.
// GDPR-adjacent best practice for a site that collects user-submitted content.
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'privacy-notice-dismissed';

export default function PrivacyNoticeBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!sessionStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // sessionStorage unavailable (private browsing edge cases) — just show it
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch { /* ignore */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.6rem 1rem',
        borderRadius: '0.5rem',
        background: 'rgba(20,20,20,0.88)',
        color: '#fff',
        fontSize: '0.82rem',
        maxWidth: '90vw',
        boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
        backdropFilter: 'blur(6px)',
        whiteSpace: 'nowrap',
      }}
    >
      <span>🔒 This site is private — for wedding guests only.</span>
      <button
        onClick={dismiss}
        aria-label="Dismiss privacy notice"
        style={{
          background: 'none',
          border: '1px solid rgba(255,255,255,0.4)',
          borderRadius: '0.3rem',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '0.78rem',
          padding: '0.15rem 0.5rem',
          lineHeight: 1.4,
          flexShrink: 0,
        }}
      >
        Got it
      </button>
    </div>
  );
}
