import { validatePhotoSubmission } from '../../pages/sendyourphotos';

// Helper: build a File-like object with configurable properties
function makeFile(name: string, type: string, sizeBytes: number): File {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type });
  return new File([blob], name, { type });
}

const VALID_FILE = makeFile('photo.jpg', 'image/jpeg', 1024);

describe('validatePhotoSubmission — required fields', () => {
  it('returns no errors for a fully valid submission', () => {
    const errors = validatePhotoSubmission('Jane', 'Doe', 'First dance', '', VALID_FILE);
    expect(errors).toHaveLength(0);
  });

  it('requires a name', () => {
    const errors = validatePhotoSubmission('', 'Doe', 'First dance', '', VALID_FILE);
    expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/please enter your name/i)]));
  });

  it('requires a family name or nickname', () => {
    const errors = validatePhotoSubmission('Jane', '', 'First dance', '', VALID_FILE);
    expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/family name/i)]));
  });

  it('requires a short caption (photo description)', () => {
    const errors = validatePhotoSubmission('Jane', 'Doe', '', '', VALID_FILE);
    expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/photo name/i)]));
  });

  it('requires a file', () => {
    const errors = validatePhotoSubmission('Jane', 'Doe', 'First dance', '', null);
    expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/select a photo/i)]));
  });
});

describe('validatePhotoSubmission — length limits', () => {
  it('rejects name longer than 50 characters', () => {
    const longName = 'A'.repeat(51);
    const errors = validatePhotoSubmission(longName, 'Doe', 'First dance', '', VALID_FILE);
    expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/50 characters/i)]));
  });

  it('rejects family name longer than 50 characters', () => {
    const longFamily = 'B'.repeat(51);
    const errors = validatePhotoSubmission('Jane', longFamily, 'First dance', '', VALID_FILE);
    expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/50 characters/i)]));
  });

  it('rejects short caption longer than 120 characters', () => {
    const longCaption = 'C'.repeat(121);
    const errors = validatePhotoSubmission('Jane', 'Doe', longCaption, '', VALID_FILE);
    expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/120 characters/i)]));
  });

  it('rejects long caption longer than 500 characters', () => {
    const longDetail = 'D'.repeat(501);
    const errors = validatePhotoSubmission('Jane', 'Doe', 'First dance', longDetail, VALID_FILE);
    expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/500 characters/i)]));
  });
});

describe('validatePhotoSubmission — file type', () => {
  it('accepts image/jpeg', () => {
    const file = makeFile('photo.jpg', 'image/jpeg', 1024);
    const errors = validatePhotoSubmission('Jane', 'Doe', 'First dance', '', file);
    expect(errors).toHaveLength(0);
  });

  it('accepts image/png', () => {
    const file = makeFile('photo.png', 'image/png', 1024);
    const errors = validatePhotoSubmission('Jane', 'Doe', 'First dance', '', file);
    expect(errors).toHaveLength(0);
  });

  it('accepts image/heic by MIME type', () => {
    const file = makeFile('photo.heic', 'image/heic', 1024);
    const errors = validatePhotoSubmission('Jane', 'Doe', 'First dance', '', file);
    expect(errors).toHaveLength(0);
  });

  it('accepts .heic file by extension even with empty MIME type', () => {
    const file = makeFile('photo.heic', '', 1024);
    const errors = validatePhotoSubmission('Jane', 'Doe', 'First dance', '', file);
    expect(errors).toHaveLength(0);
  });

  it('rejects unsupported types like image/gif', () => {
    const file = makeFile('photo.gif', 'image/gif', 1024);
    const errors = validatePhotoSubmission('Jane', 'Doe', 'First dance', '', file);
    expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/valid image file/i)]));
  });

  it('rejects PDF files', () => {
    const file = makeFile('doc.pdf', 'application/pdf', 1024);
    const errors = validatePhotoSubmission('Jane', 'Doe', 'First dance', '', file);
    expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/valid image file/i)]));
  });
});

describe('validatePhotoSubmission — file size', () => {
  it('accepts files under 5 MB', () => {
    const file = makeFile('photo.jpg', 'image/jpeg', 4 * 1024 * 1024); // 4 MB
    const errors = validatePhotoSubmission('Jane', 'Doe', 'First dance', '', file);
    expect(errors).toHaveLength(0);
  });

  it('rejects files over 5 MB', () => {
    const file = makeFile('photo.jpg', 'image/jpeg', 6 * 1024 * 1024); // 6 MB
    const errors = validatePhotoSubmission('Jane', 'Doe', 'First dance', '', file);
    expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/smaller than 5MB/i)]));
  });
});

describe('validatePhotoSubmission — XSS / injection guard', () => {
  it('rejects <script> tags in name field', () => {
    const errors = validatePhotoSubmission('<script>alert(1)</script>', 'Doe', 'Dance', '', VALID_FILE);
    expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/invalid characters/i)]));
  });

  it('rejects javascript: protocol in caption', () => {
    const errors = validatePhotoSubmission('Jane', 'Doe', 'javascript:void(0)', '', VALID_FILE);
    expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/invalid characters/i)]));
  });

  it('rejects inline event handlers like onclick=', () => {
    const errors = validatePhotoSubmission('Jane', 'Doe', 'click me', 'onclick=alert(1)', VALID_FILE);
    expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/invalid characters/i)]));
  });

  it('allows normal apostrophes and punctuation', () => {
    const errors = validatePhotoSubmission("Jane O'Brien", "Smith-Jones", "First dance!", '', VALID_FILE);
    expect(errors).toHaveLength(0);
  });
});
