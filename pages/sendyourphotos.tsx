import { useState, useRef } from 'react';
import { usePalette } from '../context/PaletteContext';
import FeatureToast from '../components/FeatureToast';
import { getSupabaseBrowserClient, getWeddingSlug, isSupabaseConfigured } from '../lib/supabase';

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

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      errors.push('Photo must be smaller than 5MB. Consider using a phone camera quality or reducing dimensions.');
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
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showSizeHelp, setShowSizeHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const toLabelSlug = (value: string) => {
    const cleaned = value
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/ /g, '-')
      .slice(0, 60);

    if (cleaned) {
      return cleaned;
    }

    return `photo-${crypto.randomUUID().slice(0, 8)}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (selectedFile.size > maxSize) {
      setToastMessage('This photo is too large. Max size is 5MB.');
      setShowToast(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setFile(null);
      setFileName('');
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    // Honeypot check — bots fill hidden fields, humans don't.
    // Silently succeed to avoid tipping off bots that they were blocked.
    if (honeypot) {
      setToastMessage('Photo uploaded successfully! It will appear after moderation approval.');
      setShowToast(true);
      handleReset();
      return;
    }

    // Validate on client side
    const validationErrors = validatePhotoSubmission(name, familyName, shortCaption, longCaption, file);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      if (!isSupabaseConfigured()) {
        setToastMessage('Photo uploads are not available yet. We\'re finishing setup — check back soon!');
        setShowToast(true);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      if (!supabase || !file) {
        setToastMessage('Upload service is temporarily unavailable. Please try again later.');
        setShowToast(true);
        return;
      }

      const weddingSlug = getWeddingSlug();
      const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : 'jpg';
      const labelRaw = shortCaption.trim();
      const labelSlug = toLabelSlug(labelRaw);
      const uniqueId = crypto.randomUUID();
      const finalExt = ext || 'jpg';
      const storagePath = `uploads/${uniqueId}.${finalExt}`;

      const { error: uploadError } = await supabase.storage
        .from('wedding-photos')
        .upload(storagePath, file, {
          upsert: false,
          contentType: file.type || undefined,
        });

      if (uploadError) {
        setErrors([uploadError.message || 'Photo upload failed. Please try again.']);
        return;
      }

      const uploaderName = `${name.trim()} ${familyName.trim()}`.trim();
      const { error: metadataError } = await supabase.from('photos').insert({
        wedding_slug: weddingSlug,
        storage_path: storagePath,
        label_raw: labelRaw,
        label_slug: labelSlug,
        original_filename: file.name,
        uploader_name: uploaderName,
        caption: longCaption.trim() || labelRaw,
        status: 'pending',
        is_visible: false,
      });

      if (metadataError) {
        await supabase.storage.from('wedding-photos').remove([storagePath]);
        setErrors([metadataError.message || 'Upload metadata failed to save. Please try again.']);
        return;
      }

      setToastMessage('Photo uploaded successfully! It will appear after moderation approval.');
      setShowToast(true);
      handleReset();
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
    setHoneypot('');
    setErrors([]);
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
        className="photo-guestbook-form-section form-section--go"
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
          {/* Honeypot — hidden from real users, traps bots that auto-fill forms */}
          <div aria-hidden="true" style={{ display: 'none' }}>
            <label htmlFor="wedding_url">Website</label>
            <input
              id="wedding_url"
              name="wedding_url"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>
          {/* Photo Upload Section */}
          <div>
            <div className="form-group">
              <label className="form-label" style={{ color: palette.text }}>
                Your Photo <span className="form-label-required">*</span>
                <span className="form-label-hint">(JPEG, PNG, HEIC, HEIF • Max 5MB)</span>
              </label>
              {/* Hidden native-camera input (capture=environment opens rear camera) */}
              <input
                ref={cameraInputRef}
                id="cameraInput"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                disabled={isSubmitting}
                style={{ display: 'none' }}
                aria-hidden="true"
              />
              <input
                ref={fileInputRef}
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
              <button
                type="button"
                className="camera-btn"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isSubmitting}
                aria-label="Take a photo with your camera"
                style={{ borderColor: palette.primary, color: palette.primary }}
              >
                📸 Take a Photo
              </button>
              <p className="form-file-hint" style={{ color: palette.text, margin: '0.4rem 0 0' }}>
                We can only accept photos up to 5MB.{' '}
                <button
                  type="button"
                  onClick={() => setShowSizeHelp(v => !v)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: palette.primary,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 'inherit',
                    textDecoration: 'underline',
                    minHeight: 0,
                  }}
                  aria-expanded={showSizeHelp}
                  aria-controls="size-help-panel"
                >
                  {showSizeHelp ? 'Hide help' : 'Tap here for help'}
                </button>
              </p>
              {showSizeHelp && (
                <div
                  id="size-help-panel"
                  role="region"
                  aria-label="Photo size help"
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.375rem',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    border: `1px solid ${palette.primary}`,
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                    color: palette.text,
                  }}
                >
                  <strong style={{ color: palette.primary }}>📱 iPhone:</strong> Open the Photos app → tap your photo → swipe up to see file info. If it&rsquo;s over 5MB, try sharing it to yourself via Messages first — that compresses it automatically.
                  <br /><br />
                  <strong style={{ color: palette.primary }}>🤖 Android:</strong> Open Gallery → long-press the photo → tap Details or ℹ️. If it&rsquo;s too large, use Google Photos → &ldquo;Edit&rdquo; → export at a lower quality, or reduce the resolution in Settings under Camera quality.
                </div>
              )}
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
              {isSubmitting ? 'Uploading...' : 'Upload Photo & Message'}
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
