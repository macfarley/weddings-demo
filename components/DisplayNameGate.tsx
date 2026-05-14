// components/DisplayNameGate.tsx — minimal post-event registration.
//
// First-visit modal that asks for a display name (e.g. "Smith Family",
// "Aunt Rose").  The name is stored in localStorage for 30 days so returning
// visitors skip the gate entirely.
//
// Usage:
//   <DisplayNameGate onReady={(name) => setDisplayName(name)} />
//
// The gate can be dismissed ("Continue as Guest") — callers receive the
// fallback name "Guest" and the page content is shown immediately.
import { useState } from 'react';
import { usePalette } from '../context/PaletteContext';
import { setDisplayName } from '../lib/contentCache';

interface Props {
  onReady: (displayName: string) => void;
}

export default function DisplayNameGate({ onReady }: Props) {
  const { palette } = usePalette();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = input.trim();
    if (!name) {
      setError('Please enter a name so we know who you are!');
      return;
    }
    if (name.length > 60) {
      setError('Name must be 60 characters or less.');
      return;
    }
    setDisplayName(name);
    onReady(name);
  }

  function handleSkip() {
    setDisplayName('Guest');
    onReady('Guest');
  }

  return (
    <div className="display-name-gate-overlay">
      <div
        className="display-name-gate-card"
        style={{
          borderColor: palette.primary,
          color: palette.text,
          backgroundColor: palette.background || '#fff',
        }}
      >
        <h2 style={{ color: palette.primary }}>Welcome Back!</h2>
        <p>
          The wedding is over, but the memories live on. Let us know who you are
          so we can welcome you properly.
        </p>
        <p className="display-name-gate-hint">
          Try something like <em>&ldquo;The Smith Family&rdquo;</em> or{' '}
          <em>&ldquo;Aunt Rose&rdquo;</em>.
        </p>

        <form onSubmit={handleSubmit} className="display-name-gate-form">
          <label
            className="display-name-gate-label"
            htmlFor="display-name-input"
            style={{ color: palette.text }}
          >
            What should we call you?
          </label>
          <input
            id="display-name-input"
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(''); }}
            maxLength={60}
            placeholder="e.g. The Johnson Family"
            className="display-name-gate-input"
            style={{ borderColor: palette.primary }}
            autoFocus
          />
          {error && (
            <p className="display-name-gate-error" role="alert">
              {error}
            </p>
          )}

          <div className="display-name-gate-actions">
            <button
              type="submit"
              className="display-name-gate-btn display-name-gate-btn--primary"
              style={{
                backgroundColor: palette.primary,
                borderColor: palette.primary,
                color: '#fff',
              }}
            >
              Let&rsquo;s Go
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="display-name-gate-btn display-name-gate-btn--ghost"
              style={{ color: palette.primary, borderColor: palette.primary }}
            >
              Continue as Guest
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .display-name-gate-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
        }
        .display-name-gate-card {
          max-width: 440px;
          width: 100%;
          padding: 2rem;
          border-radius: 12px;
          border: 2px solid;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
          text-align: center;
        }
        .display-name-gate-card h2 {
          margin: 0 0 0.75rem;
          font-size: 1.6rem;
        }
        .display-name-gate-card p {
          margin: 0 0 0.75rem;
          line-height: 1.5;
        }
        .display-name-gate-hint {
          font-size: 0.9rem;
          opacity: 0.8;
          margin-bottom: 1.25rem !important;
        }
        .display-name-gate-form {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          text-align: left;
        }
        .display-name-gate-label {
          font-weight: 600;
          font-size: 0.95rem;
        }
        .display-name-gate-input {
          padding: 0.6rem 0.85rem;
          border: 2px solid;
          border-radius: 8px;
          font-size: 1rem;
          outline: none;
          width: 100%;
          box-sizing: border-box;
        }
        .display-name-gate-input:focus {
          box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.12);
        }
        .display-name-gate-error {
          color: #c0392b;
          font-size: 0.88rem;
          margin: 0;
        }
        .display-name-gate-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
          margin-top: 0.5rem;
          flex-wrap: wrap;
        }
        .display-name-gate-btn {
          padding: 0.55rem 1.2rem;
          border-radius: 8px;
          border: 2px solid;
          font-size: 0.95rem;
          cursor: pointer;
          font-weight: 600;
          transition: opacity 0.15s;
        }
        .display-name-gate-btn:hover { opacity: 0.85; }
        .display-name-gate-btn--ghost { background: transparent; }
      `}</style>
    </div>
  );
}
