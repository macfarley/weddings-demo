import { useState } from 'react';
import FeatureToast from '../components/FeatureToast';
import '../styles/pages/upload.css';

// Photo Upload + Guestbook stub
export default function Upload() {
  const [showUnavailableToast, setShowUnavailableToast] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowUnavailableToast(true);
  };

  return (
    <main className="upload-container">
      <h2 className="upload-title">Upload Your Photo</h2>
      <form className="upload-form" onSubmit={handleSubmit}>
        <input className="upload-input" placeholder="Your Name (optional)" />
        <input className="upload-input" placeholder="Family Name / Nickname (optional)" />
        <textarea className="upload-textarea" placeholder="Caption" />
        <input className="upload-input" type="file" />
        <button type="submit" className="upload-button">Upload (Coming Soon)</button>
      </form>

      <FeatureToast
        isOpen={showUnavailableToast}
        onClose={() => setShowUnavailableToast(false)}
        message="This feature is not yet implemented. Uploads are coming soon."
      />
    </main>
  );
}
