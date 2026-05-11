// pages/guestbook.tsx — Public guestbook page.
//
// Layout: racetrack road with two lanes (Bride's side / Groom's side).
// Car-shaped message cards populate each lane. The visual metaphor was chosen
// to match John & Crystal's NASCAR/motorsports theme.
//
// Entries are loaded from the Worker's GET /guestbook/approved?wedding_slug=...
// endpoint (public, no auth). If the worker URL is missing, MOCK_ENTRIES are
// shown so the page is never completely empty during dev/demo.
//
// Submissions go via POST /api/guestbook (Next.js API route, server-side),
// not directly to the Worker. This keeps DATABASE_URL server-only.
import { useEffect, useMemo, useState } from 'react';
import { usePalette } from '../context/PaletteContext';
import FeatureToast from '../components/FeatureToast';
import { getWeddingSlug } from '../lib/supabase';

interface GuestbookEntry {
  id: string;
  name: string;
  familyName: string;
  message: string;
  side: 'bride' | 'groom';
  createdAt: string;
}

type WorkerGuestbookEntry = {
  id: string;
  display_name?: string | null;
  family_name?: string | null;
  message: string;
  created_at: string;
  side?: 'bride' | 'groom' | null;
};

type WorkerResponse<T> = {
  data?: T;
  error?: string;
};

function cleanBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function toGuestbookEntry(entry: WorkerGuestbookEntry): GuestbookEntry {
  return {
    id: entry.id,
    name: entry.display_name?.trim() || 'Guest',
    familyName: entry.family_name?.trim() || '',
    message: entry.message,
    side: entry.side === 'groom' ? 'groom' : 'bride',
    createdAt: entry.created_at,
  };
}

// Mock data for demonstration
const MOCK_ENTRIES: GuestbookEntry[] = [
  {
    id: '1',
    name: 'Margaret',
    familyName: 'Collins (Mom)',
    message: "Best of luck, love. You're going to make such beautiful babies! I'm so proud of you both.",
    side: 'groom',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    name: 'Hildy',
    familyName: 'Meyer (Great Aunt)',
    message: "You're going to make such beautiful babies! Congratulations to the happy couple! 💕",
    side: 'bride',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    name: 'Robert',
    familyName: 'Jackson (Uncle)',
    message: 'Welcome to the family! Excited to have you join us. Let the adventures begin!',
    side: 'bride',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    name: 'Patricia',
    familyName: 'Williams (Aunt)',
    message: 'What a beautiful day! You two are perfect together. Wishing you a lifetime of happiness and laughter.',
    side: 'bride',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    name: 'James',
    familyName: 'Hayes (Best Friend)',
    message: 'The groom finally found someone crazy enough to marry him! All jokes aside, you two are amazing together. Cheers!',
    side: 'groom',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '6',
    name: 'David',
    familyName: 'Collins (Dad)',
    message: "I'm so happy to see you smile like this. Thank you for making my child so happy. Welcome, officially, to the family.",
    side: 'groom',
    createdAt: new Date().toISOString(),
  },
];

// Validate input before submission
export const validateGuestbookEntry = (name: string, familyName: string, message: string) => {
  const errors: string[] = [];

  if (!name.trim()) {
    errors.push('Please enter your name');
  }
  if (name.length > 50) {
    errors.push('Name must be 50 characters or less');
  }

  if (!familyName.trim()) {
    errors.push('Please enter a family name or nickname');
  }
  if (familyName.length > 50) {
    errors.push('Family name must be 50 characters or less');
  }

  if (!message.trim()) {
    errors.push('Please enter a message');
  }
  if (message.length > 500) {
    errors.push('Message must be 500 characters or less');
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [/<script/i, /javascript:/i, /on\w+\s*=/i, /<iframe/i, /<embed/i];
  const allText = `${name}${familyName}${message}`;
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(allText)) {
      errors.push('Invalid characters detected. Please remove any special code.');
    }
  }

  return errors;
};

