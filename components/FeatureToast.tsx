// FeatureToast — lightweight auto-dismissing notification banner.
//
// Used site-wide for transient feedback: upload success, guestbook submission,
// and graceful degradation when a worker endpoint is unavailable.
// Auto-closes after 3.2 seconds. Accessible via role="status" + aria-live="polite".
import { useEffect } from 'react';

interface FeatureToastProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
}

export default function FeatureToast({ isOpen, message, onClose }: FeatureToastProps) {
  // Auto-dismiss after 3.2s. Timer resets if the message changes while open.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onClose();
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        right: '1rem',
        bottom: '1rem',
        zIndex: 1000,
        backgroundColor: '#2f3a45',
        color: '#f7f4ed',
        borderRadius: '0.5rem',
        padding: '0.75rem 1rem',
        maxWidth: '24rem',
        boxShadow: '0 10px 20px rgba(0, 0, 0, 0.2)',
        fontSize: '0.95rem',
        lineHeight: 1.4,
      }}
    >
      {message}
    </div>
  );
}
