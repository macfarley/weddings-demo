import { useState } from 'react';
import { usePalette } from '../context/PaletteContext';
import FeatureToast from '../components/FeatureToast';
import '../styles/pages/photo-guestbook.css';

// Validate input before submission
const validatePhotoSubmission = (
  name: string,
  familyName: string,
  shortCaption: string,
  longCaption: string,
  file: File | null
) => {
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

  if (!shortCaption.trim()) {
    errors.push('Please enter a photo name/description (this will be your filename)');
  }
  if (shortCaption.length > 120) {
    errors.push('Photo name must be 120 characters or less');
  }

  if (longCaption.length > 500) {
    errors.push('Detailed caption must be 500 characters or less');
  }

  if (!file) {
    errors.push('Please select a photo to upload');
  } else {
    // Validate file type - JPEG, PNG, HEIC only
    const validTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
    const isValidType = validTypes.includes(file.type) ||
      file.name.toLowerCase().endsWith('.heic') ||
      file.name.toLowerCase().endsWith('.heif');
    
    if (!isValidType) {
      errors.push('Please upload a valid image file (JPEG, PNG, or HEIC)');
    }

    // Validate file size (max 3MB per requirements)
    const maxSize = 3 * 1024 * 1024; // 3MB
    if (file.size > maxSize) {
      errors.push('Photo must be smaller than 3MB. Consider using a phone camera quality or reducing dimensions.');
    }
  }

  // Check for suspicious patterns in text fields
  const suspiciousPatterns = [/<script/i, /javascript:/i, /on\w+\s*=/i, /<iframe/i, /<embed/i];
  const allText = `${name}${familyName}${shortCaption}${longCaption}`;
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(allText)) {
      errors.push('Invalid characters detected. Please remove any special code.');
    }
  }

  return errors;
};

export default function SendYourPhotos() {
  const { palette } = usePalette();
  const [name, setName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [shortCaption, setShortCaption] = useState('');
  const [longCaption, setLongCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUnavailableToast, setShowUnavailableToast] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    // Validate on client side
    const validationErrors = validatePhotoSubmission(name, familyName, shortCaption, longCaption, file);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      setShowUnavailableToast(true);
    } catch (error) {
      console.error('Submission error:', error);
      setErrors(['Failed to submit photo. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setName('');
    setFamilyName('');
    setShortCaption('');
    setLongCaption('');
    setFile(null);
    setFileName('');
    setErrors([]);
    setShowUnavailableToast(false);
  };

  return (
    <div className="photo-guestbook-container">
      {/* Header */}
      <div
        className="photo-guestbook-header"
        style={{
          color: palette.text,
        }}
      >
        <h1 style={{ color: palette.primary }}>
          Share Your Photos
        </h1>
        <p>Upload a photo and leave a message in our guestbook</p>
      </div>

      {/* Submission Form */}
      <div
        className="photo-guestbook-form-section"
        style={{
          backgroundColor: palette.secondary,
          borderColor: palette.primary,
        }}
      >
        <h2 className="photo-guestbook-form-title" style={{ color: palette.primary }}>
          Photo + Message Submission
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

        <form onSubmit={handleSubmit} className="photo-guestbook-form">
          {/* Photo Upload Section */}
          <div>
            <div className="form-group">
              <label className="form-label" style={{ color: palette.text }}>
                Your Photo <span className="form-label-required">*</span>
                <span className="form-label-hint">(JPEG, PNG, HEIC, HEIF • Max 3MB)</span>
              </label>
              <input
                type="file"
                className="form-file"
                accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif"
                onChange={handleFileChange}
                disabled={isSubmitting}
                style={{
                  color: palette.text,
                  borderColor: palette.primary,
                }}
              />
              {fileName && (
                <div className="form-file-hint" style={{ color: palette.text }}>
                  Selected: {fileName}
                </div>
              )}
            </div>

            <div className="form-info">
              <span style={{ color: palette.primary, fontWeight: 600 }}>ℹ️</span> Your photo will be reviewed before appearing in our gallery. We remove duplicates and keep only the best memories!
            </div>
          </div>

          {/* Divider */}
          <div className="form-section-divider">
            <div className="form-section-divider-text" style={{ color: palette.primary }}>
              Your Information
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
              placeholder="Last name or nickname"
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

          {/* Divider */}
          <div className="form-section-divider">
            <div className="form-section-divider-text" style={{ color: palette.primary }}>
              Photo Details
            </div>
          </div>

          {/* Short Caption / Filename Field */}
          <div className="form-group">
            <label className="form-label" style={{ color: palette.text }}>
              Photo Name/Description <span className="form-label-required">*</span>
              <span className="form-label-hint">(120 characters max • Used as filename when downloading)</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={shortCaption}
              onChange={(e) => setShortCaption(e.target.value.slice(0, 120))}
              placeholder="e.g., 'Cutting the Cake', 'First Dance', 'Bride & Groom'"
              maxLength={120}
              disabled={isSubmitting}
              style={{
                color: palette.text,
                borderColor: palette.primary,
              }}
            />
            <div className="form-char-count" style={{ color: palette.text }}>
              {shortCaption.length}/120
            </div>
          </div>

          {/* Long Caption Field */}
          <div className="form-group">
            <label className="form-label" style={{ color: palette.text }}>
              Detailed Caption
              <span className="form-label-hint">(500 characters max • Optional • Shows when viewing the photo)</span>
            </label>
            <textarea
              className="form-textarea"
              value={longCaption}
              onChange={(e) => setLongCaption(e.target.value.slice(0, 500))}
              placeholder="Share more details about this photo if you'd like (optional)..."
              maxLength={500}
              disabled={isSubmitting}
              style={{
                color: palette.text,
                borderColor: palette.primary,
              }}
            />
            <div
              className={`form-char-count ${longCaption.length > 450 ? 'warning' : ''} ${
                longCaption.length > 490 ? 'critical' : ''
              }`}
              style={{ color: palette.text }}
            >
              {longCaption.length}/500
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
              {isSubmitting ? 'Uploading...' : 'Upload Photo & Message (Coming Soon)'}
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

        {/* Privacy note */}
        <p
          style={{
            marginTop: '1rem',
            fontSize: '0.8rem',
            opacity: 0.7,
            color: palette.text,
          }}
        >
          Upload processing is not live yet. This button currently shows a placeholder notice and does not save files.
        </p>
      </div>

      <FeatureToast
        isOpen={showUnavailableToast}
        onClose={() => setShowUnavailableToast(false)}
        message="This feature is not yet implemented. Photo uploads are coming soon."
      />
    </div>
  );
}