export default function GuestbookPublic() {
  const { palette } = usePalette();
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [name, setName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [message, setMessage] = useState('');
  const [selectedSide, setSelectedSide] = useState<'bride' | 'groom'>('bride');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const workerBaseUrl = useMemo(
    () => cleanBaseUrl(process.env.NEXT_PUBLIC_WORKER_BASE_URL || ''),
    [],
  );

  useEffect(() => {
    if (!workerBaseUrl) {
      setEntries(MOCK_ENTRIES);
      return;
    }

    let active = true;
    const loadEntries = async () => {
      try {
        const weddingSlug = getWeddingSlug();
        const response = await fetch(`${workerBaseUrl}/guestbook/approved?wedding_slug=${encodeURIComponent(weddingSlug)}`);
        const payload = (await response.json()) as WorkerResponse<WorkerGuestbookEntry[]>;
        if (!response.ok || payload.error) {
          throw new Error(payload.error || `Failed to load guestbook (${response.status})`);
        }

        if (!active) {
          return;
        }

        const mapped = (payload.data || []).map(toGuestbookEntry);
        setEntries(mapped);
      } catch (error) {
        console.error('Guestbook load failed:', error);
        if (active) {
          setEntries([]);
        }
      }
    };

    loadEntries();
    return () => {
      active = false;
    };
  }, [workerBaseUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    // Validate on client side
    const validationErrors = validateGuestbookEntry(name, familyName, message);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          familyName,
          message,
          side: selectedSide,
          weddingSlug: getWeddingSlug(),
        }),
      });
      const payload = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || payload.error) {
        setErrors([payload.error || 'Failed to submit message. Please try again.']);
        return;
      }

      setToastMessage('Thanks for signing our guestbook! Your message has been saved.');
      setShowToast(true);
      handleReset();
    } catch (error) {
      console.error('Submission error:', error);
      setErrors(['Failed to submit message. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setName('');
    setFamilyName('');
    setMessage('');
    setSelectedSide('bride');
    setErrors([]);
  };

  return (
    <div className="guestbook-public-container">
      {/* Header */}
      <div
        className="guestbook-header"
        style={{
          color: palette.text,
        }}
      >
        <h1 style={{ color: palette.primary }}>
          Thanks for Visiting Our Wedding!
        </h1>
        <p>Leave a message in our digital guestbook</p>
      </div>

      {/* Hero Card with Instructions */}
      <div
        className="guestbook-hero-card"
        style={{
          borderColor: palette.primary,
          color: palette.text,
        }}
      >
        <h2 style={{ color: palette.primary }}>
          Sign Our Digital Guestbook
        </h2>
        <p>
          Thank you for being part of our special day! We'd love to hear from you. Share your well wishes, favorite memories with us, advice for a happy marriage, or anything else you'd like to say.
        </p>
        <p>
          Your message will appear below and become part of our permanent wedding keepsake. We can't wait to read all your kind words!
        </p>
        <a href="#guestbook-form" className="hero-cta-link" style={{ color: palette.primary, borderColor: palette.primary }}>
          ↓ Sign the Guestbook
        </a>
      </div>

      {/* Racetrack Entries */}
      <div className="guestbook-entries-section">
        <h2 className="guestbook-entries-title" style={{ color: palette.primary }}>
          {entries.length > 0 ? `Guest Messages (${entries.length})` : 'Be the first to sign!'}
        </h2>
        <div className="racetrack-road">
          {/* Bride's Lane */}
          <div className="racetrack-lane">
            <div className="racetrack-lane-header">
              👰 Bride's Side ({entries.filter((e) => e.side === 'bride').length})
            </div>
            {entries
              .filter((e) => e.side === 'bride')
              .map((entry) => (
                <div key={entry.id} className="car-card bride-car">
                  <div className="car-card-inner">
                    <div className="car-card-name">{entry.name}</div>
                    <div className="car-card-family">{entry.familyName}</div>
                    <div className="car-card-message">{entry.message}</div>
                  </div>
                </div>
              ))}
          </div>

          {/* Groom's Lane */}
          <div className="racetrack-lane">
            <div className="racetrack-lane-header">
              🤵 Groom's Side ({entries.filter((e) => e.side === 'groom').length})
            </div>
            {entries
              .filter((e) => e.side === 'groom')
              .map((entry) => (
                <div key={entry.id} className="car-card groom-car">
                  <div className="car-card-inner">
                    <div className="car-card-name">{entry.name}</div>
                    <div className="car-card-family">{entry.familyName}</div>
                    <div className="car-card-message">{entry.message}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Submission Form */}
      <div
        id="guestbook-form"
        className="guestbook-form-section form-section--go"
        style={{
          backgroundColor: palette.secondary,
          borderColor: palette.primary,
        }}
      >
        <h2 className="guestbook-form-title" style={{ color: palette.primary }}>
          Add Your Message
        </h2>

        {errors.length > 0 && (
          <div className="form-error">
            <ul className="form-error-list">
              {errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="guestbook-form">
          {/* Side Selector */}
          <div className="form-group">
            <label className="form-label" style={{ color: palette.text }}>
              Whose side are you on? <span className="form-label-required">*</span>
            </label>
            <div className="form-side-selector">
              <button
                type="button"
                className={`form-side-btn ${selectedSide === 'bride' ? 'active' : ''}`}
                onClick={() => setSelectedSide('bride')}
                style={selectedSide === 'bride' ? {
                  backgroundColor: palette.primary,
                  color: palette.secondary,
                  borderColor: palette.primary,
                } : {
                  borderColor: palette.primary,
                  color: palette.text,
                }}
              >
                👰 Bride's Side
              </button>
              <button
                type="button"
                className={`form-side-btn ${selectedSide === 'groom' ? 'active' : ''}`}
                onClick={() => setSelectedSide('groom')}
                style={selectedSide === 'groom' ? {
                  backgroundColor: palette.primary,
                  color: palette.secondary,
                  borderColor: palette.primary,
                } : {
                  borderColor: palette.primary,
                  color: palette.text,
                }}
              >
                🤵 Groom's Side
              </button>
            </div>
          </div>

          {/* Name Field */}
          <div className="form-group">
            <label className="form-label" style={{ color: palette.text }}>
              Your Name <span className="form-label-required">*</span>
              <span className="form-label-hint">(50 characters max)</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 50))}
              placeholder="First name"
              maxLength={50}
              disabled={isSubmitting}
              style={{
                color: palette.text,
                borderColor: palette.primary,
              }}
            />
            <div className="form-char-count" style={{ color: palette.text }}>
              {name.length}/50
            </div>
          </div>

          {/* Family Name Field */}
          <div className="form-group">
            <label className="form-label" style={{ color: palette.text }}>
              Family Name or Nickname <span className="form-label-required">*</span>
              <span className="form-label-hint">(50 characters max)</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value.slice(0, 50))}
              placeholder="e.g. Uncle Tony, Nana Collins, Auntie Gina, Cousin Pookie"
              maxLength={50}
              disabled={isSubmitting}
              style={{
                color: palette.text,
                borderColor: palette.primary,
              }}
            />
            <div className="form-char-count" style={{ color: palette.text }}>
              {familyName.length}/50
            </div>
          </div>

          {/* Message Field */}
          <div className="form-group">
            <label className="form-label" style={{ color: palette.text }}>
              Your Message <span className="form-label-required">*</span>
              <span className="form-label-hint">(500 characters max)</span>
            </label>
            <textarea
              className="form-textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 500))}
              placeholder="Share your well wishes, advice, funny memory, or anything you'd like to say..."
              maxLength={500}
              disabled={isSubmitting}
              style={{
                color: palette.text,
                borderColor: palette.primary,
              }}
            />
            <div
              className={`form-char-count ${message.length > 450 ? 'warning' : ''} ${
                message.length > 490 ? 'critical' : ''
              }`}
              style={{ color: palette.text }}
            >
              {message.length}/500
            </div>
          </div>

          {/* Buttons */}
          <div className="form-button-group">
            <button
              type="submit"
              className="form-submit-btn"
              disabled={isSubmitting}
              style={{
                backgroundColor: palette.primary,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.85';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              {isSubmitting ? 'Sending...' : 'Sign Guestbook'}
            </button>
            <button
              type="button"
              className="form-reset-btn"
              onClick={handleReset}
              disabled={isSubmitting}
            >
              Clear
            </button>
          </div>
        </form>

      </div>

      <FeatureToast
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
      />
    </div>
  );
}
